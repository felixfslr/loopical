'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { Annotation, AnnotationStroke } from '@/lib/types/database'
import type { ImageBounds } from '@/components/annotated-image'

interface AnnotationPlaybackProps {
  bounds: ImageBounds
  annotations: Annotation[]
  mediaIndex?: number
}

/**
 * Read-only overlay that renders all guest annotations (pins + strokes)
 * on the image. Used on the review/detail side.
 *
 * Pins are rendered as DOM elements (orange circles) by the parent.
 * This component only renders strokes on a canvas.
 */
export function AnnotationPlayback({
  bounds,
  annotations,
  mediaIndex = 0,
}: AnnotationPlaybackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

  const strokes = annotations.filter(
    (a): a is AnnotationStroke => a.type === 'stroke' && a.media_index === mediaIndex,
  )

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const w = bounds.width * dpr
    const h = bounds.height * dpr

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = (stroke.width / 100) * w
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = 0.7

      ctx.moveTo((stroke.points[0].x / 100) * w, (stroke.points[0].y / 100) * h)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo((stroke.points[i].x / 100) * w, (stroke.points[i].y / 100) * h)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }, [bounds, strokes, dpr])

  useEffect(() => {
    render()
  }, [render])

  if (strokes.length === 0) return null

  return (
    <canvas
      ref={canvasRef}
      width={bounds.width * dpr}
      height={bounds.height * dpr}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  )
}
