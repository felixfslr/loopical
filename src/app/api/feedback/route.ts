import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { after } from 'next/server'
import { processFeedbackEntry } from '@/lib/ai/pipeline'
import { feedbackLimiter } from '@/lib/rate-limit'
import { ApiError, errorResponse } from '@/lib/api-error'
import { logger } from '@/lib/logger'
import type { Json, FeedbackMediaType } from '@/lib/types/database'

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { success } = feedbackLimiter.check(ip)
    if (!success) {
      throw new ApiError('Zu viele Anfragen. Bitte warte einen Moment.', 429, 'RATE_LIMITED')
    }

    const formData = await request.formData()
    const audio = formData.get('audio') as File | null
    const video = formData.get('video') as File | null
    const loopicalId = formData.get('loopicalId') as string
    const authorId = formData.get('authorId') as string | null
    const guestName = formData.get('guestName') as string | null
    const feedbackPointId = formData.get('feedbackPointId') as string | null
    const parentEntryId = formData.get('parentEntryId') as string | null
    const annotationsRaw = formData.get('annotations') as string | null
    const mediaTypeRaw = formData.get('mediaType') as string | null
    const durationSeconds = parseInt(
      formData.get('durationSeconds') as string,
      10,
    )

    // Parse guest annotations (pins + strokes)
    let annotations: Json[] = []
    if (annotationsRaw) {
      try {
        const parsed = JSON.parse(annotationsRaw)
        if (Array.isArray(parsed)) annotations = parsed as Json[]
      } catch {
        // Ignore malformed annotations, proceed without them
      }
    }

    // Text-only feedback (no audio/video)
    const textFeedback = formData.get('text') as string | null

    // Reaction-only feedback (emoji)
    const reaction = formData.get('reaction') as string | null

    // Determine media type
    const isVideo = mediaTypeRaw === 'video' || !!video
    const mediaType: FeedbackMediaType = isVideo ? 'video' : 'audio'
    const mediaFile = isVideo ? video : audio

    if (!mediaFile && !textFeedback?.trim() && !reaction && !loopicalId) {
      throw new ApiError('Media, Text, Reaktion oder Loopical-ID sind erforderlich.', 400, 'MISSING_PARAMS')
    }

    if (!loopicalId) {
      throw new ApiError('Loopical-ID ist erforderlich.', 400, 'MISSING_PARAMS')
    }

    const admin = createAdminClient()

    // Handle reaction-only feedback (emoji, no AI processing needed)
    if (reaction && !mediaFile && !textFeedback?.trim()) {
      const sentimentMap: Record<string, string> = {
        '👍': 'positive',
        '👎': 'critical',
        '😐': 'neutral',
        '🐛': 'critical',
        '💡': 'neutral',
      }
      const tagMap: Record<string, string[]> = {
        '🐛': ['bug'],
        '💡': ['feature_request'],
      }

      const { data: entry, error: insertError } = await admin
        .from('feedback_entries')
        .insert({
          loopical_id: loopicalId,
          audio_url: null,
          video_url: null,
          media_type: 'text' as FeedbackMediaType,
          audio_duration_seconds: null,
          transcript: reaction,
          summary: `Reaktion: ${reaction}`,
          sentiment: sentimentMap[reaction] || 'neutral',
          tags: tagMap[reaction] || ['general'],
          processing_status: 'complete',
          priority_score: 0,
          author_id: authorId || null,
          guest_name: guestName || null,
          feedback_point_id: feedbackPointId || null,
        })
        .select('id')
        .single()

      if (insertError) {
        logger.error({ err: insertError }, 'Reaction feedback insert failed')
        throw new ApiError('Reaktion konnte nicht gespeichert werden.', 500, 'INSERT_FAILED')
      }

      return NextResponse.json({ id: entry.id })
    }

    // Handle text-only feedback (skip transcription, go straight to analysis)
    if (textFeedback?.trim() && !mediaFile) {
      const { data: entry, error: insertError } = await admin
        .from('feedback_entries')
        .insert({
          loopical_id: loopicalId,
          audio_url: null,
          video_url: null,
          media_type: 'text' as FeedbackMediaType,
          audio_duration_seconds: null,
          transcript: textFeedback.trim(),
          processing_status: 'analyzing',
          author_id: authorId || null,
          guest_name: guestName || null,
          feedback_point_id: feedbackPointId || null,
          parent_entry_id: parentEntryId || null,
          annotations: annotations.length > 0 ? annotations : null,
        })
        .select('id')
        .single()

      if (insertError) {
        logger.error({ err: insertError }, 'Text feedback insert failed')
        throw new ApiError('Feedback konnte nicht erstellt werden.', 500, 'INSERT_FAILED')
      }

      // Trigger AI analysis (skip transcription)
      after(async () => {
        try {
          await processFeedbackEntry(entry.id)
        } catch (err) {
          logger.error({ err }, 'AI processing error for text feedback')
        }
      })

      return NextResponse.json({ id: entry.id })
    }

    // Convert File to ArrayBuffer for reliable binary upload
    const fileBuffer = await mediaFile!.arrayBuffer()

    let audioUrl: string | null = null
    let videoUrl: string | null = null

    if (isVideo) {
      // Upload video to video bucket
      const videoPath = `${loopicalId}/${crypto.randomUUID()}.webm`
      const { error: uploadError } = await admin.storage
        .from('video')
        .upload(videoPath, fileBuffer, {
          contentType: 'video/webm',
          duplex: 'half',
        } as any)

      if (uploadError) {
        logger.error({ err: uploadError }, 'Video upload failed')
        throw new ApiError('Video konnte nicht hochgeladen werden.', 500, 'UPLOAD_FAILED')
      }

      const { data: { publicUrl } } = admin.storage.from('video').getPublicUrl(videoPath)
      videoUrl = publicUrl
    } else {
      // Upload audio to audio bucket
      const audioPath = `${loopicalId}/${crypto.randomUUID()}.webm`
      const { error: uploadError } = await admin.storage
        .from('audio')
        .upload(audioPath, fileBuffer, {
          contentType: 'audio/webm',
          duplex: 'half',
        } as any)

      if (uploadError) {
        logger.error({ err: uploadError }, 'Audio upload failed')
        throw new ApiError('Audio konnte nicht hochgeladen werden.', 500, 'UPLOAD_FAILED')
      }

      const { data: { publicUrl } } = admin.storage.from('audio').getPublicUrl(audioPath)
      audioUrl = publicUrl
    }

    // Create feedback entry
    const { data: entry, error: insertError } = await admin
      .from('feedback_entries')
      .insert({
        loopical_id: loopicalId,
        audio_url: audioUrl,
        video_url: videoUrl,
        media_type: mediaType,
        audio_duration_seconds: durationSeconds || null,
        processing_status: 'pending',
        author_id: authorId || null,
        guest_name: guestName || null,
        feedback_point_id: feedbackPointId || null,
        parent_entry_id: parentEntryId || null,
        annotations: annotations.length > 0 ? annotations : null,
      })
      .select('id')
      .single()

    if (insertError) {
      logger.error({ err: insertError }, 'Feedback insert failed')
      throw new ApiError('Feedback konnte nicht erstellt werden.', 500, 'INSERT_FAILED')
    }

    // Trigger AI processing after response is sent
    after(async () => {
      try {
        await processFeedbackEntry(entry.id)
      } catch (err) {
        logger.error({ err }, 'AI processing error')
      }
    })

    return NextResponse.json({ id: entry.id })
  } catch (err) {
    return errorResponse(err)
  }
}
