'use client'

import { useState } from 'react'
import { useMediaRecorder } from '@/hooks/use-media-recorder'
import { Button } from '@/components/ui/button'
import { Mic, Square, Play, Pause, RotateCcw, Loader2 } from 'lucide-react'

interface QuestionRecorderProps {
  onRecorded: (blob: Blob, durationSeconds: number) => void
  isUploading?: boolean
  existingAudioUrl?: string | null
}

export function QuestionRecorder({ onRecorded, isUploading, existingAudioUrl }: QuestionRecorderProps) {
  const {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  } = useMediaRecorder()

  const [isPlaying, setIsPlaying] = useState(false)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function togglePlayback() {
    if (!audioEl) return
    if (isPlaying) {
      audioEl.pause()
    } else {
      audioEl.play()
    }
    setIsPlaying(!isPlaying)
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive">
        <Mic className="h-3.5 w-3.5" />
        <span>{error}</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={startRecording}>
          Retry
        </Button>
      </div>
    )
  }

  // Show existing recording or new recording
  if (audioBlob || existingAudioUrl) {
    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : existingAudioUrl!
    return (
      <div className="flex items-center gap-2">
        <audio
          ref={setAudioEl}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={togglePlayback}>
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>
        {audioBlob && (
          <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
        )}
        {isUploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => {
                resetRecording()
                setAudioEl(null)
              }}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Neu
            </Button>
            {audioBlob && (
              <Button
                variant="default"
                size="sm"
                className="h-6 text-xs"
                onClick={() => onRecorded(audioBlob, duration)}
              >
                Speichern
              </Button>
            )}
          </>
        )}
      </div>
    )
  }

  // Recording state
  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-mono tabular-nums">{formatTime(duration)}</span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs"
          onClick={stopRecording}
        >
          <Square className="mr-1 h-3 w-3" fill="currentColor" />
          Stopp
        </Button>
      </div>
    )
  }

  // Idle
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs text-muted-foreground"
      onClick={startRecording}
    >
      <Mic className="mr-1 h-3.5 w-3.5" />
      Frage einsprechen
    </Button>
  )
}
