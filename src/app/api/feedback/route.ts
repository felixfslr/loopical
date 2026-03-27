import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { after } from 'next/server'
import { processFeedbackEntry } from '@/lib/ai/pipeline'
import { feedbackLimiter } from '@/lib/rate-limit'
import { ApiError, errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { success } = feedbackLimiter.check(ip)
    if (!success) {
      throw new ApiError('Zu viele Anfragen. Bitte warte einen Moment.', 429, 'RATE_LIMITED')
    }

    const formData = await request.formData()
    const audio = formData.get('audio') as File
    const loopicalId = formData.get('loopicalId') as string
    const authorId = formData.get('authorId') as string | null
    const guestName = formData.get('guestName') as string | null
    const feedbackPointId = formData.get('feedbackPointId') as string | null
    const durationSeconds = parseInt(
      formData.get('durationSeconds') as string,
      10,
    )

    if (!audio || !loopicalId) {
      throw new ApiError('Audio und Loopical-ID sind erforderlich.', 400, 'MISSING_PARAMS')
    }

    const admin = createAdminClient()

    // Convert File to ArrayBuffer for reliable binary upload
    const audioBuffer = await audio.arrayBuffer()

    // Upload audio to storage
    const path = `${loopicalId}/${crypto.randomUUID()}.webm`
    const { error: uploadError } = await admin.storage
      .from('audio')
      .upload(path, audioBuffer, {
        contentType: 'audio/webm',
        duplex: 'half',
      } as any)

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new ApiError('Audio konnte nicht hochgeladen werden.', 500, 'UPLOAD_FAILED')
    }

    const {
      data: { publicUrl },
    } = admin.storage.from('audio').getPublicUrl(path)

    // Create feedback entry
    const { data: entry, error: insertError } = await admin
      .from('feedback_entries')
      .insert({
        loopical_id: loopicalId,
        audio_url: publicUrl,
        audio_duration_seconds: durationSeconds || null,
        processing_status: 'pending',
        author_id: authorId || null,
        guest_name: guestName || null,
        feedback_point_id: feedbackPointId || null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new ApiError('Feedback konnte nicht erstellt werden.', 500, 'INSERT_FAILED')
    }

    // Trigger AI processing after response is sent
    after(async () => {
      try {
        await processFeedbackEntry(entry.id)
      } catch (err) {
        console.error('AI processing error:', err)
      }
    })

    return NextResponse.json({ id: entry.id })
  } catch (err) {
    return errorResponse(err)
  }
}
