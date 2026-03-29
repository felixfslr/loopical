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

    // Determine media type
    const isVideo = mediaTypeRaw === 'video' || !!video
    const mediaType: FeedbackMediaType = isVideo ? 'video' : 'audio'
    const mediaFile = isVideo ? video : audio

    if (!mediaFile || !loopicalId) {
      throw new ApiError('Media und Loopical-ID sind erforderlich.', 400, 'MISSING_PARAMS')
    }

    const admin = createAdminClient()

    // Convert File to ArrayBuffer for reliable binary upload
    const fileBuffer = await mediaFile.arrayBuffer()

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
