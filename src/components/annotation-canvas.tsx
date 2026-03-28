'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { AnnotationStroke } from '@/lib/types/database'
import type { ImageBounds } from '@/components/annotated-image'

interface AnnotationCanvasProps {
  bounds: ImageBounds
  strokes: AnnotationStroke[]
  isDrawing: boolean
  onStrokeComplete: (points: { x: number; y: number }[]) => void
}

export function AnnotationCanvas({
  bounds,
  strokes,
  isDrawing,
  onStrokeComplete,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentPointsRef = useRef<{ x: number; y: number }[]>([])
  const isDrawingStrokeRef = useRef(false)

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

  // Convert pointer event to normalized 0-100 coordinates
  const toNormalized = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null

      const rect = canvas.getBoundingClientRect()
      const px = clientX - rect.left
      const py = clientY - rect.top

      const x = (px / rect.width) * 100
      const y = (py / rect.height) * 100

      if (x < 0 || x > 100 || y < 0 || y > 100) return null
      return { x, y }
    },
    [],
  )

  // Draw all strokes + current in-progress stroke
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const w = bounds.width * dpr
    const h = bounds.height * dpr

    function drawStrokePoints(
      points: { x: number; y: number }[],
      color: string,
      width: number,
    ) {
      if (points.length < 2) return
      ctx!.beginPath()
      ctx!.strokeStyle = color
      ctx!.lineWidth = (width / 100) * w
      ctx!.lineCap = 'round'
      ctx!.lineJoin = 'round'
      ctx!.globalAlpha = 0.7

      ctx!.moveTo((points[0].x / 100) * w, (points[0].y / 100) * h)
      for (let i = 1; i < points.length; i++) {
        ctx!.lineTo((points[i].x / 100) * w, (points[i].y / 100) * h)
      }
      ctx!.stroke()
      ctx!.globalAlpha = 1
    }

    // Render saved strokes
    for (const stroke of strokes) {
      drawStrokePoints(stroke.points, stroke.color, stroke.width)
    }

    // Render current in-progress stroke
    if (currentPointsRef.current.length >= 2) {
      drawStrokePoints(currentPointsRef.current, '#ef4444', 0.4)
    }
  }, [bounds, strokes, dpr])

  // Re-render when strokes or bounds change
  useEffect(() => {
    render()
  }, [render])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return
      e.preventDefault()

      const canvas = canvasRef.current
      if (!canvas) return

      canvas.setPointerCapture(e.pointerId)
      isDrawingStrokeRef.current = true
      currentPointsRef.current = []

      const pt = toNormalized(e.clientX, e.clientY)
      if (pt) currentPointsRef.current.push(pt)
    },
    [isDrawing, toNormalized],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingStrokeRef.current) return
      e.preventDefault()

      const pt = toNormalized(e.clientX, e.clientY)
      if (pt) {
        currentPointsRef.current.push(pt)
        render()
      }
    },
    [toNormalized, render],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingStrokeRef.current) return
      e.preventDefault()

      isDrawingStrokeRef.current = false

      const canvas = canvasRef.current
      if (canvas) canvas.releasePointerCapture(e.pointerId)

      if (currentPointsRef.current.length >= 2) {
        onStrokeComplete([...currentPointsRef.current])
      }
      currentPointsRef.current = []
      render()
    },
    [onStrokeComplete, render],
  )

  return (
    <canvas
      ref={canvasRef}
      width={bounds.width * dpr}
      height={bounds.height * dpr}
      className="absolute inset-0 w-full h-full"
      style={{
        touchAction: isDrawing ? 'none' : 'auto',
        cursor: isDrawing ? 'crosshair' : 'default',
        pointerEvents: isDrawing ? 'auto' : 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  )
}
