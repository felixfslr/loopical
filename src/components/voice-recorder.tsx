'use client'

import { useRef, useState } from 'react'
import { useMediaRecorder } from '@/hooks/use-media-recorder'
import { useAudioVisualizer } from '@/hooks/use-audio-visualizer'
import { Button } from '@/components/ui/button'
import { Mic, Square, Play, Pause, RotateCcw, Send } from 'lucide-react'

interface VoiceRecorderProps {
  onSubmit: (blob: Blob, durationSeconds: number) => void
  isSubmitting?: boolean
}

export function VoiceRecorder({ onSubmit, isSubmitting }: VoiceRecorderProps) {
  const {
    isRecording,
    duration,
    audioBlob,
    analyserNode,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  } = useMediaRecorder()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useAudioVisualizer(analyserNode, canvasRef)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const remaining = 300 - duration
  const showCountdown = isRecording && remaining <= 30

  function togglePlayback() {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  function handleSubmit() {
    if (audioBlob) {
      onSubmit(audioBlob, duration)
    }
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <Mic className="mx-auto h-8 w-8 text-destructive/50 mb-3" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={startRecording}>
          Erneut versuchen
        </Button>
      </div>
    )
  }

  // Preview state (after recording)
  if (audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob)
    return (
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-center gap-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
          />
          <Button variant="outline" size="icon" onClick={togglePlayback}>
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="ghost" size="sm" onClick={resetRecording}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Neu aufnehmen
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {isSubmitting ? 'Wird gesendet...' : 'Feedback senden'}
          </Button>
        </div>
      </div>
    )
  }

  // Recording / Idle state
  return (
    <div className="rounded-lg border p-6 flex flex-col items-center gap-4">
      {/* Waveform Canvas (visible during recording) */}
      {isRecording && (
        <canvas
          ref={canvasRef}
          width={300}
          height={60}
          className="w-full max-w-xs"
        />
      )}

      {/* Timer */}
      {isRecording && (
        <div className="text-center">
          <p className="text-2xl font-mono font-bold tabular-nums">
            {formatTime(duration)}
          </p>
          {showCountdown && (
            <p className="text-xs text-destructive mt-1">
              Noch {remaining} Sekunden
            </p>
          )}
        </div>
      )}

      {/* Record / Stop Button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
          isRecording
            ? 'bg-red-600 animate-pulse-record'
            : 'bg-red-600 hover:bg-red-700 hover:scale-105'
        }`}
      >
        {isRecording ? (
          <Square className="h-6 w-6 text-white" fill="white" />
        ) : (
          <Mic className="h-6 w-6 text-white" />
        )}
      </button>

      <p className="text-xs text-muted-foreground">
        {isRecording
          ? 'Klicke zum Stoppen'
          : 'Klicke zum Aufnehmen (max. 5 Min.)'}
      </p>
    </div>
  )
}
