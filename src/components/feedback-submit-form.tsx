'use client'

import { useState } from 'react'
import { VoiceRecorder } from '@/components/voice-recorder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check } from 'lucide-react'

interface FeedbackSubmitFormProps {
  loopicalId: string
  authorId?: string
  showGuestName?: boolean
  onSuccess?: () => void
}

export function FeedbackSubmitForm({
  loopicalId,
  authorId,
  showGuestName = false,
  onSuccess,
}: FeedbackSubmitFormProps) {
  const [guestName, setGuestName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(blob: Blob, durationSeconds: number) {
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      formData.append('loopicalId', loopicalId)
      formData.append('durationSeconds', String(durationSeconds))
      if (authorId) formData.append('authorId', authorId)
      if (guestName) formData.append('guestName', guestName)

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen')
      }

      setSubmitted(true)
      onSuccess?.()
    } catch (err) {
      console.error('Submit error:', err)
      alert('Feedback konnte nicht gesendet werden. Bitte versuche es erneut.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-6 text-center">
        <Check className="mx-auto h-8 w-8 text-green-500 mb-3" />
        <p className="font-medium">Danke für dein Feedback!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Dein Voice-Feedback wird gerade verarbeitet.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm text-muted-foreground underline hover:text-foreground"
        >
          Weiteres Feedback aufnehmen
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showGuestName && (
        <div className="space-y-2">
          <Label htmlFor="guestName">Dein Name (optional)</Label>
          <Input
            id="guestName"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Wie heißt du?"
          />
        </div>
      )}
      <VoiceRecorder onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  )
}
