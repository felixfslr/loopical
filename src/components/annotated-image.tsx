'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Marker {
  id: string
  label: string
  x: number // percentage 0-100
  y: number // percentage 0-100
}

interface AnnotatedImageProps {
  src: string
  alt: string
  markers: Marker[]
  activeMarkerId?: string
  onImageClick?: (x: number, y: number) => void
  onMarkerClick?: (markerId: string) => void
  editable?: boolean
  className?: string
}

export function AnnotatedImage({
  src,
  alt,
  markers,
  activeMarkerId,
  onImageClick,
  onMarkerClick,
  editable = false,
  className,
}: AnnotatedImageProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!editable || !onImageClick || !containerRef.current) return

    // Don't trigger if clicking a marker
    if ((e.target as HTMLElement).closest('[data-marker]')) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onImageClick(x, y)
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-lg',
        editable && 'cursor-crosshair',
        className,
      )}
      onClick={handleClick}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
        draggable={false}
      />

      {/* Markers */}
      {markers.map((marker, index) => {
        const isActive = marker.id === activeMarkerId
        return (
          <motion.div
            key={marker.id}
            data-marker
            className={cn(
              'absolute flex items-center justify-center rounded-full text-xs font-bold cursor-pointer select-none',
              'h-7 w-7 -translate-x-1/2 -translate-y-1/2',
              isActive
                ? 'bg-primary text-primary-foreground shadow-lg z-10'
                : 'bg-background text-foreground border border-border shadow-md hover:scale-110 transition-transform',
            )}
            style={{
              left: `${marker.x}%`,
              top: `${marker.y}%`,
            }}
            animate={
              isActive
                ? { scale: [1, 1.3, 1] }
                : { scale: 1 }
            }
            transition={
              isActive
                ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
                : undefined
            }
            onClick={(e) => {
              e.stopPropagation()
              onMarkerClick?.(marker.id)
            }}
            title={marker.label}
          >
            {index + 1}
          </motion.div>
        )
      })}

      {/* Editable hint */}
      {editable && markers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none">
          <span className="text-xs text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full">
            Klicke auf das Bild, um einen Marker zu setzen
          </span>
        </div>
      )}
    </div>
  )
}
