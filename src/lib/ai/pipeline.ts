import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/admin'
import { transcribeAudio } from './transcribe'
import { analyzeTranscript } from './analyze'
import { analyzeWithVision } from './vision'
import { computePriorityScore } from './priority'
import { generateFollowUpQuestions } from './followup'
import type { Annotation, ProcessingStatus, Json } from '@/lib/types/database'

async function updateStatus(
  entryId: string,
  status: ProcessingStatus,
  extra?: Record<string, unknown>,
) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('feedback_entries')
    .update({ processing_status: status, ...extra })
    .eq('id', entryId)

  if (error) {
    logger.error({ err: error, entryId, status }, 'Failed to update feedback status')
  }
}

export async function processFeedbackEntry(entryId: string) {
  const admin = createAdminClient()

  // Fetch the entry and its loopical context
  const { data: entry } = await admin
    .from('feedback_entries')
    .select('audio_url, video_url, media_type, loopical_id, feedback_point_id, annotations, audio_duration_seconds')
    .eq('id', entryId)
    .single()

  if (!entry) {
    logger.error({ entryId }, 'Feedback entry not found')
    return
  }

  const [{ data: loopical }, { data: loopicalMedia }, { data: allLoopicalMedia }] = await Promise.all([
    admin
      .from('loopicals')
      .select('title, description')
      .eq('id', entry.loopical_id)
      .single(),
    admin
      .from('loopical_media')
      .select('ocr_text')
      .eq('loopical_id', entry.loopical_id)
      .not('ocr_text', 'is', null),
    admin
      .from('loopical_media')
      .select('media_url, media_type')
      .eq('loopical_id', entry.loopical_id)
      .order('order_index', { ascending: true }),
  ])

  // Combine OCR text from all media items as document context
  const documentContext = (loopicalMedia ?? [])
    .map((m) => m.ocr_text)
    .filter(Boolean)
    .join('\n\n---\n\n') || null

  // If linked to a feedback point, fetch the question for context
  let feedbackPointQuestion: string | null = null
  if (entry.feedback_point_id) {
    const { data: point } = await admin
      .from('feedback_points')
      .select('question_text, question_transcript')
      .eq('id', entry.feedback_point_id)
      .single()

    if (point) {
      feedbackPointQuestion = point.question_text || point.question_transcript || null
    }
  }

  // Determine the media URL to transcribe (video or audio)
  const transcriptionUrl = entry.media_type === 'video'
    ? entry.video_url
    : entry.audio_url

  if (!transcriptionUrl) {
    logger.error({ entryId }, 'No media URL for transcription')
    await updateStatus(entryId, 'error')
    return
  }

  try {
    // Step 1: Transcription
    await updateStatus(entryId, 'transcribing')

    const transcription = await transcribeAudio(transcriptionUrl)

    const { error: transcriptError } = await admin
      .from('feedback_entries')
      .update({
        transcript: transcription.transcript,
        word_timestamps: transcription.wordTimestamps as unknown as Json,
        language: transcription.languageCode,
      })
      .eq('id', entryId)

    if (transcriptError) {
      logger.error({ err: transcriptError, entryId }, 'Failed to save transcript')
      throw transcriptError
    }

    // Step 2: AI Analysis (skip if transcript is empty/noise)
    const cleanTranscript = transcription.transcript
      .replace(/\[.*?\]/g, '') // remove [background noise] etc.
      .trim()

    if (cleanTranscript.length < 5) {
      // Too short / only noise — skip AI, mark complete with note
      const { error: noSpeechError } = await admin
        .from('feedback_entries')
        .update({
          summary: 'Keine Sprache erkannt — die Aufnahme enthielt nur Hintergrundgeräusche.',
          action_items: [],
          sentiment: 'neutral',
          tags: ['general'],
          processing_status: 'complete',
          priority_score: 0,
        })
        .eq('id', entryId)

      if (noSpeechError) {
        logger.error({ err: noSpeechError, entryId }, 'Failed to update no-speech entry')
        throw noSpeechError
      }
    } else {
      await updateStatus(entryId, 'analyzing')

      const description = feedbackPointQuestion
        ? `${loopical?.description ?? ''}\n\nSpezifische Frage: ${feedbackPointQuestion}`.trim()
        : loopical?.description ?? null

      // Vision analysis: if loopical has image media and there's an API key, let AI see the image
      let visionContext: string | null = null
      const firstImage = (allLoopicalMedia ?? []).find((m) => m.media_type === 'image')
      if (firstImage?.media_url) {
        try {
          const visionResult = await analyzeWithVision({
            imageUrl: firstImage.media_url,
            transcript: cleanTranscript,
            title: loopical?.title ?? '',
            description,
            annotations: (entry.annotations as Annotation[] | null) ?? undefined,
          })
          if (visionResult) {
            visionContext = `Visuelle Analyse des Screenshots:\n${visionResult.visualContext}`
            if (visionResult.identifiedElements.length > 0) {
              visionContext += `\nErkannte UI-Elemente: ${visionResult.identifiedElements.join(', ')}`
            }
            if (visionResult.designObservations.length > 0) {
              visionContext += `\nDesign-Beobachtungen: ${visionResult.designObservations.join('; ')}`
            }
          }
        } catch (err) {
          // Vision is non-critical — continue without it
          logger.warn({ err, entryId }, 'Vision analysis failed, continuing without')
        }
      }

      const analysis = await analyzeTranscript(cleanTranscript, {
        title: loopical?.title ?? '',
        description,
        annotations: (entry.annotations as Annotation[] | null) ?? undefined,
        documentContext: [documentContext, visionContext].filter(Boolean).join('\n\n---\n\n') || null,
        loopicalId: entry.loopical_id,
        feedbackPointId: entry.feedback_point_id,
      })

      // Compute priority score for inbox triage
      const priorityScore = computePriorityScore(analysis, entry.audio_duration_seconds)

      // Step 3: Save results and mark complete
      const { error: analysisError } = await admin
        .from('feedback_entries')
        .update({
          summary: analysis.summary,
          action_items: analysis.actionItems as unknown as Json,
          sentiment: analysis.sentiment,
          tags: analysis.tags,
          processing_status: 'complete',
          priority_score: priorityScore,
          severity: analysis.severity ?? null,
          effort_estimate: analysis.effortEstimate ?? null,
          usability_category: analysis.usabilityCategory ?? null,
          ui_element_references: analysis.uiElementReferences ?? null,
        })
        .eq('id', entryId)

      if (analysisError) {
        logger.error({ err: analysisError, entryId }, 'Failed to save analysis results')
        throw analysisError
      }

      // Step 4: Write action items to dedicated table
      if (analysis.actionItems.length > 0) {
        const actionItemRows = analysis.actionItems.map((item, index) => ({
          feedback_entry_id: entryId,
          text: item.text,
          priority: item.priority || 'medium',
          status: item.done ? 'done' as const : 'open' as const,
          order_index: index,
        }))

        const { error: aiError } = await admin
          .from('action_items')
          .insert(actionItemRows)

        if (aiError) {
          logger.error({ err: aiError, entryId }, 'Failed to insert action items')
        }
      }

      // Step 5: Generate follow-up questions (non-blocking)
      try {
        const questions = await generateFollowUpQuestions(cleanTranscript, {
          title: loopical?.title ?? '',
          description: loopical?.description ?? null,
        })

        if (questions.length > 0) {
          await admin
            .from('feedback_entries')
            .update({
              follow_up_questions: questions.map((q) => ({
                question: q,
                answered: false,
              })),
            })
            .eq('id', entryId)
        }
      } catch (err) {
        // Follow-up generation is non-critical — log and continue
        logger.warn({ err, entryId }, 'Follow-up question generation failed')
      }
    }
  } catch (err) {
    logger.error({ err, entryId }, 'AI pipeline error')
    await updateStatus(entryId, 'error')
    throw err // Re-throw so callers (retry endpoint) can see the error
  }
}
