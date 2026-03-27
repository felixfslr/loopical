import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth'
import { questionAudioLimiter } from '@/lib/rate-limit'
import { ApiError, errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const { success } = questionAudioLimiter.check(ip)
    if (!success) {
      throw new ApiError('Zu viele Anfragen. Bitte warte einen Moment.', 429, 'RATE_LIMITED')
    }

    await requireUser()

    const formData = await request.formData()
    const audio = formData.get('audio') as File

    if (!audio) {
      throw new ApiError('Audio ist erforderlich.', 400, 'MISSING_PARAMS')
    }

    const admin = createAdminClient()

    // Upload audio to storage
    const audioBuffer = await audio.arrayBuffer()
    const path = `questions/${crypto.randomUUID()}.webm`

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

    // Transcribe via ElevenLabs Scribe v2 (synchronous — questions are short)
    let transcript = ''
    try {
      const transcribeForm = new FormData()
      transcribeForm.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'question.webm')
      transcribeForm.append('model_id', 'scribe_v2')

      const transcribeController = new AbortController()
      const transcribeTimeout = setTimeout(() => transcribeController.abort(), 30_000)
      let response: Response
      try {
        response = await fetch(
          'https://api.elevenlabs.io/v1/speech-to-text',
          {
            method: 'POST',
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            },
            body: transcribeForm,
            signal: transcribeController.signal,
          },
        )
      } finally {
        clearTimeout(transcribeTimeout)
      }

      if (response.ok) {
        const result = await response.json()
        transcript = result.text ?? ''
      } else {
        console.error('Transcription error:', await response.text())
      }
    } catch (err) {
      console.error('Transcription error:', err)
    }

    return NextResponse.json({
      audio_url: publicUrl,
      transcript,
    })
  } catch (err) {
    return errorResponse(err)
  }
}
