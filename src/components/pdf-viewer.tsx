'use client'

import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerProps {
  src: string
  currentPage?: number
  onPageChange?: (page: number) => void
  className?: string
}

export function PdfViewer({ src, currentPage, onPageChange, className }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [internalPage, setInternalPage] = useState(1)
  const [scale, setScale] = useState(1)
  const [loading, setLoading] = useState(true)

  const page = currentPage ?? internalPage
  const setPage = onPageChange ?? setInternalPage

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n)
    setLoading(false)
  }, [])

  function goToPrev() {
    if (page > 1) setPage(page - 1)
  }

  function goToNext() {
    if (page < numPages) setPage(page + 1)
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
          <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
            <p>PDF konnte nicht geladen werden.</p>
            <a href={src} target="_blank" rel="noopener noreferrer" className="text-primary underline mt-2">
              PDF herunterladen
            </a>
          </div>
        }
      >
        <Page
          pageNumber={page}
          scale={scale}
          className="mx-auto"
          renderTextLayer
          renderAnnotationLayer
        />
      </Document>

      {/* Controls */}
      {!loading && numPages > 0 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {numPages > 1 && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrev} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {page} / {numPages}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext} disabled={page >= numPages}>
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
