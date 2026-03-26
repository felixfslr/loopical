import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { after } from 'next/server'
import { processFeedbackEntry } from '@/lib/ai/pipeline'

export async function POST(request: Request) {
  try {
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
      return NextResponse.json(
        { error: 'Audio und Loopical-ID sind erforderlich.' },
        { status: 400 },
      )
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
      return NextResponse.json(
        { error: 'Audio konnte nicht hochgeladen werden.' },
        { status: 500 },
      )
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
      return NextResponse.json(
        { error: 'Feedback konnte nicht erstellt werden.' },
        { status: 500 },
      )
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
    console.error('Feedback API error:', err)
    return NextResponse.json(
      { error: 'Interner Serverfehler.' },
      { status: 500 },
    )
  }
}
