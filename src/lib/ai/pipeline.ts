import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/admin'
import { transcribeAudio } from './transcribe'
import { analyzeTranscript } from './analyze'
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
    .select('audio_url, loopical_id, feedback_point_id, annotations')
    .eq('id', entryId)
    .single()

  if (!entry) {
    logger.error({ entryId }, 'Feedback entry not found')
    return
  }

  const { data: loopical } = await admin
    .from('loopicals')
    .select('title, description')
    .eq('id', entry.loopical_id)
    .single()

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

  try {
    // Step 1: Transcription
    await updateStatus(entryId, 'transcribing')

    const transcription = await transcribeAudio(entry.audio_url)

    await admin
      .from('feedback_entries')
      .update({
        transcript: transcription.transcript,
        word_timestamps: transcription.wordTimestamps as unknown as Json,
        language: transcription.languageCode,
      })
      .eq('id', entryId)

    // Step 2: AI Analysis (skip if transcript is empty/noise)
    const cleanTranscript = transcription.transcript
      .replace(/\[.*?\]/g, '') // remove [background noise] etc.
      .trim()

    if (cleanTranscript.length < 5) {
      // Too short / only noise — skip AI, mark complete with note
      await admin
        .from('feedback_entries')
        .update({
          summary: 'Keine Sprache erkannt — die Aufnahme enthielt nur Hintergrundgeräusche.',
          action_items: [],
          sentiment: 'neutral',
          tags: ['general'],
          processing_status: 'complete',
        })
        .eq('id', entryId)
    } else {
      await updateStatus(entryId, 'analyzing')

      const description = feedbackPointQuestion
        ? `${loopical?.description ?? ''}\n\nSpezifische Frage: ${feedbackPointQuestion}`.trim()
        : loopical?.description ?? null

      const analysis = await analyzeTranscript(cleanTranscript, {
        title: loopical?.title ?? '',
        description,
        annotations: (entry.annotations as Annotation[] | null) ?? undefined,
      })

      // Step 3: Save results and mark complete
      await admin
        .from('feedback_entries')
        .update({
          summary: analysis.summary,
          action_items: analysis.actionItems as unknown as Json,
          sentiment: analysis.sentiment,
          tags: analysis.tags,
          processing_status: 'complete',
        })
        .eq('id', entryId)
    }
  } catch (err) {
    logger.error({ err, entryId }, 'AI pipeline error')
    await updateStatus(entryId, 'error')
    throw err // Re-throw so callers (retry endpoint) can see the error
  }
}
