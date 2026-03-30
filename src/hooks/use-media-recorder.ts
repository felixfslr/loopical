'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type MicErrorCode = 'not-allowed' | 'not-found' | 'not-readable' | 'security' | 'generic' | null

interface UseMediaRecorderReturn {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
  analyserNode: AnalyserNode | null
  recordingStartMs: number | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  resetRecording: () => void
  error: string | null
  errorCode: MicErrorCode
}

const MAX_DURATION = 300 // 5 minutes in seconds

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<MicErrorCode>(null)
  const [recordingStartMs, setRecordingStartMs] = useState<number | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedElapsedRef = useRef<number>(0)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Show recording indicator in tab title
  useEffect(() => {
    if (!isRecording) return
    const originalTitle = document.title
    document.title = '\u{1F534} Aufnahme läuft...'
    return () => { document.title = originalTitle }
  }, [isRecording])

  // Warn before closing tab during recording
  useEffect(() => {
    if (!isRecording) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isRecording])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setErrorCode(null)
      setAudioBlob(null)
      chunksRef.current = []
      pausedElapsedRef.current = 0

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up AudioContext for visualizer
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      setAnalyserNode(analyser)

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setIsRecording(false)
        setIsPaused(false)

        // Clean up
        if (timerRef.current) clearInterval(timerRef.current)
        stream.getTracks().forEach((t) => t.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
        setAnalyserNode(null)
      }

      mediaRecorder.start(250) // collect data every 250ms
      const now = Date.now()
      setIsRecording(true)
      setIsPaused(false)
      setDuration(0)
      startTimeRef.current = now
      setRecordingStartMs(now)

      // Timer
      timerRef.current = setInterval(() => {
        const elapsed = pausedElapsedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
        if (elapsed >= MAX_DURATION) {
          mediaRecorderRef.current?.stop()
        }
      }, 200)
    } catch (err) {
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            setError('Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in deinen Browser-Einstellungen.')
            setErrorCode('not-allowed')
            break
          case 'NotFoundError':
            setError('Kein Mikrofon gefunden. Bitte schließe ein Mikrofon an.')
            setErrorCode('not-found')
            break
          case 'NotReadableError':
            setError('Mikrofon wird von einer anderen App verwendet. Bitte schließe andere Apps, die das Mikrofon nutzen.')
            setErrorCode('not-readable')
            break
          case 'SecurityError':
            setError('Mikrofon-Zugriff ist in diesem Browser nicht erlaubt. HTTPS ist erforderlich.')
            setErrorCode('security')
            break
          default:
            setError('Mikrofon konnte nicht gestartet werden.')
            setErrorCode('generic')
        }
      } else {
        setError('Mikrofon konnte nicht gestartet werden.')
        setErrorCode('generic')
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    const state = mediaRecorderRef.current?.state
    if (state === 'recording' || state === 'paused') {
      mediaRecorderRef.current!.stop()
    }
  }, [])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      // Save elapsed time and stop timer
      pausedElapsedRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      setIsPaused(true)
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      startTimeRef.current = Date.now()
      // Restart timer
      timerRef.current = setInterval(() => {
        const elapsed = pausedElapsedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
        if (elapsed >= MAX_DURATION) {
          mediaRecorderRef.current?.stop()
        }
      }, 200)
      setIsPaused(false)
    }
  }, [])

  const resetRecording = useCallback(() => {
    setAudioBlob(null)
    setDuration(0)
    setError(null)
    setErrorCode(null)
    chunksRef.current = []
    pausedElapsedRef.current = 0
  }, [])

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    analyserNode,
    recordingStartMs,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error,
    errorCode,
  }
}
