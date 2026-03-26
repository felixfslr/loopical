import type { TranscriptionResult } from './types'

export async function transcribeAudio(
  audioUrl: string,
): Promise<TranscriptionResult> {
  // Download audio from storage
  const audioResponse = await fetch(audioUrl)
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`)
  }
  const audioBlob = await audioResponse.blob()

  // Send to ElevenLabs Scribe v2
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')
  formData.append('model_id', 'scribe_v2')
  formData.append('tag_audio_events', 'true')
  formData.append('timestamps_granularity', 'word')

  const response = await fetch(
    'https://api.elevenlabs.io/v1/speech-to-text',
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: formData,
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `ElevenLabs API error ${response.status}: ${errorText}`,
    )
  }

  const result = await response.json()

  // Map word-level timestamps
  const wordTimestamps = (result.words ?? []).map(
    (w: { text: string; start: number; end: number }) => ({
      word: w.text,
      start: w.start,
      end: w.end,
    }),
  )

  return {
    transcript: result.text ?? '',
    wordTimestamps,
    languageCode: result.language_code ?? null,
  }
}
