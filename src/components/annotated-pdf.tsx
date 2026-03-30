'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export interface PdfMarker {
  id: string
  label: string
  x: number // percentage 0-100
  y: number // percentage 0-100
  page: number // 0-based page index
}

interface AnnotatedPdfProps {
  src: string
  markers?: PdfMarker[]
  activeMarkerId?: string
  onMarkerClick?: (markerId: string) => void
  onPageClick?: (x: number, y: number, page: number) => void
  currentPage?: number
  onPageChange?: (page: number) => void
  className?: string
}

export function AnnotatedPdf({
  src,
  markers = [],
  activeMarkerId,
  onMarkerClick,
  onPageClick,
  currentPage,
  onPageChange,
  className,
}: AnnotatedPdfProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const [numPages, setNumPages] = useState(0)
  const [internalPage, setInternalPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [pageBounds, setPageBounds] = useState<{ width: number; height: number } | null>(null)

  const page = currentPage ?? internalPage
  const setPage = onPageChange ?? setInternalPage
  const pageIndex = page - 1 // 0-based

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n)
  }, [])

  // Update page bounds when page renders
  const updateBounds = useCallback(() => {
    const canvas = pageRef.current?.querySelector('canvas')
    if (canvas) {
      setPageBounds({ width: canvas.offsetWidth, height: canvas.offsetHeight })
    }
  }, [])

  useEffect(() => {
    const observer = new ResizeObserver(updateBounds)
    if (pageRef.current) observer.observe(pageRef.current)
    return () => observer.disconnect()
  }, [updateBounds])

  const markersForPage = markers.filter((m) => m.page === pageIndex)

  function handlePageClick(e: React.MouseEvent) {
    if (!onPageClick || !pageBounds) return
    const canvas = pageRef.current?.querySelector('canvas')
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    onPageClick(x, y, pageIndex)
  }

  return (
    <div className={className}>
      <Document
        file={src}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
        error={
          <div className="text-center py-12 text-sm text-muted-foreground">
            <p>PDF konnte nicht geladen werden.</p>
            <a href={src} target="_blank" rel="noopener noreferrer" className="text-primary underline mt-2">
              PDF herunterladen
            </a>
          </div>
        }
      >
        <div
          ref={pageRef}
          className="relative mx-auto inline-block cursor-crosshair"
          onClick={handlePageClick}
        >
          <Page
            pageNumber={page}
            scale={scale}
            renderTextLayer
            renderAnnotationLayer
            onRenderSuccess={updateBounds}
          />

          {/* Marker overlay */}
          {pageBounds && markersForPage.map((marker) => {
            const isActive = marker.id === activeMarkerId
            return (
              <motion.button
                key={marker.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute z-10"
                style={{
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                  transform: 'translate(-50%, -100%)',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkerClick?.(marker.id)
                }}
                title={marker.label}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shadow-md transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/50'
                      : 'bg-white text-gray-800 border border-gray-300 hover:bg-primary hover:text-primary-foreground'
                  }`}
                >
                  {marker.label.charAt(0).toUpperCase()}
                </div>
              </motion.button>
            )
          })}
        </div>
      </Document>

      {/* Controls */}
      {numPages > 0 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {numPages > 1 && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {page} / {numPages}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPage(Math.min(numPages, page + 1))} disabled={page >= numPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale((s) => Math.min(3, s + 0.25))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
