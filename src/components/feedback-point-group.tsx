'use client'

import { useState } from 'react'
import { FeedbackDetail } from '@/components/feedback-detail'
import { Play, Pause, Mic, Sparkles, RefreshCw, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
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
  ai_summary?: string | null
  ai_consensus_points?: string[] | null
  ai_sentiment_breakdown?: { positive: number; neutral: number; critical: number } | null
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
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [aiSummary, setAiSummary] = useState(point.ai_summary ?? null)
  const [consensusPoints, setConsensusPoints] = useState(point.ai_consensus_points ?? null)
  const sentimentBreakdown = point.ai_sentiment_breakdown

  const questionText = point.question_text || point.question_transcript || ''
  const completedEntries = entries.filter((e) => e.processing_status === 'complete')

  function togglePlayback() {
    if (!audioEl) return
    if (isPlaying) {
      audioEl.pause()
    } else {
      audioEl.play()
    }
    setIsPlaying(!isPlaying)
  }

  async function handleSummarize() {
    setIsSummarizing(true)
    try {
      const response = await fetch(`/api/feedback-points/${point.id}/summarize`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed')
      const data = await response.json()
      setAiSummary(data.summary)
      setConsensusPoints(data.consensusPoints)
    } catch {
      toast.error('Zusammenfassung konnte nicht generiert werden.')
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <div className="space-y-3" id={`feedback-point-${point.id}`}>
      {/* Point header */}
      <div className="flex items-start gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            {questionText && (
              <p className="text-sm font-medium">{questionText}</p>
            )}
            {!questionText && point.question_audio_url && (
              <p className="text-sm text-muted-foreground italic">Eingesprochener Hinweis</p>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {entries.length}
            </span>
          </div>
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

      {/* AI aggregated summary for this point */}
      {completedEntries.length >= 2 && (
        <div className="ml-8">
          {aiSummary ? (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  AI-Zusammenfassung ({completedEntries.length} Feedbacks)
                </div>
                {sentimentBreakdown && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {sentimentBreakdown.positive > 0 && (
                      <span className="text-green-500">+{sentimentBreakdown.positive}</span>
                    )}
                    {sentimentBreakdown.neutral > 0 && (
                      <span className="text-yellow-500">~{sentimentBreakdown.neutral}</span>
                    )}
                    {sentimentBreakdown.critical > 0 && (
                      <span className="text-red-500">-{sentimentBreakdown.critical}</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm">{aiSummary}</p>
              {consensusPoints && consensusPoints.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Konsens:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {consensusPoints.map((cp, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-primary">•</span>
                        {cp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleSummarize}
                disabled={isSummarizing}
              >
                <RefreshCw className={`mr-1 h-3 w-3 ${isSummarizing ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleSummarize}
              disabled={isSummarizing}
            >
              <Sparkles className={`mr-1.5 h-3 w-3 ${isSummarizing ? 'animate-spin' : ''}`} />
              {isSummarizing ? 'Wird zusammengefasst…' : `${completedEntries.length} Feedbacks zusammenfassen`}
            </Button>
          )}
        </div>
      )}

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
