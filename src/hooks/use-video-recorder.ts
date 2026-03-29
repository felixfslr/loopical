'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type VideoRecordingMode = 'webcam' | 'screen'

interface UseVideoRecorderReturn {
  isRecording: boolean
  duration: number
  videoBlob: Blob | null
  videoPreviewUrl: string | null
  stream: MediaStream | null
  startRecording: (mode: VideoRecordingMode) => Promise<void>
  stopRecording: () => void
  resetRecording: () => void
  error: string | null
}

const MAX_DURATION = 300 // 5 minutes

export function useVideoRecorder(): UseVideoRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    }
  }, [])

  // Tab title + beforeunload during recording
  useEffect(() => {
    if (!isRecording) return
    const originalTitle = document.title
    document.title = '\u{1F534} Video-Aufnahme läuft...'
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => {
      document.title = originalTitle
      window.removeEventListener('beforeunload', handler)
    }
  }, [isRecording])

  const startRecording = useCallback(async (mode: VideoRecordingMode) => {
    try {
      setError(null)
      setVideoBlob(null)
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
      setVideoPreviewUrl(null)
      chunksRef.current = []

      let mediaStream: MediaStream

      if (mode === 'screen') {
        // Screen capture with system audio
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })

        // Also capture microphone for voiceover
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          // Combine screen + mic tracks
          const tracks = [
            ...screenStream.getVideoTracks(),
            ...screenStream.getAudioTracks(),
            ...micStream.getAudioTracks(),
          ]
          mediaStream = new MediaStream(tracks)

          // Stop mic when screen sharing ends
          screenStream.getVideoTracks()[0].onended = () => {
            micStream.getTracks().forEach((t) => t.stop())
            mediaRecorderRef.current?.stop()
          }
        } catch {
          // No mic permission — use screen only
          mediaStream = screenStream
          screenStream.getVideoTracks()[0].onended = () => {
            mediaRecorderRef.current?.stop()
          }
        }
      } else {
        // Webcam
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        })
      }

      streamRef.current = mediaStream
      setStream(mediaStream)

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm'

      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        setVideoBlob(blob)
        setVideoPreviewUrl(URL.createObjectURL(blob))
        setIsRecording(false)
        setStream(null)

        if (timerRef.current) clearInterval(timerRef.current)
        mediaStream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      mediaRecorder.start(250)
      setIsRecording(true)
      setDuration(0)
      startTimeRef.current = Date.now()

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
        if (elapsed >= MAX_DURATION) {
          mediaRecorderRef.current?.stop()
        }
      }, 200)
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Zugriff wurde verweigert. Bitte erlaube Kamera/Bildschirm in deinen Browser-Einstellungen.')
        } else if (err.name === 'NotFoundError') {
          setError('Keine Kamera gefunden.')
        } else {
          setError('Aufnahme konnte nicht gestartet werden.')
        }
      } else {
        setError('Aufnahme konnte nicht gestartet werden.')
      }
    }
  }, [videoPreviewUrl])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const resetRecording = useCallback(() => {
    setVideoBlob(null)
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl)
    setVideoPreviewUrl(null)
    setDuration(0)
    setError(null)
    chunksRef.current = []
  }, [videoPreviewUrl])

  return {
    isRecording,
    duration,
    videoBlob,
    videoPreviewUrl,
    stream,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  }
}
