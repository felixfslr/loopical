'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ExternalLink, Loader2, Globe, ShieldAlert, LogIn, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UrlEmbedProps {
  url: string
  metadata?: {
    title?: string
    description?: string
    image?: string
    embeddable?: boolean
    embedBlockReason?: string | null
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

const BLOCK_REASON_LABELS: Record<string, { icon: typeof ShieldAlert; label: string; detail: string }> = {
  x_frame_options_deny: {
    icon: ShieldAlert,
    label: 'Einbettung blockiert',
    detail: 'Diese Website blockiert die Anzeige in iFrames (X-Frame-Options: DENY).',
  },
  x_frame_options_sameorigin: {
    icon: ShieldAlert,
    label: 'Einbettung blockiert',
    detail: 'Diese Website erlaubt Einbettung nur auf der eigenen Domain (X-Frame-Options: SAMEORIGIN).',
  },
  csp_frame_ancestors_none: {
    icon: ShieldAlert,
    label: 'Einbettung blockiert',
    detail: 'Die Content-Security-Policy dieser Website verbietet die Einbettung.',
  },
  csp_frame_ancestors_self: {
    icon: ShieldAlert,
    label: 'Einbettung blockiert',
    detail: 'Diese Website erlaubt Einbettung nur auf der eigenen Domain.',
  },
  csp_frame_ancestors_restricted: {
    icon: ShieldAlert,
    label: 'Einbettung eingeschränkt',
    detail: 'Diese Website erlaubt Einbettung nur auf bestimmten Domains.',
  },
  meta_x_frame_options: {
    icon: ShieldAlert,
    label: 'Einbettung blockiert',
    detail: 'Diese Website blockiert die Anzeige in iFrames.',
  },
  js_frame_buster: {
    icon: AlertTriangle,
    label: 'Einbettung wird umgangen',
    detail: 'Diese Website erkennt iFrames und leitet auf sich selbst um.',
  },
  login_required: {
    icon: LogIn,
    label: 'Login erforderlich',
    detail: 'Diese Website leitet auf eine Login-Seite um. Öffne sie in einem neuen Tab.',
  },
  http_error: {
    icon: AlertTriangle,
    label: 'Seite nicht erreichbar',
    detail: 'Die Website konnte nicht geladen werden.',
  },
  fetch_failed: {
    icon: AlertTriangle,
    label: 'Verbindung fehlgeschlagen',
    detail: 'Die Website konnte nicht überprüft werden.',
  },
  iframe_load_failed: {
    icon: AlertTriangle,
    label: 'Einbettung fehlgeschlagen',
    detail: 'Die Website konnte im iFrame nicht geladen werden.',
  },
}

export function UrlEmbed({ url, metadata, className }: UrlEmbedProps) {
  const embedType = detectEmbedType(url)
  const knownEmbedUrl = getEmbedUrl(url, embedType)

  // Known embeddable services — direct iframe, no validation needed
  if (knownEmbedUrl) {
    return <KnownEmbed url={url} embedUrl={knownEmbedUrl} embedType={embedType} className={className} />
  }

  // Generic URL — validate + attempt iframe with fallback
  return <GenericUrlEmbed url={url} metadata={metadata} className={className} />
}

/** Iframe for known embeddable services (Figma, YouTube, etc.) */
function KnownEmbed({ url, embedUrl, embedType, className }: {
  url: string
  embedUrl: string
  embedType: EmbedType
  className?: string
}) {
  const [iframeLoaded, setIframeLoaded] = useState(false)

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
      <EmbedFooter url={url} label={embedType.replace('-', ' ')} />
    </div>
  )
}

