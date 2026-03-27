import type { TranscriptionResult } from './types'

export async function transcribeAudio(
  audioUrl: string,
): Promise<TranscriptionResult> {
  // Download audio from storage (30s timeout)
  const downloadController = new AbortController()
  const downloadTimeout = setTimeout(() => downloadController.abort(), 30_000)
  let audioResponse: Response
  try {
    audioResponse = await fetch(audioUrl, { signal: downloadController.signal })
  } finally {
    clearTimeout(downloadTimeout)
  }
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`)
  }

  const audioBuffer = await audioResponse.arrayBuffer()
  const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' })

  // Send to ElevenLabs Scribe v2
  const formData = new FormData()
  formData.append('file', audioBlob, 'recording.webm')
  formData.append('model_id', 'scribe_v2')
  formData.append('tag_audio_events', 'true')
  formData.append('timestamps_granularity', 'word')

  // ElevenLabs transcription (30s timeout)
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
        body: formData,
        signal: transcribeController.signal,
      },
    )
  } finally {
    clearTimeout(transcribeTimeout)
  }

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
