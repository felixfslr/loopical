'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { FeedbackSubmitForm } from '@/components/feedback-submit-form'
import { LoopicalFeedbackList } from '@/components/loopical-feedback-list'
import { OptimisticFeedbackCard } from '@/components/optimistic-feedback-card'
import { EmptyState } from '@/components/empty-state'
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

interface LoopicalFeedbackSectionProps {
  entries: Entry[]
  projectId: string
  loopicalId: string
  authorId: string
}

export function LoopicalFeedbackSection({
  entries,
  projectId,
  loopicalId,
  authorId,
}: LoopicalFeedbackSectionProps) {
  const router = useRouter()
  const [optimisticIds, setOptimisticIds] = useState<string[]>([])

  function handleNewEntry(entryId: string) {
    setOptimisticIds((prev) => [entryId, ...prev])
  }

  function handleOptimisticComplete(entryId: string) {
    setOptimisticIds((prev) => prev.filter((id) => id !== entryId))
    router.refresh()
  }

  const totalCount = entries.length + optimisticIds.length

  return (
    <>
      {/* Record Feedback */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Feedback aufnehmen</h2>
        <FeedbackSubmitForm
          loopicalId={loopicalId}
          authorId={authorId}
          onNewEntry={handleNewEntry}
        />
      </div>

      {/* Feedback Entries */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Feedback ({totalCount})
        </h2>

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
        ) : entries.length > 0 ? (
          <LoopicalFeedbackList
            entries={entries}
            projectId={projectId}
            loopicalId={loopicalId}
          />
        ) : null}
      </div>
    </>
  )
}
