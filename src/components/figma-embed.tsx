'use client'

import { useState } from 'react'
import { ExternalLink, Eye, Pencil, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnnotatedImage } from '@/components/annotated-image'
import type { Marker } from '@/components/annotated-image'

interface FigmaEmbedProps {
  url: string
  screenshotUrl?: string | null
  markers?: Marker[]
  activeMarkerId?: string
  onMarkerClick?: (markerId: string) => void
  className?: string
}

export function FigmaEmbed({
  url,
  screenshotUrl,
  markers = [],
  activeMarkerId,
  onMarkerClick,
  className,
}: FigmaEmbedProps) {
  const [mode, setMode] = useState<'embed' | 'annotate'>(screenshotUrl ? 'annotate' : 'embed')
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const embedUrl = `https://www.figma.com/embed?embed_host=loopical&url=${encodeURIComponent(url)}`

  return (
    <div className={`rounded-lg overflow-hidden border bg-muted ${className ?? ''}`}>
      {/* Mode toggle (only if screenshot available) */}
      {screenshotUrl && (
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-background/80">
          <Button
            variant={mode === 'annotate' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode('annotate')}
          >
            <Pencil className="mr-1.5 h-3 w-3" />
            Annotieren
          </Button>
          <Button
            variant={mode === 'embed' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setMode('embed')}
          >
            <Eye className="mr-1.5 h-3 w-3" />
            Live-Ansicht
          </Button>
        </div>
      )}

      {mode === 'embed' ? (
        <div className="relative">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <iframe
            src={embedUrl}
            className="w-full aspect-video"
            allowFullScreen
            onLoad={() => setIframeLoaded(true)}
            style={{ border: 'none' }}
          />
        </div>
      ) : screenshotUrl ? (
        <div className="p-2">
          <AnnotatedImage
            src={screenshotUrl}
            alt="Figma Design"
            markers={markers}
            activeMarkerId={activeMarkerId}
            onMarkerClick={onMarkerClick}
          />
        </div>
      ) : null}

      <div className="px-3 py-2 flex items-center justify-between border-t bg-background/80">
        <span className="text-xs text-muted-foreground">Figma</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          In Figma öffnen <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
