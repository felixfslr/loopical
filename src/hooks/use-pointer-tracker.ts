'use client'

import { useRef, useCallback, useEffect } from 'react'

export interface PointerPoint {
  x: number // percentage 0-100
  y: number // percentage 0-100
  t: number // timestamp_ms relative to recording start
}

export interface PointerTrail {
  type: 'pointer_trail'
  id: string
  points: PointerPoint[]
  media_index: number
  timestamp_ms: 0
}

const SAMPLE_RATE_MS = 100 // 10 Hz

interface UsePointerTrackerOptions {
  /** Whether tracking is currently active */
  isTracking: boolean
  /** Timestamp when recording started (Date.now()) */
  recordingStartMs: number | null
  /** The media element to track relative to */
  mediaRef: React.RefObject<HTMLElement | null>
  /** Current media index */
  mediaIndex?: number
}

export function usePointerTracker({
  isTracking,
  recordingStartMs,
  mediaRef,
  mediaIndex = 0,
}: UsePointerTrackerOptions) {
  const pointsRef = useRef<PointerPoint[]>([])
  const lastSampleRef = useRef(0)

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isTracking || !recordingStartMs || !mediaRef.current) return

      const now = Date.now()
      if (now - lastSampleRef.current < SAMPLE_RATE_MS) return
      lastSampleRef.current = now

      const rect = mediaRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      // Only record if pointer is within the media bounds
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        pointsRef.current.push({
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          t: now - recordingStartMs,
        })
      }
    },
    [isTracking, recordingStartMs, mediaRef],
  )

  useEffect(() => {
    if (!isTracking) return

    const el = mediaRef.current
    if (!el) return

    el.addEventListener('pointermove', handlePointerMove)
    return () => {
      el.removeEventListener('pointermove', handlePointerMove)
    }
  }, [isTracking, handlePointerMove, mediaRef])

  // Reset points when tracking starts
  useEffect(() => {
    if (isTracking) {
      pointsRef.current = []
    }
  }, [isTracking])

  const getPointerTrail = useCallback((): PointerTrail | null => {
    if (pointsRef.current.length < 2) return null
    return {
      type: 'pointer_trail',
      id: `trail-${Date.now()}`,
      points: [...pointsRef.current],
      media_index: mediaIndex,
      timestamp_ms: 0,
    }
  }, [mediaIndex])

  const clear = useCallback(() => {
    pointsRef.current = []
  }, [])

  return { getPointerTrail, clear, pointCount: pointsRef.current.length }
}
