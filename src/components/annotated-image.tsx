'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Marker {
  id: string
  label: string
  x: number // percentage 0-100 relative to image content
  y: number // percentage 0-100 relative to image content
}

interface ImageBounds {
  x: number
  y: number
  width: number
  height: number
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
  const imgRef = useRef<HTMLImageElement>(null)
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null)

  const updateImageBounds = useCallback(() => {
    const img = imgRef.current
    const container = containerRef.current
    if (!img || !container || !img.naturalWidth) return

    const containerRect = container.getBoundingClientRect()
    const naturalRatio = img.naturalWidth / img.naturalHeight
    const containerRatio = containerRect.width / containerRect.height

    let renderWidth: number
    let renderHeight: number

    if (naturalRatio > containerRatio) {
      // Image is wider than container — fits width, letterboxed top/bottom
      renderWidth = containerRect.width
      renderHeight = containerRect.width / naturalRatio
    } else {
      // Image is taller than container — fits height, letterboxed left/right
      renderHeight = containerRect.height
      renderWidth = containerRect.height * naturalRatio
    }

    setImageBounds({
      x: (containerRect.width - renderWidth) / 2,
      y: (containerRect.height - renderHeight) / 2,
      width: renderWidth,
      height: renderHeight,
    })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(updateImageBounds)
    observer.observe(container)
    return () => observer.disconnect()
  }, [updateImageBounds])

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!editable || !onImageClick || !imageBounds) return

    // Don't trigger if clicking a marker
    if ((e.target as HTMLElement).closest('[data-marker]')) return

    const containerRect = containerRef.current!.getBoundingClientRect()
    const clickX = e.clientX - containerRect.left
    const clickY = e.clientY - containerRect.top

    // Convert to percentage relative to image bounds
    const x = ((clickX - imageBounds.x) / imageBounds.width) * 100
    const y = ((clickY - imageBounds.y) / imageBounds.height) * 100

    // Only register clicks within the image area
    if (x < 0 || x > 100 || y < 0 || y > 100) return

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
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
        draggable={false}
        onLoad={updateImageBounds}
      />

      {/* Marker overlay — positioned to match actual image bounds */}
      {imageBounds && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: imageBounds.x,
            top: imageBounds.y,
            width: imageBounds.width,
            height: imageBounds.height,
          }}
        >
          {markers.map((marker, index) => {
            const isActive = marker.id === activeMarkerId
            return (
              <motion.div
                key={marker.id}
                data-marker
                className={cn(
                  'absolute flex items-center justify-center rounded-full text-xs font-bold cursor-pointer select-none pointer-events-auto',
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
                ref={(el) => {
                  if (isActive && el) {
                    // Delay slightly to let layout settle after image/animation change
                    requestAnimationFrame(() => {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
                    })
                  }
                }}
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
        </div>
      )}

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
