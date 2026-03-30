'use client'

import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'

interface UrlEmbedProps {
  url: string
  metadata?: {
    title?: string
    description?: string
    image?: string
    embed_type?: string
  } | null
  className?: string
}

type EmbedType = 'figma' | 'miro' | 'google-docs' | 'youtube' | 'generic'

function detectEmbedType(url: string): EmbedType {
  try {
    const u = new URL(url)
    if (u.hostname.includes('figma.com')) return 'figma'
    if (u.hostname.includes('miro.com')) return 'miro'
    if (u.hostname.includes('docs.google.com') || u.hostname.includes('sheets.google.com') || u.hostname.includes('slides.google.com')) return 'google-docs'
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) return 'youtube'
  } catch {
    // invalid URL
  }
  return 'generic'
}

function getEmbedUrl(url: string, type: EmbedType): string | null {
  try {
    const u = new URL(url)
    switch (type) {
      case 'figma':
        return `https://www.figma.com/embed?embed_host=loopical&url=${encodeURIComponent(url)}`
      case 'miro':
        return url.replace('/app/board/', '/app/live-embed/')
      case 'google-docs':
        // Google Docs/Sheets/Slides embed
        if (url.includes('/edit')) return url.replace('/edit', '/preview')
        if (url.includes('/pub')) return url
        return url + (url.includes('?') ? '&' : '?') + 'embedded=true'
      case 'youtube': {
        let videoId = u.searchParams.get('v')
        if (!videoId && u.hostname === 'youtu.be') videoId = u.pathname.slice(1)
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

export function UrlEmbed({ url, metadata, className }: UrlEmbedProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const embedType = detectEmbedType(url)
  const embedUrl = getEmbedUrl(url, embedType)

  // Embeddable service — show iframe
  if (embedUrl) {
    return (
      <div className={`relative rounded-lg overflow-hidden border bg-muted ${className ?? ''}`}>
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
        <div className="px-3 py-2 flex items-center justify-between border-t bg-background/80">
          <span className="text-xs text-muted-foreground capitalize">{embedType.replace('-', ' ')}</span>
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

  // Generic URL — show link preview card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block rounded-lg border overflow-hidden hover:border-primary/50 transition-colors ${className ?? ''}`}
    >
      {metadata?.image && (
        <div className="aspect-video bg-muted overflow-hidden">
          <img
            src={metadata.image}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4 space-y-1">
        <p className="font-medium text-sm line-clamp-1">
          {metadata?.title || url}
        </p>
        {metadata?.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {metadata.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          {new URL(url).hostname}
        </p>
      </div>
    </a>
  )
}