/** Generic URL: server-checks embeddability, then tries iframe with client-side fallback */
function GenericUrlEmbed({ url, metadata, className }: {
  url: string
  metadata?: UrlEmbedProps['metadata']
  className?: string
}) {
  const [state, setState] = useState<'checking' | 'iframe' | 'blocked' | 'fallback'>('checking')
  const [ogData, setOgData] = useState(metadata ?? null)
  const [blockReason, setBlockReason] = useState<string | null>(metadata?.embedBlockReason ?? null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Server-side embeddability check
  useEffect(() => {
    if (metadata?.embeddable === true) {
      setState('iframe')
      return
    }
    if (metadata?.embeddable === false && metadata.embedBlockReason) {
      setBlockReason(metadata.embedBlockReason)
      setState('blocked')
      return
    }

    // No pre-fetched metadata — check via API
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((res) => res.json())
      .then((data) => {
        setOgData(data)
        if (data.embeddable === false) {
          setBlockReason(data.embedBlockReason)
          setState('blocked')
        } else {
          setState('iframe')
        }
      })
      .catch(() => {
        setState('iframe') // Optimistic — try iframe anyway
      })
  }, [url, metadata])

  // Client-side iframe load detection
  const handleIframeLoad = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
    // iframe loaded — but might be blank or error page
    // We can't inspect cross-origin iframe content, so we trust the load event
  }, [])

  const handleIframeError = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
    setBlockReason('iframe_load_failed')
    setState('fallback')
  }, [])

  // Set a timeout — if iframe doesn't load within 10s, show fallback option
  useEffect(() => {
    if (state !== 'iframe') return
    loadTimeoutRef.current = setTimeout(() => {
      // Don't auto-switch — just offer a button to fall back
    }, 10000)
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
    }
  }, [state])

  const effectiveOg = ogData || metadata
  let hostname = ''
  try { hostname = new URL(url).hostname } catch {}

  // Loading state
  if (state === 'checking') {
    return (
      <div className={`rounded-lg border p-8 text-center ${className ?? ''}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Prüfe Einbettbarkeit...</p>
      </div>
    )
  }

  // Blocked — show reason + preview card
  if (state === 'blocked') {
    const reason = BLOCK_REASON_LABELS[blockReason ?? '']
    const Icon = reason?.icon ?? ShieldAlert

    return (
      <div className={`rounded-lg border overflow-hidden ${className ?? ''}`}>
        {/* Block reason banner */}
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40">
          <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {reason?.label ?? 'Einbettung nicht möglich'}
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5">
              {reason?.detail ?? 'Diese Website kann nicht eingebettet werden.'}
            </p>
          </div>
        </div>
        <LinkPreviewCard url={url} og={effectiveOg} hostname={hostname} />
      </div>
    )
  }

  // Fallback — iframe failed after attempt
  if (state === 'fallback') {
    return (
      <div className={`rounded-lg border overflow-hidden ${className ?? ''}`}>
        <div className="flex items-start gap-3 px-4 py-3 bg-muted/50 border-b">
          <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Einbettung fehlgeschlagen</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Die Website konnte nicht im iFrame geladen werden.
            </p>
          </div>
        </div>
        <LinkPreviewCard url={url} og={effectiveOg} hostname={hostname} />
      </div>
    )
  }

  // Iframe attempt
  return (
    <div className={`rounded-lg overflow-hidden border bg-muted ${className ?? ''}`}>
      <div className="relative">
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full aspect-video"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{ border: 'none' }}
        />
      </div>
      <div className="px-3 py-2 flex items-center justify-between border-t bg-background/80">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="h-3 w-3" />
          {hostname}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setState('fallback')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Funktioniert nicht?
          </button>
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
    </div>
  )
}

/** OG link preview card (fallback when iframe blocked) */
function LinkPreviewCard({ url, og, hostname }: {
  url: string
  og?: UrlEmbedProps['metadata'] | null
  hostname: string
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block hover:bg-muted/30 transition-colors"
    >
      {og?.image && (
        <div className="aspect-video bg-muted overflow-hidden">
          <img src={og.image} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 space-y-1">
        <p className="font-medium text-sm line-clamp-1">
          {og?.title || url}
        </p>
        {og?.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {og.description}
          </p>
        )}
        <p className="text-xs text-primary flex items-center gap-1 mt-2">
          <ExternalLink className="h-3 w-3" />
          In neuem Tab öffnen — {hostname}
        </p>
      </div>
    </a>
  )
}

/** Footer bar for known embeds */
function EmbedFooter({ url, label }: { url: string; label: string }) {
  return (
    <div className="px-3 py-2 flex items-center justify-between border-t bg-background/80">
      <span className="text-xs text-muted-foreground capitalize">{label}</span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline flex items-center gap-1"
      >
        Öffnen <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}
