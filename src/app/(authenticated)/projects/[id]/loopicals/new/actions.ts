'use server'

import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { createLoopicalSchema, extractFieldErrors } from '@/lib/validations'
import type { FeedbackMode, MediaType } from '@/lib/types/database'

interface FeedbackPointInput {
  questionText: string
  questionAudioUrl: string | null
  questionTranscript: string | null
  markerX: number | null
  markerY: number | null
  markerMediaIndex: number
  markerPage?: number
  markerTimestampMs?: number | null
  orderIndex: number
  contextUrl: string | null
}

function detectMediaType(file: File): MediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type === 'text/markdown' || file.type === 'text/plain' || file.name.endsWith('.md')) return 'markdown'
  if (file.type.includes('officedocument')) return 'document'
  return 'image' // fallback
}

export async function createLoopicalWizard(formData: FormData) {
  const user = await requireUser()
  const admin = createAdminClient()

  const projectId = formData.get('projectId') as string
  const title = formData.get('title') as string
  const feedbackMode = (formData.get('feedbackMode') as FeedbackMode) || 'open'
  const welcomeMessage = (formData.get('welcomeMessage') as string) || null
  const mediaFiles = formData.getAll('media') as File[]
  const feedbackPointsJson = formData.get('feedbackPoints') as string | null
  const contextUrlRaw = (formData.get('contextUrl') as string)?.trim() || ''

  const parsed = createLoopicalSchema.safeParse({
    title,
    contextUrl: contextUrlRaw || undefined,
  })

  if (!parsed.success) {
    const fieldErrors = extractFieldErrors(parsed)
    return { error: fieldErrors.title || fieldErrors.contextUrl || 'Validierungsfehler', loopicalId: null }
  }

  const contextUrl = contextUrlRaw || null

  // Get max order_index for this project
  const { data: maxOrder } = await admin
    .from('loopicals')
    .select('order_index')
    .eq('project_id', projectId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const orderIndex = (maxOrder?.order_index ?? -1) + 1

  // Upload media files and get first one as legacy media_url
  const uploadedMedia: { url: string; type: MediaType; ocrText?: string }[] = []
  const mediaUrls = formData.getAll('mediaUrl') as string[]

  for (const file of mediaFiles) {
    if (!file || file.size === 0) continue

    const ext = file.name.split('.').pop()
    const path = `${projectId}/${crypto.randomUUID()}.${ext}`
    const mediaType = detectMediaType(file)

    // For markdown/text files, read content as OCR text
    let ocrText: string | undefined
    if (mediaType === 'markdown') {
      try {
        ocrText = await file.text()
      } catch {
        // ignore read errors
      }
    }

    const { error: uploadError } = await admin.storage
      .from('media')
      .upload(path, file)

    if (uploadError) {
      logger.error({ err: uploadError }, 'Wizard media upload failed')
      continue
    }

    const {
      data: { publicUrl },
    } = admin.storage.from('media').getPublicUrl(path)

    uploadedMedia.push({ url: publicUrl, type: mediaType, ocrText })
  }

  // Handle URL-type media (no file upload needed)
  for (const url of mediaUrls) {
    if (!url?.trim()) continue
    uploadedMedia.push({ url: url.trim(), type: 'url' })
  }

  // Create loopical (with first image/pdf as legacy media_url for backward compat)
  const firstImageOrPdf = uploadedMedia.find((m) => m.type === 'image' || m.type === 'pdf') ?? null
  const firstMedia = firstImageOrPdf

  const { data: loopical, error: loopicalError } = await admin
    .from('loopicals')
    .insert({
      project_id: projectId,
      title: title.trim(),
      media_url: firstMedia?.url ?? null,
      media_type: firstMedia?.type ?? null,
      created_by: user.id,
      order_index: orderIndex,
      feedback_mode: feedbackMode,
      welcome_message: welcomeMessage || null,
      context_url: contextUrl,
    })
    .select('id')
    .single()

  if (loopicalError || !loopical) {
    logger.error({ err: loopicalError }, 'Wizard create loopical failed')
    return { error: `Fehler: ${loopicalError?.message}`, loopicalId: null }
  }

  // Insert loopical_media rows
  if (uploadedMedia.length > 0) {
    const mediaRows = uploadedMedia.map((m, i) => ({
      loopical_id: loopical.id,
      media_url: m.url,
      media_type: m.type,
      order_index: i,
      ocr_text: m.ocrText ?? null,
    }))

    const { data: insertedMedia, error: mediaError } = await admin
      .from('loopical_media')
      .insert(mediaRows)
      .select('id, media_url, media_type, ocr_text')

    if (mediaError) {
      logger.error({ err: mediaError }, 'Insert loopical media failed')
    }

    // Trigger background OCR for PDFs without text
    if (insertedMedia) {
      for (const m of insertedMedia) {
        if (m.media_type === 'pdf' && !m.ocr_text) {
          // Fire-and-forget OCR via internal API
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          fetch(`${appUrl}/api/media/${m.id}/ocr`, { method: 'POST' }).catch(() => {})
        }
      }
    }
  }

  // Insert feedback points
  if (feedbackMode === 'guided' && feedbackPointsJson) {
    try {
      const points: FeedbackPointInput[] = JSON.parse(feedbackPointsJson)
      if (points.length > 0) {
        const pointRows = points.map((p) => ({
          loopical_id: loopical.id,
          question_text: p.questionText || null,
          question_audio_url: p.questionAudioUrl,
          question_transcript: p.questionTranscript,
          marker_x: p.markerX,
          marker_y: p.markerY,
          marker_media_index: p.markerMediaIndex,
          marker_page: p.markerPage ?? 0,
          marker_timestamp_ms: p.markerTimestampMs ?? null,
          order_index: p.orderIndex,
          context_url: p.contextUrl || null,
        }))

        const { error: pointsError } = await admin
          .from('feedback_points')
          .insert(pointRows)

        if (pointsError) {
          logger.error({ err: pointsError }, 'Insert feedback points failed')
        }
      }
    } catch (e) {
      logger.error({ err: e }, 'Parse feedback points JSON failed')
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null, loopicalId: loopical.id }
}
