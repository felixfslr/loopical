'use client'

import { useRef, useState } from 'react'
import { AudioPlayer, type AudioPlayerHandle } from '@/components/audio-player'
import { VideoPlayer } from '@/components/video-player'
import { TranscriptView } from '@/components/transcript-view'
import { ProcessingStatusWrapper } from '@/components/processing-status'
import { Badge } from '@/components/ui/badge'
import { Check, Square, User, Clock, MapPin, Video, Mic, ListChecks } from 'lucide-react'
import type { ActionItem, Annotation, FeedbackMediaType, ProcessingStatus, Sentiment, WordTimestamp } from '@/lib/types/database'

const sentimentConfig = {
  positive: { label: 'Positiv', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  neutral: { label: 'Neutral', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  critical: { label: 'Kritisch', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
} as const

interface FeedbackDetailProps {
  entry: {
    id: string
    audio_url: string | null
    video_url?: string | null
    media_type?: FeedbackMediaType
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
    annotations?: Annotation[] | null
  }
  onToggleActionItem?: (entryId: string, index: number) => void
  onComplete?: () => void
  /** Called when this entry is focused/selected (e.g. to show annotations on image) */
  onFocus?: (entryId: string) => void
  /** Whether this entry is currently focused/selected */
  isFocused?: boolean
}

export function FeedbackDetail({ entry, onToggleActionItem, onComplete, onFocus, isFocused }: FeedbackDetailProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const audioPlayerRef = useRef<AudioPlayerHandle>(null)
  const authorName = entry.guest_name || entry.author_name || 'Anonym'
  const date = new Date(entry.created_at)
  const annotationCount = entry.annotations?.filter((a) => a.type === 'pin').length ?? 0
  const isVideo = entry.media_type === 'video'
  const actionItemCount = entry.action_items?.length ?? 0
  const openActionItems = entry.action_items?.filter((a) => !a.done).length ?? 0

  function handleSeek(time: number) {
    audioPlayerRef.current?.seekTo(time)
  }

  return (
    <div
      className={`rounded-lg border p-4 space-y-4 transition-colors cursor-pointer ${isFocused ? 'border-primary/50 bg-primary/5' : 'hover:border-muted-foreground/30'}`}
      onClick={() => onFocus?.(entry.id)}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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
          {isVideo ? (
            <Video className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            entry.audio_duration_seconds && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {Math.floor(entry.audio_duration_seconds / 60)}:
                {String(entry.audio_duration_seconds % 60).padStart(2, '0')}
              </span>
            )
          )}
          {annotationCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-orange-500">
              <MapPin className="h-3 w-3" />
              {annotationCount}
            </span>
          )}
          {actionItemCount > 0 && (
            <span className={`flex items-center gap-1 text-xs ${openActionItems > 0 ? 'text-primary' : 'text-green-500'}`}>
              <ListChecks className="h-3 w-3" />
              {openActionItems > 0 ? `${openActionItems} offen` : 'erledigt'}
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

      {/* Media Player */}
      {isVideo && entry.video_url ? (
        <VideoPlayer src={entry.video_url} />
      ) : entry.audio_url ? (
        <AudioPlayer ref={audioPlayerRef} src={entry.audio_url} onTimeUpdate={setCurrentTime} />
      ) : null}

      {/* Processing Status Wrapper */}
      <ProcessingStatusWrapper
        entryId={entry.id}
        initialStatus={entry.processing_status}
        onComplete={onComplete}
      >
        <div className="space-y-4">
          {/* Transcript */}
          {entry.transcript && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Transkript
              </p>
              <TranscriptView
                text={entry.transcript}
                wordTimestamps={entry.word_timestamps}
                currentTime={currentTime}
                onSeek={entry.audio_url ? handleSeek : undefined}
              />
            </div>
          )}

          {/* Summary */}
          {entry.summary && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                AI-Zusammenfassung
              </p>
              <p className="text-sm">{entry.summary}</p>
            </div>
          )}

          {/* Action Items */}
          {entry.action_items && entry.action_items.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Action Items
              </p>
              <ul className="space-y-1.5">
                {entry.action_items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleActionItem?.(entry.id, i)
                      }}
                      className="mt-0.5 shrink-0"
                    >
                      {item.done ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <span
                      className={`text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
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
      </ProcessingStatusWrapper>
    </div>
  )
}
