'use client'

import { useState, useEffect, useRef } from 'react'
import type { PointerPoint } from '@/hooks/use-pointer-tracker'

interface PointerTrailPlaybackProps {
  /** Array of pointer points with {x, y, t} */
  points: PointerPoint[]
  /** Current playback time in ms (synced to audio player) */
  currentTimeMs: number
  /** Whether audio is currently playing */
  isPlaying: boolean
  /** Container bounds (width/height of the media element) */
  className?: string
}

export function PointerTrailPlayback({
  points,
  currentTimeMs,
  isPlaying,
  className,
}: PointerTrailPlaybackProps) {
  const [currentPoint, setCurrentPoint] = useState<PointerPoint | null>(null)
  const trailRef = useRef<PointerPoint[]>([])

  useEffect(() => {
    if (!isPlaying || points.length === 0) {
      setCurrentPoint(null)
      trailRef.current = []
      return
    }

    // Find the closest point to current time
    let closest: PointerPoint | null = null
    for (const p of points) {
      if (p.t <= currentTimeMs) {
        closest = p
      } else {
        break // points are sorted by time
      }
    }

    if (closest && Math.abs(closest.t - currentTimeMs) < 500) {
      setCurrentPoint(closest)
      // Keep trail of last 20 points for fade effect
      trailRef.current = points.filter(
        (p) => p.t <= currentTimeMs && p.t > currentTimeMs - 2000,
      ).slice(-20)
    } else {
      setCurrentPoint(null)
      trailRef.current = []
    }
  }, [currentTimeMs, isPlaying, points])

  if (!currentPoint) return null

  return (
    <div className={`absolute inset-0 pointer-events-none ${className ?? ''}`}>
      {/* Trail dots (fading) */}
      {trailRef.current.map((p, i) => {
        const age = currentTimeMs - p.t
        const opacity = Math.max(0.05, 1 - age / 2000)
        const size = Math.max(3, 8 - (age / 2000) * 5)
        return (
          <div
            key={`${p.t}-${i}`}
            className="absolute rounded-full bg-blue-500"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: size,
              height: size,
              opacity,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )
      })}

      {/* Current cursor */}
      <div
        className="absolute"
        style={{
          left: `${currentPoint.x}%`,
          top: `${currentPoint.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="h-4 w-4 rounded-full border-2 border-blue-500 bg-blue-500/30 animate-pulse" />
      </div>
    </div>
  )
}
