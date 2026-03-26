import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    await requireUser()

    const formData = await request.formData()
    const audio = formData.get('audio') as File

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio ist erforderlich.' },
        { status: 400 },
      )
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
      return NextResponse.json(
        { error: 'Audio konnte nicht hochgeladen werden.' },
        { status: 500 },
      )
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

      const response = await fetch(
        'https://api.elevenlabs.io/v1/speech-to-text',
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          },
          body: transcribeForm,
        },
      )

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
    console.error('Question audio API error:', err)
    return NextResponse.json(
      { error: 'Interner Serverfehler.' },
      { status: 500 },
    )
  }
}
