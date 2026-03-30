'use client'

import { useRef, useState } from 'react'
import { useMediaRecorder } from '@/hooks/use-media-recorder'
import { useAudioVisualizer } from '@/hooks/use-audio-visualizer'
import { useAmplitude } from '@/hooks/use-amplitude'
import { SiriOrb } from '@/components/ui/siri-orb'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Mic, Square, Play, Pause, RotateCcw, Send, Type, AlertTriangle } from 'lucide-react'
import type { MicErrorCode } from '@/hooks/use-media-recorder'

interface VoiceRecorderProps {
  onSubmit: (blob: Blob, durationSeconds: number) => void
  onSubmitText?: (text: string) => void
  isSubmitting?: boolean
  variant?: 'card' | 'standalone'
  onRecordingStateChange?: (isRecording: boolean, startMs: number | null) => void
  onPreviewStateChange?: (isPreview: boolean) => void
  onReRecord?: () => void
}

function getBrowserPermissionHint(): string {
  const ua = navigator.userAgent
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    return 'In Chrome: Klicke auf das Schloss-Symbol links in der Adressleiste → Website-Einstellungen → Mikrofon → Erlauben.'
  }
  if (ua.includes('Firefox')) {
    return 'In Firefox: Klicke auf das Schild-Symbol links in der Adressleiste → Berechtigungen → Mikrofon erlauben.'
  }
  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    return 'In Safari: Gehe zu Einstellungen → Websites → Mikrofon → für diese Seite erlauben.'
  }
  if (ua.includes('Edg')) {
    return 'In Edge: Klicke auf das Schloss-Symbol links in der Adressleiste → Berechtigungen → Mikrofon → Erlauben.'
  }
  return 'Bitte erlaube den Mikrofon-Zugriff in deinen Browser-Einstellungen.'
}

