'use client'

import { useRef, useEffect, useMemo } from 'react'
import type { Sentiment } from '@/lib/types/database'

interface HeatPoint {
  x: number // 0-100 percentage
  y: number // 0-100 percentage
  sentiment: Sentiment
}

interface SentimentHeatmapProps {
  /** Image source URL */
  src: string
  alt: string
  /** Aggregated annotation points with sentiment */
  points: HeatPoint[]
  /** Heatmap opacity */
  opacity?: number
  className?: string
}

const sentimentColors: Record<Sentiment, [number, number, number]> = {
  critical: [239, 68, 68],  // red-500
  neutral: [234, 179, 8],   // yellow-500
  positive: [34, 197, 94],  // green-500
}

export function SentimentHeatmap({
  src,
  alt,
  points,
  opacity = 0.4,
  className,
}: SentimentHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // Pre-compute heatmap data
  const heatData = useMemo(() => {
    if (points.length === 0) return null

    // Group points into a grid (20x20 cells)
    const gridSize = 20
    const grid: { r: number; g: number; b: number; count: number }[][] = Array.from(
      { length: gridSize },
      () => Array.from({ length: gridSize }, () => ({ r: 0, g: 0, b: 0, count: 0 })),
    )

    for (const point of points) {
      const gx = Math.min(gridSize - 1, Math.floor((point.x / 100) * gridSize))
      const gy = Math.min(gridSize - 1, Math.floor((point.y / 100) * gridSize))

      // Apply Gaussian spread to neighboring cells
      const radius = 2
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = gx + dx
          const ny = gy + dy
          if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue

          const dist = Math.sqrt(dx * dx + dy * dy)
          const weight = Math.exp(-(dist * dist) / (2 * 0.8 * 0.8))

          const color = sentimentColors[point.sentiment]
          grid[ny][nx].r += color[0] * weight
          grid[ny][nx].g += color[1] * weight
          grid[ny][nx].b += color[2] * weight
          grid[ny][nx].count += weight
        }
      }
    }

    return grid
  }, [points])

  useEffect(() => {
    if (!canvasRef.current || !imgRef.current || !heatData) return

    const canvas = canvasRef.current
    const img = imgRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const rect = img.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const gridSize = heatData.length
      const cellW = canvas.width / gridSize
      const cellH = canvas.height / gridSize

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const cell = heatData[y][x]
          if (cell.count === 0) continue

          const r = Math.round(cell.r / cell.count)
          const g = Math.round(cell.g / cell.count)
          const b = Math.round(cell.b / cell.count)
          const alpha = Math.min(opacity, (cell.count / points.length) * opacity * 3)

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`

          // Draw a soft circle instead of a square
          const cx = x * cellW + cellW / 2
          const cy = y * cellH + cellH / 2
          const radius = Math.max(cellW, cellH) * 0.8

          const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`)
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

          ctx.fillStyle = gradient
          ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
        }
      }
    }

    // Render after image loads
    if (img.complete) {
      render()
    } else {
      img.addEventListener('load', render)
      return () => img.removeEventListener('load', render)
    }
  }, [heatData, opacity, points.length])

  // Re-render on resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && imgRef.current && heatData) {
        const rect = imgRef.current.getBoundingClientRect()
        canvasRef.current.width = rect.width
        canvasRef.current.height = rect.height
        // Trigger re-render via effect cleanup
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [heatData])

  if (points.length === 0) return null

  return (
    <div className={`relative inline-block ${className ?? ''}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-auto"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1 text-xs backdrop-blur">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Positiv
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          Neutral
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Kritisch
        </span>
      </div>
    </div>
  )
}
