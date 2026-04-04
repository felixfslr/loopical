'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReactionFeedbackProps {
  loopicalId: string
  feedbackPointId?: string
  guestName?: string
}

const reactions = [
  { emoji: '👍', label: 'Gut', sentiment: 'positive' },
  { emoji: '👎', label: 'Schlecht', sentiment: 'critical' },
  { emoji: '😐', label: 'Neutral', sentiment: 'neutral' },
  { emoji: '🐛', label: 'Bug', sentiment: 'critical' },
  { emoji: '💡', label: 'Idee', sentiment: 'neutral' },
] as const

export function ReactionFeedback({ loopicalId, feedbackPointId, guestName }: ReactionFeedbackProps) {
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleReaction(reaction: typeof reactions[number]) {
    if (isSubmitting || submitted) return
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('loopicalId', loopicalId)
      formData.append('reaction', reaction.emoji)
      if (feedbackPointId) formData.append('feedbackPointId', feedbackPointId)
      if (guestName) formData.append('guestName', guestName)

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed')
      setSubmitted(reaction.emoji)
    } catch {
      toast.error('Reaktion konnte nicht gesendet werden.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Check className="h-4 w-4 text-green-500" />
            <span>{submitted} gesendet</span>
          </motion.div>
        ) : (
          <motion.div
            key="reactions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1"
          >
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin mr-1 text-muted-foreground" />
            )}
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => handleReaction(r)}
                disabled={isSubmitting}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl hover:bg-muted transition-colors disabled:opacity-50"
                title={r.label}
              >
                {r.emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!submitted && (
        <p className="text-xs text-muted-foreground">Schnelle Reaktion</p>
      )}
    </div>
  )
}
