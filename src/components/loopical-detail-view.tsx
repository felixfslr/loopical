'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { AnnotatedImage } from '@/components/annotated-image'
import { MediaRenderer } from '@/components/media-renderer'
import { FeedbackPointGroup } from '@/components/feedback-point-group'
import { FeedbackDetail } from '@/components/feedback-detail'
import { FeedbackFilters } from '@/components/feedback-filters'
import { FeedbackSubmitForm } from '@/components/feedback-submit-form'
import { OptimisticFeedbackCard } from '@/components/optimistic-feedback-card'
import { EmptyState } from '@/components/empty-state'
import { StatusSelector } from '@/components/status-selector'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Sparkles, Loader2, Check, Square, Link2, ExternalLink, Pencil, X as XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { toggleActionItem, updateContextUrl } from '@/app/(authenticated)/projects/[id]/loopicals/[loopicalId]/actions'
import { Input } from '@/components/ui/input'
import { useMemo } from 'react'
import { AnnotationPlayback } from '@/components/annotation-playback'
import type { ImageBounds, Marker } from '@/components/annotated-image'
import type { ActionItem, Annotation, ProcessingStatus, Sentiment, WordTimestamp, LoopicalStatus } from '@/lib/types/database'

interface Entry {
  id: string
  audio_url: string | null
  video_url?: string | null
  media_type?: 'audio' | 'video'
  audio_duration_seconds: number | null
  transcript: string | null
  summary: string | null
  action_items: ActionItem[] | null
  sentiment: Sentiment | null
  tags: string[] | null
  word_timestamps: WordTimestamp[] | null
  processing_status: ProcessingStatus
  guest_name: string | null
  author_name: string | null
  created_at: string
  feedback_point_id: string | null
  annotations: Annotation[] | null
}

interface FeedbackPointData {
  id: string
  question_text: string | null
  question_audio_url: string | null
  question_transcript: string | null
  marker_x: number | null
  marker_y: number | null
  marker_media_index: number
  marker_viewport?: string
  order_index: number
  context_url: string | null
}

interface MediaData {
  id: string
  media_url: string
  media_type: string
  order_index: number
  metadata?: Record<string, unknown> | null
  thumbnail_url?: string | null
  ocr_text?: string | null
}

interface PaginationData {
  page: number
  pageSize: number
  totalCount: number
}

interface LoopicalDetailViewProps {
  loopical: {
    id: string
    title: string
    description: string | null
    status: LoopicalStatus
    feedback_mode: string | null
    media_url: string | null
    ai_summary: string | null
    ai_action_items: ActionItem[] | null
    ai_summary_updated_at: string | null
    context_url: string | null
  }
  projectId: string
  authorId: string
  entries: Entry[]
  feedbackPoints: FeedbackPointData[]
  mediaItems: MediaData[]
  pagination?: PaginationData
}

