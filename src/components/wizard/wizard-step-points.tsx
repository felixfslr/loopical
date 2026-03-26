'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AnnotatedImage } from '@/components/annotated-image'
import { QuestionRecorder } from './question-recorder'
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircleQuestion,
} from 'lucide-react'
import type { MediaItem } from './wizard-step-media'

export interface FeedbackPointDraft {
  id: string
  questionText: string
  questionAudioBlob?: Blob | null
  questionAudioUrl?: string | null
  questionTranscript?: string | null
  markerX?: number | null
  markerY?: number | null
  markerMediaIndex: number
  isUploading?: boolean
}

interface WizardStepPointsProps {
  media: MediaItem[]
  points: FeedbackPointDraft[]
  onPointsChange: (points: FeedbackPointDraft[]) => void
  onNext: () => void
  onBack: () => void
  onUploadQuestionAudio: (pointId: string, blob: Blob) => Promise<void>
}

export function WizardStepPoints({
  media,
  points,
  onPointsChange,
  onNext,
  onBack,
  onUploadQuestionAudio,
}: WizardStepPointsProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [activePointId, setActivePointId] = useState<string | null>(null)

  const currentMedia = media[currentMediaIndex]
  const markersForCurrentImage = points
    .filter((p) => p.markerX != null && p.markerY != null && p.markerMediaIndex === currentMediaIndex)
    .map((p) => ({
      id: p.id,
      label: p.questionText || 'Neuer Punkt',
      x: p.markerX!,
      y: p.markerY!,
    }))

  function addPoint(x?: number, y?: number) {
    const newPoint: FeedbackPointDraft = {
      id: crypto.randomUUID(),
      questionText: '',
      markerX: x ?? null,
      markerY: y ?? null,
      markerMediaIndex: currentMediaIndex,
    }
    onPointsChange([...points, newPoint])
    setActivePointId(newPoint.id)
  }

  function updatePoint(id: string, updates: Partial<FeedbackPointDraft>) {
    onPointsChange(
      points.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    )
  }

  function removePoint(id: string) {
    onPointsChange(points.filter((p) => p.id !== id))
    if (activePointId === id) setActivePointId(null)
  }

  function handleImageClick(x: number, y: number) {
    addPoint(x, y)
  }

  function handleMarkerClick(markerId: string) {
    setActivePointId(markerId)
  }

  async function handleQuestionRecorded(pointId: string, blob: Blob) {
    updatePoint(pointId, { questionAudioBlob: blob, isUploading: true })
    await onUploadQuestionAudio(pointId, blob)
    updatePoint(pointId, { isUploading: false })
  }

  const globalPointIndex = (pointId: string) =>
    points.findIndex((p) => p.id === pointId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Definiere deine Feedback-Punkte</h2>
        <p className="text-sm text-muted-foreground">
          Klicke auf das Bild, um Marker zu setzen, oder füge Fragen ohne Bild-Bezug hinzu.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Image viewer */}
        <div className="space-y-3">
          {currentMedia?.preview ? (
            <AnnotatedImage
              src={currentMedia.preview}
              alt="Upload"
              markers={markersForCurrentImage}
              activeMarkerId={activePointId ?? undefined}
              editable
              onImageClick={handleImageClick}
              onMarkerClick={handleMarkerClick}
              className="border"
            />
          ) : media.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-12 text-center">
              <MapPin className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Keine Bilder hochgeladen — du kannst trotzdem Fragen ohne Marker erstellen.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border p-12 text-center bg-muted">
              <p className="text-sm text-muted-foreground">PDF-Vorschau nicht verfügbar</p>
            </div>
          )}

          {/* Multi-image navigation */}
          {media.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={currentMediaIndex === 0}
                onClick={() => setCurrentMediaIndex((i) => i - 1)}
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
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={currentMediaIndex === media.length - 1}
                onClick={() => setCurrentMediaIndex((i) => i + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground ml-2">
                Bild {currentMediaIndex + 1} von {media.length}
              </span>
            </div>
          )}
        </div>

        {/* Right: Points list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Feedback-Punkte ({points.length})
            </h3>
            <Button variant="outline" size="sm" onClick={() => addPoint()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Punkt hinzufügen
            </Button>
          </div>

          {points.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <MessageCircleQuestion className="mx-auto h-6 w-6 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Klicke auf das Bild oder den Button, um Feedback-Punkte zu erstellen.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {points.map((point) => {
                  const idx = globalPointIndex(point.id)
                  const isActive = point.id === activePointId
                  return (
                    <motion.div
                      key={point.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`rounded-lg border p-3 space-y-2 transition-colors cursor-pointer ${
                        isActive ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/40'
                      }`}
                      onClick={() => {
                        setActivePointId(point.id)
                        if (point.markerMediaIndex !== currentMediaIndex && point.markerX != null) {
                          setCurrentMediaIndex(point.markerMediaIndex)
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {/* Number badge */}
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Input
                            value={point.questionText}
                            onChange={(e) =>
                              updatePoint(point.id, { questionText: e.target.value })
                            }
                            placeholder="Deine Frage..."
                            className="h-8 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            removePoint(point.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Voice question recorder */}
                      <div className="pl-8">
                        <QuestionRecorder
                          existingAudioUrl={point.questionAudioUrl}
                          isUploading={point.isUploading}
                          onRecorded={(blob) => handleQuestionRecorded(point.id, blob)}
                        />
                      </div>

                      {/* Marker info */}
                      <div className="pl-8 flex items-center gap-2 text-xs text-muted-foreground">
                        {point.markerX != null ? (
                          <>
                            <MapPin className="h-3 w-3" />
                            <span>Marker auf Bild {point.markerMediaIndex + 1}</span>
                          </>
                        ) : (
                          <span className="italic">Kein Marker — allgemeine Frage</span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={onNext} disabled={points.length === 0}>
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