export function VoiceRecorder({
  onSubmit,
  onSubmitText,
  isSubmitting,
  variant = 'card',
  onRecordingStateChange,
  onPreviewStateChange,
  onReRecord,
}: VoiceRecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    analyserNode,
    recordingStartMs,
    startRecording: startRecordingRaw,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording: resetRecordingRaw,
    error,
    errorCode,
  } = useMediaRecorder()

  const [localSubmitting, setLocalSubmitting] = useState(false)
  const [textMode, setTextMode] = useState(false)
  const [textFeedback, setTextFeedback] = useState('')
  const [isSubmittingText, setIsSubmittingText] = useState(false)

  const startRecording = async () => {
    await startRecordingRaw()
    onRecordingStateChange?.(true, Date.now())
  }

  const handleStopRecording = () => {
    stopRecording()
    onRecordingStateChange?.(false, null)
    onPreviewStateChange?.(true)
  }

  const resetRecording = () => {
    onReRecord?.()
    onPreviewStateChange?.(false)
    resetRecordingRaw()
    onRecordingStateChange?.(false, null)
    setLocalSubmitting(false)
  }

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useAudioVisualizer(analyserNode, canvasRef)
  const amplitude = useAmplitude(isRecording && !isPaused ? analyserNode : null)

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
    if (audioBlob && !localSubmitting) {
      setLocalSubmitting(true)
      onSubmit(audioBlob, duration)
    }
  }

  async function handleSubmitText() {
    if (!textFeedback.trim() || !onSubmitText) return
    setIsSubmittingText(true)
    try {
      onSubmitText(textFeedback.trim())
    } finally {
      setIsSubmittingText(false)
    }
  }

  // Text mode
  if (textMode) {
    return (
      <div className={variant === 'standalone' ? '' : 'rounded-lg border p-6'}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Schriftliches Feedback</p>
            <button
              onClick={() => setTextMode(false)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Mic className="h-3 w-3" />
              Stattdessen aufnehmen
            </button>
          </div>
          <Textarea
            value={textFeedback}
            onChange={(e) => setTextFeedback(e.target.value)}
            placeholder="Schreibe dein Feedback hier..."
            rows={4}
            autoFocus
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{textFeedback.length} Zeichen</span>
            <Button
              size="sm"
              onClick={handleSubmitText}
              disabled={!textFeedback.trim() || isSubmittingText || !onSubmitText}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {isSubmittingText ? 'Wird gesendet...' : 'Feedback senden'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Error state with browser-specific hints
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <Mic className="mx-auto h-8 w-8 text-destructive/50 mb-3" />
        <p className="text-sm text-destructive">{error}</p>
        {errorCode === 'not-allowed' && (
          <div className="mt-3 rounded-md bg-muted/50 p-3">
            <div className="flex items-start gap-2 text-left">
              <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{getBrowserPermissionHint()}</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="outline" size="sm" onClick={startRecording}>
            Erneut versuchen
          </Button>
          {onSubmitText && (
            <Button variant="ghost" size="sm" onClick={() => setTextMode(true)}>
              <Type className="mr-1.5 h-3.5 w-3.5" />
              Stattdessen schreiben
            </Button>
          )}
        </div>
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
            disabled={isSubmitting || localSubmitting}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {isSubmitting || localSubmitting ? 'Wird gesendet...' : 'Feedback senden'}
          </Button>
        </div>
      </div>
    )
  }

  // Recording / Idle state — splitscreen with SiriOrb
  const isStandalone = variant === 'standalone'

  // Responsive orb sizes: smaller on mobile for standalone
  const orbSize = isStandalone
    ? (isRecording ? '200px' : '160px')
    : (isRecording ? '160px' : '120px')

  return (
    <div className={isStandalone ? '' : 'rounded-lg border p-6'}>
      <div className={isStandalone
        ? 'flex flex-col items-center gap-8'
        : 'flex flex-col md:flex-row items-center gap-6'
      }>
        {/* SiriOrb */}
        <div className="flex items-center justify-center flex-shrink-0">
          <SiriOrb
            size={orbSize}
            animationDuration={isRecording && !isPaused ? 6 : 20}
            className="drop-shadow-xl transition-all duration-500"
            amplitude={isRecording && !isPaused ? amplitude : undefined}
            colors={
              isRecording
                ? {
                    c1: isPaused ? 'oklch(65% 0.15 220)' : 'oklch(65% 0.25 25)',
                    c2: isPaused ? 'oklch(70% 0.10 200)' : 'oklch(70% 0.20 350)',
                    c3: isPaused ? 'oklch(60% 0.12 210)' : 'oklch(60% 0.22 15)',
                  }
                : undefined
            }
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-4 flex-1">
          {isRecording && (
            <canvas
              ref={canvasRef}
              width={300}
              height={60}
              className="w-full max-w-xs"
            />
          )}

          {/* Audio level meter */}
          {isRecording && !isPaused && (
            <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-100"
                style={{ width: `${Math.min(100, (amplitude?.get?.() ?? 0) * 100)}%` }}
              />
            </div>
          )}

          {isRecording && (
            <div className="text-center">
              <p className="text-2xl font-mono font-bold tabular-nums">
                {formatTime(duration)}
              </p>
              {isPaused && (
                <p className="text-xs text-amber-500 mt-1">Pausiert</p>
              )}
              {showCountdown && !isPaused && (
                <p className="text-xs text-destructive mt-1">
                  Noch {remaining} Sekunden
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Pause/Resume button */}
            {isRecording && (
              <button
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors"
                title={isPaused ? 'Fortsetzen' : 'Pausieren'}
              >
                {isPaused ? (
                  <Play className="h-4 w-4 text-foreground" />
                ) : (
                  <Pause className="h-4 w-4 text-foreground" />
                )}
              </button>
            )}

            {/* Main record/stop button */}
            <button
              onClick={isRecording ? handleStopRecording : startRecording}
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
          </div>

          <p className="text-xs text-muted-foreground">
            {isRecording
              ? (isPaused ? 'Pausiert — klicke zum Fortsetzen oder Stoppen' : 'Klicke zum Stoppen')
              : 'Klicke zum Aufnehmen (max. 5 Min.)'}
          </p>

          {/* Text fallback link */}
          {!isRecording && onSubmitText && (
            <button
              onClick={() => setTextMode(true)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Type className="h-3 w-3" />
              Lieber schreiben?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