export function LoopicalDetailView({
  loopical,
  projectId,
  authorId,
  entries,
  feedbackPoints,
  mediaItems,
  pagination,
}: LoopicalDetailViewProps) {
  const router = useRouter()
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [optimisticIds, setOptimisticIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [aiSummary, setAiSummary] = useState(loopical.ai_summary)
  const [aiActionItems, setAiActionItems] = useState<ActionItem[] | null>(loopical.ai_action_items)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [contextUrl, setContextUrl] = useState(loopical.context_url || '')
  const [isEditingUrl, setIsEditingUrl] = useState(false)
  const [filterSentiment, setFilterSentiment] = useState<Sentiment | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<ProcessingStatus | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterHasActionItems, setFilterHasActionItems] = useState(false)
  const [focusedEntryId, setFocusedEntryId] = useState<string | null>(null)

  const focusedEntry = focusedEntryId
    ? entries.find((e) => e.id === focusedEntryId)
    : null
  const focusedAnnotations: Annotation[] = (focusedEntry?.annotations as Annotation[] | null) ?? []

  // Build guest pin markers for focused entry (orange-styled)
  const guestPinMarkers: Marker[] = focusedAnnotations
    .filter((a): a is Extract<Annotation, { type: 'pin' }> =>
      a.type === 'pin' && a.media_index === currentMediaIndex,
    )
    .map((pin) => ({
      id: `guest-${pin.id}`,
      label: pin.label,
      x: pin.x,
      y: pin.y,
    }))

  const isGuided = loopical.feedback_mode === 'guided' && feedbackPoints.length > 0
  const hasMultipleMedia = mediaItems.length > 1
  const currentMedia = mediaItems[currentMediaIndex]

  // Build markers for current media
  const pointsForMedia = isGuided
    ? feedbackPoints.filter(
        (p) =>
          p.marker_x != null &&
          p.marker_y != null &&
          p.marker_media_index === currentMediaIndex,
      )
    : []

  const markersForImage = pointsForMedia.map((p) => ({
    id: p.id,
    label: p.question_text || 'Punkt',
    x: p.marker_x!,
    y: p.marker_y!,
  }))

  // Build iframe-specific markers (with viewport info)
  const iframeMarkers = currentMedia?.media_type === 'url'
    ? pointsForMedia.map((p) => ({
        id: p.id,
        label: p.question_text || 'Punkt',
        x: p.marker_x!,
        y: p.marker_y!,
        viewport: (p.marker_viewport || 'desktop') as 'desktop' | 'mobile',
      }))
    : undefined

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    let result = entries
      .filter((e) => filterSentiment === 'all' || e.sentiment === filterSentiment)
      .filter((e) => filterStatus === 'all' || e.processing_status === filterStatus)
      .filter((e) => {
        if (!query) return true
        return (
          e.transcript?.toLowerCase().includes(query) ||
          e.summary?.toLowerCase().includes(query) ||
          e.action_items?.some((a) => a.text.toLowerCase().includes(query)) ||
          e.guest_name?.toLowerCase().includes(query) ||
          e.author_name?.toLowerCase().includes(query)
        )
      })
      .filter((e) => {
        if (!filterHasActionItems) return true
        return e.action_items && e.action_items.length > 0
      })

    result.sort((a, b) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      return sortOrder === 'newest' ? tb - ta : ta - tb
    })

    return result
  }, [entries, filterSentiment, filterStatus, sortOrder, searchQuery, filterHasActionItems])

  // Group filtered entries by feedback point
  const entriesByPoint = new Map<string, Entry[]>()
  const ungroupedEntries: Entry[] = []

  for (const entry of filteredEntries) {
    if (entry.feedback_point_id) {
      const existing = entriesByPoint.get(entry.feedback_point_id) ?? []
      existing.push(entry)
      entriesByPoint.set(entry.feedback_point_id, existing)
    } else {
      ungroupedEntries.push(entry)
    }
  }

  async function handleGenerateSummary() {
    setIsGeneratingSummary(true)
    try {
      const res = await fetch(`/api/loopicals/${loopical.id}/summarize`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setAiSummary(data.summary)
      setAiActionItems(data.actionItems ?? null)
    } catch (err) {
      console.error('Summary generation failed:', err)
      toast.error('Zusammenfassung konnte nicht generiert werden.')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  function handleToggle(entryId: string, index: number) {
    startTransition(async () => {
      await toggleActionItem(entryId, index, projectId, loopical.id)
    })
  }

  function handleNewEntry(entryId: string) {
    setOptimisticIds((prev) => [entryId, ...prev])
  }

  function handleOptimisticComplete(entryId: string) {
    setOptimisticIds((prev) => prev.filter((id) => id !== entryId))
    router.refresh()
  }

  function handleMarkerClick(markerId: string) {
    const el = document.getElementById(`feedback-point-${markerId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const totalCount = entries.length + optimisticIds.length

  // Use media_url as fallback if no loopical_media
  const displayMediaUrl = currentMedia?.media_url ?? loopical.media_url

  return (
    <div className="md:grid md:grid-cols-[1fr_1.2fr] md:gap-0 md:min-h-[calc(100dvh-4rem)]">
      {/* Left panel — Image viewer (sticky on desktop) */}
      <div className="md:sticky md:top-16 md:self-start md:max-h-[calc(100dvh-4rem)] md:overflow-y-auto bg-muted/30 rounded-lg md:rounded-none">
        {displayMediaUrl ? (
          <div className="p-4">
            <MediaRenderer
              mediaUrl={displayMediaUrl}
              mediaType={currentMedia?.media_type ?? 'image'}
              alt={loopical.title}
              markers={[...markersForImage, ...guestPinMarkers]}
              onMarkerClick={handleMarkerClick}
              renderOverlay={focusedAnnotations.length > 0
                ? (bounds: ImageBounds) => (
                    <AnnotationPlayback
                      bounds={bounds}
                      annotations={focusedAnnotations}
                      mediaIndex={currentMediaIndex}
                    />
                  )
                : undefined
              }
              metadata={currentMedia?.metadata}
              ocrText={currentMedia?.ocr_text}
              iframeMarkers={iframeMarkers}
            />

            {/* Media navigation */}
            {hasMultipleMedia && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentMediaIndex((i) => Math.max(0, i - 1))}
                  disabled={currentMediaIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1">
                  {mediaItems.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentMediaIndex(i)}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        i === currentMediaIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentMediaIndex((i) => Math.min(mediaItems.length - 1, i + 1))}
                  disabled={currentMediaIndex === mediaItems.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Kein Bild vorhanden</p>
          </div>
        )}
      </div>

      {/* Right panel — Content */}
      <div className="p-4 md:p-6 space-y-6 md:overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{loopical.title}</h1>
            {loopical.description && (
              <p className="text-sm text-muted-foreground mt-2">{loopical.description}</p>
            )}
          </div>
          <StatusSelector
            loopicalId={loopical.id}
            projectId={projectId}
            currentStatus={loopical.status}
          />
        </div>

        {/* Context URL */}
        <div className="flex items-center gap-2 text-sm">
          <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
          {isEditingUrl ? (
            <form
              className="flex items-center gap-2 flex-1"
              onSubmit={async (e) => {
                e.preventDefault()
                const result = await updateContextUrl(loopical.id, projectId, contextUrl || null)
                if (result.error) {
                  toast.error(result.error)
                  return
                }
                setIsEditingUrl(false)
              }}
            >
              <Input
                type="url"
                value={contextUrl}
                onChange={(e) => setContextUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-sm flex-1"
                autoFocus
              />
              <Button type="submit" variant="outline" size="sm" className="h-8">
                Speichern
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setContextUrl(loopical.context_url || '')
                  setIsEditingUrl(false)
                }}
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </form>
          ) : loopical.context_url ? (
            <>
              <a
                href={loopical.context_url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-muted-foreground hover:text-foreground transition-colors"
              >
                {loopical.context_url}
              </a>
              <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              <button
                onClick={() => setIsEditingUrl(true)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditingUrl(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Live-URL hinzufügen
            </button>
          )}
        </div>

        {/* AI Summary */}
        {entries.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                KI-Gesamtzusammenfassung
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
              >
                {isGeneratingSummary ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                )}
                {aiSummary ? 'Aktualisieren' : 'Generieren'}
              </Button>
            </div>
            {aiSummary && (
              <>
                <p className="text-sm">{aiSummary}</p>
                {aiActionItems && aiActionItems.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      Konsolidierte Action Items
                    </p>
                    <ul className="space-y-1">
                      {aiActionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          {item.done ? (
                            <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <span>{item.text}</span>
                          {item.priority && (
                            <span className={`text-xs shrink-0 ${
                              item.priority === 'high' ? 'text-red-500' :
                              item.priority === 'medium' ? 'text-yellow-500' : 'text-muted-foreground'
                            }`}>
                              {item.priority}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {!aiSummary && !isGeneratingSummary && (
              <p className="text-xs text-muted-foreground">
                Generiere eine KI-Zusammenfassung über alle Feedbacks.
              </p>
            )}
          </div>
        )}

        {/* Feedback grouped by point (guided mode) */}
        {isGuided && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">
              Feedback nach Punkten ({totalCount})
            </h2>
            {entries.length > 0 && (
              <FeedbackFilters
                totalCount={entries.length}
                filteredCount={filteredEntries.length}
                filterSentiment={filterSentiment}
                onFilterSentimentChange={setFilterSentiment}
                filterStatus={filterStatus}
                onFilterStatusChange={setFilterStatus}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterHasActionItems={filterHasActionItems}
                onFilterHasActionItemsChange={setFilterHasActionItems}
              />
            )}
            {feedbackPoints.map((point, idx) => (
              <FeedbackPointGroup
                key={point.id}
                point={point}
                index={idx}
                entries={entriesByPoint.get(point.id) ?? []}
                onToggleActionItem={handleToggle}
              />
            ))}

            {/* Ungrouped entries (general feedback) */}
            {ungroupedEntries.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Allgemeines Feedback
                </h3>
                {ungroupedEntries.map((entry) => (
                  <FeedbackDetail
                    key={entry.id}
                    entry={entry}
                    onToggleActionItem={handleToggle}
                    onFocus={setFocusedEntryId}
                    isFocused={focusedEntryId === entry.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Flat list (open mode) */}
        {!isGuided && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Feedback ({totalCount})
            </h2>
            {entries.length > 0 && (
              <FeedbackFilters
                totalCount={entries.length}
                filteredCount={filteredEntries.length}
                filterSentiment={filterSentiment}
                onFilterSentimentChange={setFilterSentiment}
                filterStatus={filterStatus}
                onFilterStatusChange={setFilterStatus}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterHasActionItems={filterHasActionItems}
                onFilterHasActionItemsChange={setFilterHasActionItems}
              />
            )}

            {/* Optimistic Cards */}
            <AnimatePresence>
              {optimisticIds.map((id) => (
                <OptimisticFeedbackCard
                  key={id}
                  entryId={id}
                  onComplete={() => handleOptimisticComplete(id)}
                />
              ))}
            </AnimatePresence>

            {totalCount === 0 ? (
              <EmptyState
                title="Noch kein Feedback"
                description="Nimm das erste Voice-Feedback auf oder teile den Link mit deinem Team."
              />
            ) : filteredEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Keine Einträge für diesen Filter.
              </p>
            ) : (
              filteredEntries.map((entry) => (
                <FeedbackDetail
                  key={entry.id}
                  entry={entry}
                  onToggleActionItem={handleToggle}
                  onFocus={setFocusedEntryId}
                  isFocused={focusedEntryId === entry.id}
                />
              ))
            )}
          </div>
        )}

        {/* Optimistic cards for guided mode */}
        {isGuided && optimisticIds.length > 0 && (
          <AnimatePresence>
            {optimisticIds.map((id) => (
              <OptimisticFeedbackCard
                key={id}
                entryId={id}
                onComplete={() => handleOptimisticComplete(id)}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Pagination */}
        {pagination && pagination.totalCount > pagination.pageSize && (
          <PaginationBar
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalCount={pagination.totalCount}
          />
        )}

        {/* Record section */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Feedback aufnehmen</h2>
          <FeedbackSubmitForm
            loopicalId={loopical.id}
            authorId={authorId}
            onNewEntry={handleNewEntry}
          />
        </div>
      </div>
    </div>
  )
}

function PaginationBar({
  page,
  pageSize,
  totalCount,
}: {
  page: number
  pageSize: number
  totalCount: number
}) {
  const pathname = usePathname()
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-sm text-muted-foreground">
        Seite {page} von {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Button variant="outline" size="sm" render={<Link href={`${pathname}?page=${page - 1}`} />}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Zurück
          </Button>
        )}
        {page < totalPages && (
          <Button variant="outline" size="sm" render={<Link href={`${pathname}?page=${page + 1}`} />}>
            Weiter
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
