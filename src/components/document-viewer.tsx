'use client'

import { useState } from 'react'
import { Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DocumentViewerProps {
  src: string
  filename?: string
  className?: string
}

export function DocumentViewer({ src, filename, className }: DocumentViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(src)}&embedded=true`

  if (error) {
    return (
      <div className={`rounded-lg border p-6 text-center ${className ?? ''}`}>
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground mb-3">
          Dokument-Vorschau nicht verfügbar.
        </p>
        <Button variant="outline" size="sm" render={<a href={src} target="_blank" rel="noopener noreferrer" />}>
          <Download className="mr-2 h-4 w-4" />
          {filename || 'Dokument herunterladen'}
        </Button>
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border bg-muted ${className ?? ''}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <iframe
        src={viewerUrl}
        className="w-full aspect-[3/4]"
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        style={{ border: 'none' }}
      />
      <div className="px-3 py-2 flex items-center justify-between border-t bg-background/80">
        <span className="text-xs text-muted-foreground truncate">
          {filename || 'Office-Dokument'}
        </span>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Download className="h-3 w-3" /> Herunterladen
        </a>
      </div>
    </div>
  )
}
