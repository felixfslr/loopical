'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AnnotatedImage } from '@/components/annotated-image'
import { FeedbackSubmitForm } from '@/components/feedback-submit-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Mic,
  Play,
  Pause,
  SkipForward,
} from 'lucide-react'

interface FeedbackPoint {
  id: string
  question_text: string | null
  question_audio_url: string | null
  question_transcript: string | null
  marker_x: number | null
  marker_y: number | null
  marker_media_index: number
  order_index: number
}

interface MediaItem {
  id: string
  media_url: string
  media_type: string
  order_index: number
}

interface GuidedFeedbackFlowProps {
  loopicalId: string
  loopicalTitle: string
  welcomeMessage: string | null
  feedbackPoints: FeedbackPoint[]
  media: MediaItem[]
  shareToken: string
}

export function GuidedFeedbackFlow({
  loopicalId,
  loopicalTitle,
  welcomeMessage,
  feedbackPoints,
  media,
  shareToken,
}: GuidedFeedbackFlowProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<'intro' | 'guided' | 'open' | 'done'>('intro')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [guestName, setGuestName] = useState('')
  const [completedPoints, setCompletedPoints] = useState<Set<string>>(new Set())

  const currentPoint = feedbackPoints[currentIndex]
  const totalPoints = feedbackPoints.length
  const isLastPoint = currentIndex === totalPoints - 1

  // Get the right image for the current point
  const currentMediaIndex = currentPoint?.marker_media_index ?? 0
  const currentMedia = media[currentMediaIndex]

  // Build markers for current image
  const markersForImage = feedbackPoints
    .filter(
      (p) =>
        p.marker_x != null &&
        p.marker_y != null &&
        p.marker_media_index === currentMediaIndex,
    )
    .map((p) => ({
      id: p.id,
      label: p.question_text || 'Punkt',
      x: p.marker_x!,
      y: p.marker_y!,
    }))

  function handlePointComplete() {
    if (currentPoint) {
      setCompletedPoints((prev) => new Set([...prev, currentPoint.id]))
    }
  }

  function goToNext() {
    if (isLastPoint) {
      setPhase('open')
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  function goToPrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    }
  }

  function handleFinish() {
    router.push(`/feedback/${shareToken}/thank-you`)
  }

  const fadeSlide = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.25 },
  }

  // ---- INTRO SCREEN ----
  if (phase === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          {loopicalTitle}
        </h1>
        {welcomeMessage && (
          <p className="text-muted-foreground max-w-md mb-4">
            {welcomeMessage}
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-6">
          {totalPoints} Feedback-{totalPoints === 1 ? 'Punkt' : 'Punkte'}
        </p>

        <div className="w-full max-w-xs space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Dein Name (optional)</Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Wie heißt du?"
            />
          </div>
          <Button className="w-full" onClick={() => setPhase('guided')}>
            Feedback starten
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // ---- OPEN FEEDBACK (after guided) ----
  if (phase === 'open') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <Check className="h-10 w-10 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          Alle Punkte beantwortet!
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Möchtest du noch allgemeines Feedback geben?
        </p>

        <div className="w-full max-w-sm space-y-4">
          <FeedbackSubmitForm
            loopicalId={loopicalId}
            variant="standalone"
            onSuccess={() => setPhase('done')}
          />
          <button
            onClick={handleFinish}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Feedback abschließen
          </button>
        </div>
      </div>
    )
  }

  // ---- DONE ----
  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <Check className="h-10 w-10 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Danke für dein Feedback!</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Dein Voice-Feedback wird jetzt verarbeitet.
        </p>
        <Button variant="outline" onClick={handleFinish}>
          Fertig
        </Button>
      </div>
    )
  }

  // ---- GUIDED STEP-BY-STEP ----
  return (
    <div className="min-h-dvh flex flex-col lg:grid lg:grid-cols-2">
      {/* Progress bar */}
      <div className="col-span-2 border-b px-4 py-2 flex items-center gap-3">
        <span className="text-sm font-medium">
          Punkt {currentIndex + 1} von {totalPoints}
        </span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalPoints) * 100}%` }}
          />
        </div>
        {/* Progress dots */}
        <div className="hidden sm:flex gap-1">
          {feedbackPoints.map((p, i) => (
            <div
              key={p.id}
              className={`h-2 w-2 rounded-full transition-colors ${
                completedPoints.has(p.id)
                  ? 'bg-green-500'
                  : i === currentIndex
                    ? 'bg-primary'
                    : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Image panel */}
      <div className="bg-muted/30 order-1 lg:order-2 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 lg:p-6">
          {currentMedia ? (
            <AnnotatedImage
              src={currentMedia.media_url}
              alt={loopicalTitle}
              markers={markersForImage}
              activeMarkerId={currentPoint?.id}
              className="max-h-[50vh] lg:max-h-[70vh]"
            />
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Kein Bild für diesen Punkt
              </p>
            </div>
          )}
        </div>

        {/* Image navigation */}
        {media.length > 1 && (
          <div className="flex items-center justify-center gap-2 pb-3">
            {media.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === currentMediaIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recording panel */}
      <div className="relative flex-1 flex flex-col p-6 lg:p-8 order-2 lg:order-1 bg-gradient-to-b from-muted/50 to-background">
        <AnimatePresence mode="wait">
          <motion.div key={currentPoint?.id} {...fadeSlide} className="flex-1 flex flex-col">
            {/* Question */}
            <div className="mb-6">
              <QuestionDisplay point={currentPoint} index={currentIndex} />
            </div>

            {/* Voice recorder */}
            <div className="flex-1 flex flex-col justify-center">
              <FeedbackSubmitForm
                loopicalId={loopicalId}
                feedbackPointId={currentPoint?.id}
                variant="standalone"
                onSuccess={handlePointComplete}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Zurück
          </Button>
          <button
            onClick={goToNext}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <SkipForward className="h-3.5 w-3.5" />
            {isLastPoint ? 'Abschließen' : 'Überspringen'}
          </button>
          {completedPoints.has(currentPoint?.id) && (
            <Button size="sm" onClick={goToNext}>
              {isLastPoint ? 'Abschließen' : 'Weiter'}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Sub-components ----

function QuestionDisplay({
  point,
  index,
}: {
  point: FeedbackPoint | undefined
  index: number
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)

  if (!point) return null

  const questionText = point.question_text || point.question_transcript || ''

  function togglePlayback() {
    if (!audioEl) return
    if (isPlaying) {
      audioEl.pause()
    } else {
      audioEl.play()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
          {index + 1}
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          Feedback-Punkt
        </span>
      </div>
      {questionText && (
        <p className="text-lg font-medium">{questionText}</p>
      )}
      {point.question_audio_url && (
        <div className="flex items-center gap-2">
          <audio
            ref={setAudioEl}
            src={point.question_audio_url}
            onEnded={() => setIsPlaying(false)}
          />
          <Button variant="outline" size="sm" className="h-7" onClick={togglePlayback}>
            {isPlaying ? (
              <Pause className="mr-1.5 h-3 w-3" />
            ) : (
              <Play className="mr-1.5 h-3 w-3" />
            )}
            Frage anhören
          </Button>
          <Mic className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
