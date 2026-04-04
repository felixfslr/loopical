'use client'

import { useState, useEffect } from 'react'
import { VoiceRecorder } from '@/components/voice-recorder'
import { Button } from '@/components/ui/button'
import { MessageCircleQuestion, Check, Loader2, Bot, User } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { FollowUpQuestion } from '@/lib/types/database'

interface ConversationMessage {
  role: 'ai' | 'user'
  content: string
  entryId?: string
}

interface FollowUpPromptProps {
  questions: FollowUpQuestion[]
  loopicalId: string
  parentEntryId: string
  guestName?: string
  /** Maximum conversation rounds (including initial follow-up) */
  maxRounds?: number
}

export function FollowUpPrompt({
  questions,
  loopicalId,
  parentEntryId,
  guestName,
  maxRounds = 3,
}: FollowUpPromptProps) {
  const [conversation, setConversation] = useState<ConversationMessage[]>(() =>
    questions.map((q) => ({ role: 'ai' as const, content: q.question })),
  )
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [lastChildEntryId, setLastChildEntryId] = useState<string | null>(null)
  const [waitingForFollowUp, setWaitingForFollowUp] = useState(false)
  const [round, setRound] = useState(1)

  // Listen for new follow-up questions on child entries (conversation loop)
  useEffect(() => {
    if (!lastChildEntryId || round >= maxRounds) return

    const supabase = createClient()
    const channel = supabase
      .channel(`followup-chain-${lastChildEntryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feedback_entries',
          filter: `id=eq.${lastChildEntryId}`,
        },
        (payload) => {
          const entry = payload.new as {
            follow_up_questions: FollowUpQuestion[] | null
            processing_status: string
          }
          if (entry.processing_status === 'complete') {
            setWaitingForFollowUp(false)
            if (entry.follow_up_questions?.length) {
              // Add new AI questions to conversation
              const newQuestions = entry.follow_up_questions.map((q) => ({
                role: 'ai' as const,
                content: q.question,
              }))
              setConversation((prev) => [...prev, ...newQuestions])
              setRound((r) => r + 1)
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [lastChildEntryId, round, maxRounds])

  if (isDismissed || questions.length === 0) return null

  // Find the first unanswered AI question
  const unansweredAiIndex = conversation.findIndex(
    (m, i) => m.role === 'ai' && !conversation.slice(i + 1).some((n) => n.role === 'user'),
  )
  const hasUnansweredQuestion = unansweredAiIndex >= 0
  const currentQuestion = hasUnansweredQuestion ? conversation[unansweredAiIndex] : null
  const allDone = !hasUnansweredQuestion && !waitingForFollowUp

  if (allDone) {
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

      const data = await response.json()

      // Add user response to conversation
      setConversation((prev) => [
        ...prev,
        { role: 'user', content: '🎤 Antwort aufgenommen', entryId: data.id },
      ])
      setAnsweredCount((c) => c + 1)
      setLastChildEntryId(data.id)

      // Wait for AI processing to potentially generate more follow-ups
      if (round < maxRounds) {
        setWaitingForFollowUp(true)
      }
    } catch {
      toast.error('Upload fehlgeschlagen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmitText(text: string) {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('text', text)
      formData.append('loopicalId', loopicalId)
      formData.append('parentEntryId', parentEntryId)
      if (guestName) formData.append('guestName', guestName)

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()

      setConversation((prev) => [
        ...prev,
        { role: 'user', content: text, entryId: data.id },
      ])
      setAnsweredCount((c) => c + 1)
      setLastChildEntryId(data.id)

      if (round < maxRounds) {
        setWaitingForFollowUp(true)
      }
    } catch {
      toast.error('Senden fehlgeschlagen.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function skipQuestion() {
    // Mark current AI question as answered (by adding a skip marker)
    setConversation((prev) => [
      ...prev,
      { role: 'user', content: '(übersprungen)' },
    ])
    setAnsweredCount((c) => c + 1)
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircleQuestion className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Rückfragen</span>
        <span className="text-xs text-muted-foreground ml-auto">
          Runde {round}/{maxRounds}
        </span>
      </div>

      {/* Conversation thread */}
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {conversation.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'ai' && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Bot className="h-3 w-3 text-primary" />
              </div>
            )}
            <div
              className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                msg.role === 'ai'
                  ? 'bg-muted'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <User className="h-3 w-3 text-primary" />
              </div>
            )}
          </div>
        ))}
        {waitingForFollowUp && (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Recording area for current question */}
      {currentQuestion && !waitingForFollowUp && (
        <VoiceRecorder
          onSubmit={handleSubmit}
          onSubmitText={handleSubmitText}
          isSubmitting={isSubmitting}
          variant="standalone"
        />
      )}

      <div className="flex justify-between items-center">
        {currentQuestion && !waitingForFollowUp && (
          <button
            onClick={skipQuestion}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Überspringen
          </button>
        )}
        <button
          onClick={() => setIsDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground ml-auto"
        >
          Fertig
        </button>
      </div>
    </div>
  )
}
