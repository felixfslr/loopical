'use client'

import { useState } from 'react'
import { FeedbackDetail } from '@/components/feedback-detail'
import { Play, Pause, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ActionItem, ProcessingStatus, Sentiment, WordTimestamp } from '@/lib/types/database'

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
}

interface FeedbackPointData {
  id: string
  question_text: string | null
  question_audio_url: string | null
  question_transcript: string | null
  marker_x: number | null
  marker_y: number | null
  marker_media_index: number
  order_index: number
}

interface FeedbackPointGroupProps {
  point: FeedbackPointData
  index: number
  entries: Entry[]
  onToggleActionItem?: (entryId: string, index: number) => void
}

export function FeedbackPointGroup({
  point,
  index,
  entries,
  onToggleActionItem,
}: FeedbackPointGroupProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)

  const questionText = point.question_text || point.question_transcript || ''

  function togglePlayback() {
    if (!audioEl) return
    if (isPlaying) {
      audioEl.pause()
    } else {
      audioEl.play()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="space-y-3" id={`feedback-point-${point.id}`}>
      {/* Point header */}
      <div className="flex items-start gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="space-y-1 flex-1">
          {questionText && (
            <p className="text-sm font-medium">{questionText}</p>
          )}
          {!questionText && point.question_audio_url && (
            <p className="text-sm text-muted-foreground italic">Eingesprochener Hinweis</p>
          )}
          {point.question_audio_url && (
            <div className="flex items-center gap-2">
              <audio
                ref={setAudioEl}
                src={point.question_audio_url}
                onEnded={() => setIsPlaying(false)}
              />
              <Button variant="outline" size="sm" className="h-6 text-xs" onClick={togglePlayback}>
                {isPlaying ? (
                  <Pause className="mr-1 h-3 w-3" />
                ) : (
                  <Play className="mr-1 h-3 w-3" />
                )}
                Anhören
              </Button>
              <Mic className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Entries for this point */}
      {entries.length > 0 ? (
        <div className="space-y-3 ml-8">
          {entries.map((entry) => (
            <FeedbackDetail
              key={entry.id}
              entry={entry}
              onToggleActionItem={onToggleActionItem}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground ml-8">
          Noch kein Feedback zu diesem Punkt
        </p>
      )}
    </div>
  )
}
