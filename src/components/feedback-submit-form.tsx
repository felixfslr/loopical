'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { VoiceRecorder } from '@/components/voice-recorder'
import { ProcessingStatusWrapper } from '@/components/processing-status'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.3 },
}

interface FeedbackSubmitFormProps {
  loopicalId: string
  authorId?: string
  feedbackPointId?: string
  showGuestName?: boolean
  variant?: 'card' | 'standalone'
  onNewEntry?: (entryId: string) => void
  onSuccess?: () => void
}

export function FeedbackSubmitForm({
  loopicalId,
  authorId,
  feedbackPointId,
  showGuestName = false,
  variant = 'card',
  onNewEntry,
  onSuccess,
}: FeedbackSubmitFormProps) {
  const router = useRouter()
  const [guestName, setGuestName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(blob: Blob, durationSeconds: number) {
    if (blob.size > 25 * 1024 * 1024) {
      toast.error('Aufnahme ist zu groß (max. 25 MB).')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('loopicalId', loopicalId)
      formData.append('durationSeconds', String(durationSeconds))
      if (authorId) formData.append('authorId', authorId)
      if (feedbackPointId) formData.append('feedbackPointId', feedbackPointId)
      if (guestName) formData.append('guestName', guestName)

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen')
      }

      const data = await response.json()
      setEntryId(data.id)
      setSubmitted(true)
      onNewEntry?.(data.id)
      onSuccess?.()
    } catch (err) {
      console.error('Submit error:', err)
      setError('Feedback konnte nicht gesendet werden.')
      toast.error('Feedback konnte nicht gesendet werden.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleReset() {
    setSubmitted(false)
    setEntryId(null)
    setError(null)
  }

  function handleProcessingComplete() {
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div {...fadeSlide}>
            <div className="rounded-md bg-destructive/10 p-3 flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-sm text-destructive flex-1">{error}</span>
              <Button variant="outline" size="sm" onClick={() => setError(null)}>
                Schließen
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {submitted && entryId ? (
          /* Processing → Complete */
          <motion.div key="processing" {...fadeSlide}>
            <ProcessingStatusWrapper
              entryId={entryId}
              initialStatus="pending"
              onComplete={handleProcessingComplete}
            >
              {/* Shown when complete */}
              <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-6 text-center">
                <Check className="mx-auto h-8 w-8 text-green-500 mb-3" />
                <p className="font-medium">Danke für dein Feedback!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Dein Voice-Feedback wurde verarbeitet.
                </p>
                <button
                  onClick={handleReset}
                  className="mt-4 text-sm text-muted-foreground underline hover:text-foreground"
                >
                  Weiteres Feedback aufnehmen
                </button>
              </div>
            </ProcessingStatusWrapper>
          </motion.div>
        ) : (
          /* Recording */
          <motion.div key="recorder" {...fadeSlide}>
            {showGuestName && (
              <div className="space-y-2 mb-4">
                <Label htmlFor="guestName">Dein Name (optional)</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Wie heißt du?"
                />
              </div>
            )}
            <VoiceRecorder onSubmit={handleSubmit} isSubmitting={isSubmitting} variant={variant} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
