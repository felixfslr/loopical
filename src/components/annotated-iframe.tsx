'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Monitor, Smartphone, Loader2, ExternalLink, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type IframeViewport = 'desktop' | 'mobile'

export interface IframeMarker {
  id: string
  label: string
  x: number // percentage 0-100
  y: number // percentage 0-100
  viewport: IframeViewport
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, label: 'Desktop' },
  mobile: { width: 375, height: 812, label: 'Mobile' },
} as const

interface AnnotatedIframeProps {
  url: string
  markers?: IframeMarker[]
  activeMarkerId?: string
  onMarkerClick?: (markerId: string) => void
  onIframeClick?: (x: number, y: number, viewport: IframeViewport) => void
  editable?: boolean
  defaultViewport?: IframeViewport
  className?: string
}

export function AnnotatedIframe({
  url,
  markers = [],
  activeMarkerId,
  onMarkerClick,
  onIframeClick,
  editable = false,
  defaultViewport = 'desktop',
  className,
}: AnnotatedIframeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<IframeViewport>(defaultViewport)
  const [scale, setScale] = useState(1)
  const [desktopLoaded, setDesktopLoaded] = useState(false)
  const [mobileLoaded, setMobileLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const vp = VIEWPORTS[viewport]
  const iframeLoaded = viewport === 'desktop' ? desktopLoaded : mobileLoaded
  const markersForViewport = markers.filter((m) => m.viewport === viewport)

  // Calculate scale to fit the fixed-size iframe into the container
  const updateScale = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const containerWidth = container.clientWidth
    const newScale = Math.min(containerWidth / vp.width, 1)
    setScale(newScale)
  }, [vp.width])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(updateScale)
    observer.observe(container)
    updateScale()
    return () => observer.disconnect()
  }, [updateScale])

  // Timeout — if neither iframe loads in 15s, show error
  useEffect(() => {
    if (desktopLoaded || mobileLoaded || loadFailed) return
    const t = setTimeout(() => {
      if (!desktopLoaded && !mobileLoaded) setLoadFailed(true)
    }, 15000)
    return () => clearTimeout(t)
  }, [desktopLoaded, mobileLoaded, loadFailed])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!editable || !onIframeClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    if (x < 0 || x > 100 || y < 0 || y > 100) return
    onIframeClick(x, y, viewport)
  }

  const scaledHeight = vp.height * scale

  let hostname = ''
  try { hostname = new URL(url).hostname } catch {}

  if (loadFailed) {
    return (
      <div className={cn('rounded-lg border overflow-hidden', className)}>
        <ViewportToggle viewport={viewport} onViewportChange={setViewport} />
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">Website konnte nicht geladen werden.</p>
          <p className="text-xs text-muted-foreground/60 mb-4">Die Seite blockiert möglicherweise die Einbettung.</p>
          <Button variant="outline" size="sm" render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
            <ExternalLink className="mr-2 h-4 w-4" />
            In neuem Tab öffnen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border overflow-hidden bg-muted', className)}>
      {/* Viewport toggle */}
      <ViewportToggle viewport={viewport} onViewportChange={setViewport} />

      {/* Iframe container with fixed dimensions + scaling */}
      <div
        ref={containerRef}
        className="relative overflow-hidden bg-white"
        style={{ height: scaledHeight }}
      >
        {/* Loading spinner — only when active viewport hasn't loaded */}
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-muted">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{vp.label}-Ansicht wird geladen...</p>
            </div>
          </div>
        )}

        {/* Both iframes rendered simultaneously, only active one visible.
            This avoids re-loading when switching viewports. */}
        {(['desktop', 'mobile'] as const).map((vk) => {
          const vpDef = VIEWPORTS[vk]
          const isActive = vk === viewport
          const vpScale = isActive ? scale : Math.min((containerRef.current?.clientWidth ?? vpDef.width) / vpDef.width, 1)
          return (
            <div
              key={vk}
              style={{
                display: isActive ? 'block' : 'none',
              }}
            >
              <div
                style={{
                  width: vpDef.width,
                  height: vpDef.height,
                  transform: `scale(${isActive ? scale : 0})`,
                  transformOrigin: 'top left',
                }}
              >
                <iframe
                  src={url}
                  width={vpDef.width}
                  height={vpDef.height}
                  style={{ border: 'none', display: 'block' }}
                  referrerPolicy="no-referrer-when-downgrade"
                  onLoad={() => {
                    if (vk === 'desktop') setDesktopLoaded(true)
                    else setMobileLoaded(true)
                  }}
                  onError={() => setLoadFailed(true)}
                />
              </div>
            </div>
          )
        })}

        {/* Marker overlay — pointer-events only in editable mode */}
        <div
          className={cn(
            'absolute top-0 left-0 z-10',
            editable ? 'cursor-crosshair' : 'pointer-events-none',
          )}
          style={{
            width: vp.width * scale,
            height: vp.height * scale,
          }}
          onClick={handleOverlayClick}
        >
          {/* Render markers — always pointer-events-auto so they're clickable */}
          {markersForViewport.map((marker, index) => {
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
                animate={isActive ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={isActive ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } : undefined}
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
          {editable && markersForViewport.length === 0 && iframeLoaded && (
            <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
              <span className="text-xs text-muted-foreground bg-background/90 px-3 py-1.5 rounded-full shadow-sm">
                Klicke auf die Seite, um einen Marker zu setzen
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 flex items-center justify-between border-t bg-background/80">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {viewport === 'mobile' ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
          {hostname} — {vp.width}×{vp.height}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Öffnen <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

function ViewportToggle({ viewport, onViewportChange }: {
  viewport: IframeViewport
  onViewportChange: (vp: IframeViewport) => void
}) {
  return (
    <div className="flex items-center justify-center gap-1 px-3 py-2 border-b bg-background/80">
      <Button
        variant={viewport === 'desktop' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 text-xs"
        onClick={() => onViewportChange('desktop')}
      >
        <Monitor className="mr-1.5 h-3 w-3" />
        Desktop
      </Button>
      <Button
        variant={viewport === 'mobile' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 text-xs"
        onClick={() => onViewportChange('mobile')}
      >
        <Smartphone className="mr-1.5 h-3 w-3" />
        Mobile
      </Button>
    </div>
  )
}
