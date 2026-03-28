'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AnnotatedImage } from '@/components/annotated-image'
import type { Marker, ImageBounds } from '@/components/annotated-image'
import { AnnotationCanvas } from '@/components/annotation-canvas'
import { AnnotationToolbar } from '@/components/annotation-toolbar'
import type { AnnotationMode } from '@/components/annotation-toolbar'
import { cn } from '@/lib/utils'
import type { Annotation, AnnotationStroke } from '@/lib/types/database'

interface AnnotationOverlayProps {
  src: string
  alt: string
  /** Pre-existing markers from feedback_points (shown as regular markers) */
  existingMarkers?: Marker[]
  activeMarkerId?: string
  onMarkerClick?: (markerId: string) => void
  /** Annotation state from useAnnotations */
  annotations: Annotation[]
  onAddPin: (x: number, y: number, mediaIndex: number, timestampMs: number) => void
  onAddStroke: (points: { x: number; y: number }[], mediaIndex: number, timestampMs: number) => void
  onUndo: () => void
  /** Whether the voice recorder is currently recording */
  isRecording?: boolean
  /** Timestamp when recording started (Date.now()), or null if not recording */
  recordingStartMs?: number | null
  /** Current media index for multi-image support */
  mediaIndex?: number
  /** Whether annotations are editable (false = read-only preview after recording) */
  editable?: boolean
  className?: string
}

export function AnnotationOverlay({
  src,
  alt,
  existingMarkers = [],
  activeMarkerId,
  onMarkerClick,
  annotations,
  onAddPin,
  onAddStroke,
  onUndo,
  isRecording = false,
  recordingStartMs = null,
  mediaIndex = 0,
  editable = true,
  className,
}: AnnotationOverlayProps) {
  const [mode, setMode] = useState<AnnotationMode>('pin')

  const currentTimestampMs = useCallback(() => {
    if (!isRecording || !recordingStartMs) return -1
    return Date.now() - recordingStartMs
  }, [isRecording, recordingStartMs])

  // Filter annotations for current media
  const currentAnnotations = annotations.filter((a) => a.media_index === mediaIndex)
  const currentStrokes = currentAnnotations.filter(
    (a): a is AnnotationStroke => a.type === 'stroke',
  )
  const currentPins = currentAnnotations.filter((a) => a.type === 'pin')

  // Build markers: existing feedback_point markers + guest pin annotations
  const guestPinMarkers: Marker[] = currentPins.map((pin) => ({
    id: pin.id,
    label: pin.label,
    x: pin.x,
    y: pin.y,
  }))

  const allMarkers = [...existingMarkers, ...guestPinMarkers]

  const handleImageClick = useCallback(
    (x: number, y: number) => {
      if (!editable || mode !== 'pin') return
      onAddPin(x, y, mediaIndex, currentTimestampMs())
    },
    [editable, mode, mediaIndex, currentTimestampMs, onAddPin],
  )

  const handleStrokeComplete = useCallback(
    (points: { x: number; y: number }[]) => {
      if (!editable) return
      onAddStroke(points, mediaIndex, currentTimestampMs())
    },
    [editable, mediaIndex, currentTimestampMs, onAddStroke],
  )

  const canUndo = currentAnnotations.length > 0

  return (
    <div className={cn('relative', className)}>
      <AnnotatedImage
        src={src}
        alt={alt}
        markers={allMarkers}
        activeMarkerId={activeMarkerId}
        onImageClick={editable && mode === 'pin' ? handleImageClick : undefined}
        onMarkerClick={onMarkerClick}
        editable={editable && mode === 'pin'}
        renderOverlay={(bounds: ImageBounds) => (
          <AnnotationCanvas
            bounds={bounds}
            strokes={currentStrokes}
            isDrawing={editable && mode === 'draw'}
            onStrokeComplete={handleStrokeComplete}
          />
        )}
      />

      {/* Guest pin markers with distinct style (orange) */}
      {/* These are rendered via allMarkers in AnnotatedImage, but we need
          to distinguish them visually. We handle this by checking if the
          marker id matches a guest pin in the parent AnnotatedImage.
          For now, guest pins use the same style as existing markers —
          Phase 5 will add color differentiation on the review side. */}

      {editable && (
        <AnnotationToolbar
          mode={mode}
          onModeChange={setMode}
          onUndo={onUndo}
          canUndo={canUndo}
          isRecording={isRecording}
        />
      )}
    </div>
  )
}
