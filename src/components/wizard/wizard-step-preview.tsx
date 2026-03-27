'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AnnotatedImage } from '@/components/annotated-image'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, MapPin, Mic, MessageCircleQuestion, Sparkles, Link2 } from 'lucide-react'
import type { MediaItem } from './wizard-step-media'
import type { FeedbackPointDraft } from './wizard-step-points'
import type { FeedbackMode } from '@/lib/types/database'

interface WizardStepPreviewProps {
  title: string
  media: MediaItem[]
  mode: FeedbackMode
  points: FeedbackPointDraft[]
  welcomeMessage: string
  contextUrl: string
  onWelcomeMessageChange: (msg: string) => void
  onBack: () => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function WizardStepPreview({
  title,
  media,
  mode,
  points,
  welcomeMessage,
  contextUrl,
  onWelcomeMessageChange,
  onBack,
  onSubmit,
  isSubmitting,
}: WizardStepPreviewProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [isGeneratingWelcome, setIsGeneratingWelcome] = useState(false)

  const currentImage = media[currentMediaIndex]
  const markersForCurrentImage = points
    .filter((p) => p.markerX != null && p.markerY != null && p.markerMediaIndex === currentMediaIndex)
    .map((p) => ({
      id: p.id,
      label: p.questionText || 'Punkt',
      x: p.markerX!,
      y: p.markerY!,
    }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Vorschau</h2>
        <p className="text-sm text-muted-foreground">
          So wird dein Loopical für Feedback-Geber aussehen.
        </p>
      </div>

      {/* Preview card */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Badge variant={mode === 'guided' ? 'default' : 'secondary'}>
            {mode === 'guided' ? 'Geführt' : 'Offen'}
          </Badge>
        </div>

        {/* Context URL */}
        {contextUrl && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <a
              href={contextUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate hover:text-foreground transition-colors"
            >
              {contextUrl}
            </a>
          </div>
        )}

        {/* Image carousel */}
        {currentImage?.preview && (
          <div>
            <AnnotatedImage
              src={currentImage.preview}
              alt={title}
              markers={mode === 'guided' ? markersForCurrentImage : []}
              className="border rounded-lg"
            />

            {media.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentMediaIndex((i) => Math.max(0, i - 1))}
                  disabled={currentMediaIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1.5">
                  {media.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentMediaIndex(i)}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        i === currentMediaIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentMediaIndex((i) => Math.min(media.length - 1, i + 1))}
                  disabled={currentMediaIndex === media.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {mode === 'guided' && points.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{points.length} Feedback-Punkte:</p>
            <div className="space-y-1.5">
              {points.map((point, i) => (
                <div key={point.id} className="flex items-start gap-2 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <span className="flex-1">
                    {point.questionText || <span className="italic text-muted-foreground">Kein Text</span>}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {point.contextUrl && (
                      <Link2 className="h-3 w-3 text-muted-foreground" />
                    )}
                    {point.markerX != null && (
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                    )}
                    {point.questionAudioUrl && (
                      <Mic className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === 'open' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircleQuestion className="h-4 w-4" />
            Feedback-Geber können frei sprechen
          </div>
        )}
      </div>

      {/* Welcome message */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="welcome-msg">Begrüßung für Feedback-Geber (optional)</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={async () => {
              setIsGeneratingWelcome(true)
              try {
                const res = await fetch('/api/generate-welcome', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title,
                    points: points.map((p) => p.questionText).filter(Boolean),
                  }),
                })
                if (!res.ok) throw new Error('Failed')
                const data = await res.json()
                if (data.message) onWelcomeMessageChange(data.message)
              } catch {
                // silently fail
              } finally {
                setIsGeneratingWelcome(false)
              }
            }}
            disabled={isGeneratingWelcome}
          >
            {isGeneratingWelcome ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" />
            )}
            Mit KI generieren
          </Button>
        </div>
        <Textarea
          id="welcome-msg"
          value={welcomeMessage}
          onChange={(e) => onWelcomeMessageChange(e.target.value)}
          placeholder="z.B. Danke, dass du dir Zeit nimmst! Bitte achte besonders auf..."
          rows={2}
        />
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Wird erstellt...
            </>
          ) : (
            'Loopical erstellen'
          )}
        </Button>
      </div>
    </div>
  )
}
