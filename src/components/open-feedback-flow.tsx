'use client'

import { useState } from 'react'
import { useAnnotations } from '@/hooks/use-annotations'
import { AnnotationOverlay } from '@/components/annotation-overlay'
import { MediaRenderer } from '@/components/media-renderer'
import { FeedbackSubmitForm } from '@/components/feedback-submit-form'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { Marker } from '@/components/annotated-image'
import type { Annotation } from '@/lib/types/database'

interface OpenFeedbackFlowProps {
  loopicalId: string
  loopicalTitle: string
  loopicalDescription: string | null
  contextUrl: string | null
  displayMediaUrl: string | null
  displayMediaType?: string
  displayMediaMetadata?: Record<string, unknown> | null
  existingMarkers: Marker[]
  shareToken: string
}

export function OpenFeedbackFlow({
  loopicalId,
  loopicalTitle,
  loopicalDescription,
  contextUrl,
  displayMediaUrl,
  displayMediaType = 'image',
  displayMediaMetadata,
  existingMarkers,
  shareToken,
}: OpenFeedbackFlowProps) {
  const {
    annotations,
    addPin,
    addStroke,
    undo,
    clear,
    clearRecordingAnnotations,
  } = useAnnotations()

  const [isRecording, setIsRecording] = useState(false)
  const [recordingStartMs, setRecordingStartMs] = useState<number | null>(null)
  const [isPreview, setIsPreview] = useState(false)

  return (
    <div className="min-h-dvh flex flex-col lg:grid lg:grid-cols-2">
      {/* Navigation bar (mobile only) */}
      <div className="flex items-center justify-between p-4 border-b lg:hidden">
        <Link
          href={`/feedback/${shareToken}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <h1 className="text-sm font-medium truncate mx-4">{loopicalTitle}</h1>
        <ThemeToggle />
      </div>

      {/* Document/Image panel — sticky on desktop */}
      <div className="bg-muted/30 order-1 lg:order-2 lg:sticky lg:top-0 lg:self-start lg:max-h-dvh lg:overflow-y-auto">
        {/* Title bar (desktop only) */}
        <div className="hidden lg:block p-6 border-b">
          <h1 className="text-lg font-bold tracking-tight">{loopicalTitle}</h1>
          {loopicalDescription && (
            <p className="text-sm text-muted-foreground mt-1">
              {loopicalDescription}
            </p>
          )}
        </div>

        {/* Media area — annotation overlay for images, MediaRenderer for other types */}
        <div className="flex items-center justify-center p-4 lg:p-6 lg:flex-1">
          {displayMediaUrl ? (
            displayMediaType === 'image' ? (
              <AnnotationOverlay
                src={displayMediaUrl}
                alt={loopicalTitle}
                existingMarkers={existingMarkers}
                activeMarkerId={loopicalId}
                annotations={annotations}
                onAddPin={addPin}
                onAddStroke={addStroke}
                onUndo={undo}
                isRecording={isRecording}
                recordingStartMs={recordingStartMs}
                editable={!isPreview}
                className="w-full max-h-[50vh] lg:max-h-none"
              />
            ) : (
              <div className="w-full">
                <MediaRenderer
                  mediaUrl={displayMediaUrl}
                  mediaType={displayMediaType}
                  alt={loopicalTitle}
                  metadata={displayMediaMetadata}
                />
              </div>
            )
          ) : (
            <div className="py-8">
              <p className="text-muted-foreground text-sm">
                Kein Dokument vorhanden
              </p>
            </div>
          )}
        </div>

        {/* Description (mobile) */}
        {loopicalDescription && (
          <div className="px-4 pb-4 lg:hidden">
            <p className="text-sm text-muted-foreground">
              {loopicalDescription}
            </p>
          </div>
        )}
      </div>

      {/* Recording panel */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 lg:p-8 order-2 lg:order-1 bg-gradient-to-b from-muted/50 to-background">
        {/* Desktop nav */}
        <Link
          href={`/feedback/${shareToken}`}
          className="hidden lg:inline-flex absolute top-4 left-4 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <div className="hidden lg:block absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm space-y-4">
          {contextUrl && (
            <div className="flex justify-center">
              <a
                href={contextUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Live ansehen
              </a>
            </div>
          )}
          <FeedbackSubmitForm
            loopicalId={loopicalId}
            showGuestName
            variant="standalone"
            annotations={annotations}
            onRecordingStateChange={(recording, startMs) => {
              setIsRecording(recording)
              setRecordingStartMs(recording ? startMs : null)
            }}
            onPreviewStateChange={setIsPreview}
            onReRecord={clearRecordingAnnotations}
            onSuccess={clear}
          />
        </div>

        {/* Footer */}
        <p className="mt-8 lg:absolute lg:bottom-4 text-xs text-muted-foreground">
          Powered by{' '}
          <span className="font-medium text-foreground">Loopical</span>
        </p>
      </div>
    </div>
  )
}
