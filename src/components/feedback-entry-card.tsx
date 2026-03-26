import { Badge } from '@/components/ui/badge'
import { User, Clock } from 'lucide-react'
import type { ProcessingStatus, Sentiment } from '@/lib/types/database'

const sentimentConfig = {
  positive: { label: 'Positiv', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  neutral: { label: 'Neutral', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  critical: { label: 'Kritisch', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
} as const

const statusLabels: Record<ProcessingStatus, string> = {
  pending: 'Warte auf Verarbeitung...',
  transcribing: 'Transkribiere...',
  analyzing: 'Analysiere...',
  complete: '',
  error: 'Fehler bei der Verarbeitung',
}

interface FeedbackEntryCardProps {
  entry: {
    id: string
    guest_name: string | null
    author_name: string | null
    processing_status: ProcessingStatus
    transcript: string | null
    summary: string | null
    sentiment: Sentiment | null
    tags: string[] | null
    audio_duration_seconds: number | null
    created_at: string
  }
}

export function FeedbackEntryCard({ entry }: FeedbackEntryCardProps) {
  const authorName = entry.guest_name || entry.author_name || 'Anonym'
  const date = new Date(entry.created_at)

  return (
    <div className="rounded-lg border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium">{authorName}</span>
          <span className="text-xs text-muted-foreground">
            {date.toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {entry.audio_duration_seconds && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {Math.floor(entry.audio_duration_seconds / 60)}:
              {String(entry.audio_duration_seconds % 60).padStart(2, '0')}
            </span>
          )}
          {entry.sentiment && (
            <Badge
              variant="outline"
              className={sentimentConfig[entry.sentiment].className}
            >
              {sentimentConfig[entry.sentiment].label}
            </Badge>
          )}
        </div>
      </div>

      {/* Processing Status */}
      {entry.processing_status !== 'complete' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          {entry.processing_status === 'error' ? (
            <span className="text-destructive">
              {statusLabels[entry.processing_status]}
            </span>
          ) : (
            <>
              <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span>{statusLabels[entry.processing_status]}</span>
            </>
          )}
        </div>
      )}

      {/* Summary */}
      {entry.summary && (
        <div className="rounded-md bg-muted/50 p-3 mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            AI-Zusammenfassung
          </p>
          <p className="text-sm">{entry.summary}</p>
        </div>
      )}

      {/* Transcript Preview */}
      {entry.transcript && !entry.summary && (
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {entry.transcript}
        </p>
      )}

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
