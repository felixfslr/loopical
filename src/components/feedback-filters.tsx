'use client'

import { Button } from '@/components/ui/button'
import { ArrowUpDown, Filter } from 'lucide-react'
import type { ProcessingStatus, Sentiment } from '@/lib/types/database'

interface FeedbackFiltersProps {
  totalCount: number
  filteredCount: number
  filterSentiment: Sentiment | 'all'
  onFilterSentimentChange: (value: Sentiment | 'all') => void
  filterStatus: ProcessingStatus | 'all'
  onFilterStatusChange: (value: ProcessingStatus | 'all') => void
  sortOrder: 'newest' | 'oldest'
  onSortOrderChange: (value: 'newest' | 'oldest') => void
}

const sentimentOptions: { value: Sentiment | 'all'; label: string; color?: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'positive', label: 'Positiv', color: 'bg-green-500' },
  { value: 'neutral', label: 'Neutral', color: 'bg-yellow-500' },
  { value: 'critical', label: 'Kritisch', color: 'bg-red-500' },
]

const statusOptions: { value: ProcessingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'complete', label: 'Fertig' },
  { value: 'pending', label: 'Ausstehend' },
  { value: 'error', label: 'Fehler' },
]

export function FeedbackFilters({
  totalCount,
  filteredCount,
  filterSentiment,
  onFilterSentimentChange,
  filterStatus,
  onFilterStatusChange,
  sortOrder,
  onSortOrderChange,
}: FeedbackFiltersProps) {
  const hasActiveFilter = filterSentiment !== 'all' || filterStatus !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Sentiment filter */}
      <div className="flex items-center gap-1">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {sentimentOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFilterSentimentChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              filterSentiment === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {opt.color && (
              <span className={`h-1.5 w-1.5 rounded-full ${opt.color}`} />
            )}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onFilterStatusChange(opt.value)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              filterStatus === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sort toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 ml-auto"
        onClick={() => onSortOrderChange(sortOrder === 'newest' ? 'oldest' : 'newest')}
      >
        <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
        {sortOrder === 'newest' ? 'Neueste' : 'Älteste'}
      </Button>

      {/* Active filter indicator */}
      {hasActiveFilter && (
        <span className="text-xs text-muted-foreground">
          {filteredCount} von {totalCount}
        </span>
      )}
    </div>
  )
}
