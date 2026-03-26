'use server'

import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { FeedbackMode } from '@/lib/types/database'

interface FeedbackPointInput {
  questionText: string
  questionAudioUrl: string | null
  questionTranscript: string | null
  markerX: number | null
  markerY: number | null
  markerMediaIndex: number
  orderIndex: number
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

  if (!title?.trim()) {
    return { error: 'Bitte gib einen Titel ein.', loopicalId: null }
  }

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
  const uploadedMedia: { url: string; type: 'image' | 'pdf' }[] = []

  for (const file of mediaFiles) {
    if (!file || file.size === 0) continue

    const ext = file.name.split('.').pop()
    const path = `${projectId}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('media')
      .upload(path, file)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      continue
    }

    const {
      data: { publicUrl },
    } = admin.storage.from('media').getPublicUrl(path)

    const mediaType = file.type.startsWith('image/') ? 'image' as const : 'pdf' as const
    uploadedMedia.push({ url: publicUrl, type: mediaType })
  }

  // Create loopical (with first media as legacy media_url for backward compat)
  const firstMedia = uploadedMedia[0] ?? null

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
    })
    .select('id')
    .single()

  if (loopicalError || !loopical) {
    console.error('Create loopical error:', loopicalError)
    return { error: `Fehler: ${loopicalError?.message}`, loopicalId: null }
  }

  // Insert loopical_media rows
  if (uploadedMedia.length > 0) {
    const mediaRows = uploadedMedia.map((m, i) => ({
      loopical_id: loopical.id,
      media_url: m.url,
      media_type: m.type,
      order_index: i,
    }))

    const { error: mediaError } = await admin
      .from('loopical_media')
      .insert(mediaRows)

    if (mediaError) {
      console.error('Insert media error:', mediaError)
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
          order_index: p.orderIndex,
        }))

        const { error: pointsError } = await admin
          .from('feedback_points')
          .insert(pointRows)

        if (pointsError) {
          console.error('Insert feedback points error:', pointsError)
        }
      }
    } catch (e) {
      console.error('Parse feedback points error:', e)
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return { error: null, loopicalId: loopical.id }
}
