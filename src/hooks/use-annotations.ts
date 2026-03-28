'use client'

import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import type { Annotation, AnnotationPin, AnnotationStroke } from '@/lib/types/database'

const STROKE_COLOR = '#ef4444'
const STROKE_WIDTH = 0.4 // percentage of image width

interface UseAnnotationsReturn {
  annotations: Annotation[]
  addPin: (x: number, y: number, mediaIndex: number, timestampMs: number) => void
  addStroke: (points: { x: number; y: number }[], mediaIndex: number, timestampMs: number) => void
  undo: () => void
  clear: () => void
  clearRecordingAnnotations: () => void
  pinCount: number
}

export function useAnnotations(): UseAnnotationsReturn {
  const [annotations, setAnnotations] = useState<Annotation[]>([])

  const pinCount = annotations.filter((a) => a.type === 'pin').length

  const addPin = useCallback((x: number, y: number, mediaIndex: number, timestampMs: number) => {
    setAnnotations((prev) => {
      const existingPins = prev.filter((a) => a.type === 'pin').length
      const pin: AnnotationPin = {
        type: 'pin',
        id: nanoid(8),
        x,
        y,
        label: String(existingPins + 1),
        timestamp_ms: timestampMs,
        media_index: mediaIndex,
      }
      return [...prev, pin]
    })
  }, [])

  const addStroke = useCallback(
    (points: { x: number; y: number }[], mediaIndex: number, timestampMs: number) => {
      if (points.length < 2) return
      const stroke: AnnotationStroke = {
        type: 'stroke',
        id: nanoid(8),
        points,
        color: STROKE_COLOR,
        width: STROKE_WIDTH,
        timestamp_ms: timestampMs,
        media_index: mediaIndex,
      }
      setAnnotations((prev) => [...prev, stroke])
    },
    [],
  )

  const undo = useCallback(() => {
    setAnnotations((prev) => {
      const next = prev.slice(0, -1)
      // Re-number pins
      let pinIndex = 0
      return next.map((a) => {
        if (a.type === 'pin') {
          pinIndex++
          return { ...a, label: String(pinIndex) }
        }
        return a
      })
    })
  }, [])

  const clear = useCallback(() => {
    setAnnotations([])
  }, [])

  const clearRecordingAnnotations = useCallback(() => {
    setAnnotations((prev) => {
      const kept = prev.filter((a) => a.timestamp_ms < 0)
      // Re-number pins
      let pinIndex = 0
      return kept.map((a) => {
        if (a.type === 'pin') {
          pinIndex++
          return { ...a, label: String(pinIndex) }
        }
        return a
      })
    })
  }, [])

  return { annotations, addPin, addStroke, undo, clear, clearRecordingAnnotations, pinCount }
}
