'use client'

import dynamic from 'next/dynamic'
import { AnnotatedImage } from '@/components/annotated-image'
import type { ImageBounds, Marker } from '@/components/annotated-image'
import { AnnotatedIframe } from '@/components/annotated-iframe'
import type { IframeMarker, IframeViewport } from '@/components/annotated-iframe'
import { UrlEmbed } from '@/components/url-embed'
import { VideoPlayerContext } from '@/components/video-player-context'
import { DocumentViewer } from '@/components/document-viewer'
import { MarkdownViewer } from '@/components/markdown-viewer'
import type { PdfMarker } from '@/components/annotated-pdf'

// Dynamic imports for heavy components (client-only)
const PdfViewer = dynamic(() => import('@/components/pdf-viewer').then((m) => ({ default: m.PdfViewer })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
})

const AnnotatedPdf = dynamic(() => import('@/components/annotated-pdf').then((m) => ({ default: m.AnnotatedPdf })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
})

interface MediaRendererProps {
  mediaUrl: string
  mediaType: string
  alt?: string
  markers?: Marker[]
  activeMarkerId?: string
  onMarkerClick?: (markerId: string) => void
  renderOverlay?: (bounds: ImageBounds) => React.ReactNode
  metadata?: Record<string, unknown> | null
  ocrText?: string | null
  videoMarkers?: { id: string; timestampMs: number; label: string }[]
  pdfMarkers?: PdfMarker[]
  iframeMarkers?: IframeMarker[]
  onPageClick?: (x: number, y: number, page: number) => void
  onIframeClick?: (x: number, y: number, viewport: IframeViewport) => void
  editable?: boolean
  className?: string
}

export function MediaRenderer({
  mediaUrl,
  mediaType,
  alt = '',
  markers = [],
  activeMarkerId,
  onMarkerClick,
  renderOverlay,
  metadata,
  ocrText,
  videoMarkers,
  pdfMarkers,
  iframeMarkers,
  onPageClick,
  onIframeClick,
  editable,
  className,
}: MediaRendererProps) {
  switch (mediaType) {
    case 'image':
      return (
        <AnnotatedImage
          src={mediaUrl}
          alt={alt}
          markers={markers}
          activeMarkerId={activeMarkerId}
          onMarkerClick={onMarkerClick}
          renderOverlay={renderOverlay}
        />
      )

    case 'pdf':
      if (pdfMarkers && pdfMarkers.length > 0) {
        return (
          <AnnotatedPdf
            src={mediaUrl}
            markers={pdfMarkers}
            activeMarkerId={activeMarkerId}
            onMarkerClick={onMarkerClick}
            onPageClick={onPageClick}
            className={className}
          />
        )
      }
      return <PdfViewer src={mediaUrl} className={className} />

    case 'url':
      return (
        <AnnotatedIframe
          url={mediaUrl}
          markers={iframeMarkers}
          activeMarkerId={activeMarkerId}
          onMarkerClick={onMarkerClick}
          onIframeClick={onIframeClick}
          editable={editable}
          className={className}
        />
      )

    case 'video':
      return (
        <VideoPlayerContext
          src={mediaUrl}
          markers={videoMarkers}
          onMarkerClick={onMarkerClick}
          className={className}
        />
      )

    case 'document':
      return <DocumentViewer src={mediaUrl} className={className} />

    case 'markdown':
      return <MarkdownViewer content={ocrText || ''} className={className} />

    default:
      return (
        <AnnotatedImage
          src={mediaUrl}
          alt={alt}
          markers={markers}
          activeMarkerId={activeMarkerId}
          onMarkerClick={onMarkerClick}
          renderOverlay={renderOverlay}
        />
      )
  }
}
