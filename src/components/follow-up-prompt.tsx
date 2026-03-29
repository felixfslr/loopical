'use client'

import { useState } from 'react'
import { VoiceRecorder } from '@/components/voice-recorder'
import { Button } from '@/components/ui/button'
import { MessageCircleQuestion, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { FollowUpQuestion } from '@/lib/types/database'

interface FollowUpPromptProps {
  questions: FollowUpQuestion[]
  loopicalId: string
  parentEntryId: string
  guestName?: string
}

export function FollowUpPrompt({
  questions,
  loopicalId,
  parentEntryId,
  guestName,
}: FollowUpPromptProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answered, setAnswered] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed || questions.length === 0) return null

  const allAnswered = answered.size >= questions.length
  const current = questions[currentIndex]

  if (allAnswered) {
    return (
      <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-center space-y-2">
        <Check className="h-6 w-6 text-green-500 mx-auto" />
        <p className="text-sm font-medium">Danke für die Zusatzinfos!</p>
      </div>
    )
  }

  async function handleSubmit(blob: Blob, durationSeconds: number) {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'followup.webm')
      formData.append('loopicalId', loopicalId)
      formData.append('durationSeconds', String(durationSeconds))
      formData.append('parentEntryId', parentEntryId)
      if (guestName) formData.append('guestName', guestName)

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      setAnswered((prev) => new Set(prev).add(currentIndex))
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    } catch {
      toast.error('Upload fehlgeschlagen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircleQuestion className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Rückfrage</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      <p className="text-sm">{current.question}</p>

      <VoiceRecorder
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        variant="standalone"
      />

      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            setAnswered((prev) => new Set(prev).add(currentIndex))
            if (currentIndex < questions.length - 1) {
              setCurrentIndex(currentIndex + 1)
            }
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Überspringen
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Nein danke, fertig
        </button>
      </div>
    </div>
  )
}
