'use client'

import { useTransition } from 'react'
import { FeedbackDetail } from '@/components/feedback-detail'
import { toggleActionItem } from '@/app/(authenticated)/projects/[id]/loopicals/[loopicalId]/actions'
import type { ActionItem, ProcessingStatus, Sentiment, WordTimestamp } from '@/lib/types/database'

interface Entry {
  id: string
  audio_url: string
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
}

interface LoopicalFeedbackListProps {
  entries: Entry[]
  projectId: string
  loopicalId: string
}

export function LoopicalFeedbackList({
  entries,
  projectId,
  loopicalId,
}: LoopicalFeedbackListProps) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(entryId: string, index: number) {
    startTransition(async () => {
      await toggleActionItem(entryId, index, projectId, loopicalId)
    })
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <FeedbackDetail
          key={entry.id}
          entry={entry}
          onToggleActionItem={handleToggle}
        />
      ))}
    </div>
  )
}
