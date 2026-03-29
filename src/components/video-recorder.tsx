'use client'

import { useRef, useEffect, useState } from 'react'
import { useVideoRecorder, type VideoRecordingMode } from '@/hooks/use-video-recorder'
import { Button } from '@/components/ui/button'
import { Video, Monitor, Square, Play, Pause, RotateCcw, Send } from 'lucide-react'

interface VideoRecorderProps {
  onSubmit: (blob: Blob, durationSeconds: number) => void
  isSubmitting?: boolean
}

export function VideoRecorder({ onSubmit, isSubmitting }: VideoRecorderProps) {
  const {
    isRecording,
    duration,
    videoBlob,
    videoPreviewUrl,
    stream,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  } = useVideoRecorder()

  const previewRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Show live preview during recording
  useEffect(() => {
    if (previewRef.current && stream) {
      previewRef.current.srcObject = stream
    }
  }, [stream])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const remaining = 300 - duration
  const showCountdown = isRecording && remaining <= 30

  function handleSubmit() {
    if (videoBlob) onSubmit(videoBlob, duration)
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <Video className="mx-auto h-8 w-8 text-destructive/50 mb-3" />
        <p className="text-sm text-destructive">{error}</p>
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => startRecording('webcam')}>
            Webcam
          </Button>
          <Button variant="outline" size="sm" onClick={() => startRecording('screen')}>
            Bildschirm
          </Button>
        </div>
      </div>
    )
  }

  // Preview state (after recording)
  if (videoBlob && videoPreviewUrl) {
    return (
      <div className="rounded-lg border p-4 space-y-4">
        <video
          src={videoPreviewUrl}
          className="w-full rounded-md max-h-64 bg-black"
          controls
          playsInline
        />
        <div className="flex justify-center gap-3">
          <Button variant="ghost" size="sm" onClick={resetRecording}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Neu aufnehmen
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {isSubmitting ? 'Wird gesendet...' : 'Video senden'}
          </Button>
        </div>
      </div>
    )
  }

  // Recording state
  if (isRecording) {
    return (
      <div className="rounded-lg border p-4 space-y-4">
        <video
          ref={previewRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-md max-h-64 bg-black -scale-x-100"
        />
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-mono font-bold tabular-nums text-red-500">
              {formatTime(duration)}
            </p>
            {showCountdown && (
              <p className="text-xs text-destructive mt-1">
                Noch {remaining} Sekunden
              </p>
            )}
          </div>
          <button
            onClick={stopRecording}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 animate-pulse-record"
          >
            <Square className="h-5 w-5 text-white" fill="white" />
          </button>
        </div>
      </div>
    )
  }

  // Idle state — mode selection
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <p className="text-sm text-center text-muted-foreground">
        Wähle eine Aufnahmequelle
      </p>
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => startRecording('webcam')}
          className="flex-1 max-w-[160px] h-auto py-4 flex-col gap-2"
        >
          <Video className="h-6 w-6" />
          <span className="text-xs">Webcam</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => startRecording('screen')}
          className="flex-1 max-w-[160px] h-auto py-4 flex-col gap-2"
        >
          <Monitor className="h-6 w-6" />
          <span className="text-xs">Bildschirm</span>
        </Button>
      </div>
    </div>
  )
}
