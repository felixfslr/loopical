'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { VoiceRecorder } from '@/components/voice-recorder'
import { VideoRecorder } from '@/components/video-recorder'
import { RecordingModeSelector, type RecordingMode } from '@/components/recording-mode-selector'
import { FollowUpPrompt } from '@/components/follow-up-prompt'
import { ProcessingStatusWrapper } from '@/components/processing-status'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Annotation, FollowUpQuestion } from '@/lib/types/database'

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
  /** Guest annotations (pins + strokes) to submit alongside audio */
  annotations?: Annotation[]
  /** Callback when recording state changes (isRecording, startMs) */
  onRecordingStateChange?: (isRecording: boolean, startMs: number | null) => void
  /** Callback when entering/leaving preview state (after recording, before submit) */
  onPreviewStateChange?: (isPreview: boolean) => void
  /** Callback when re-recording (to clear recording-time annotations) */
  onReRecord?: () => void
}

export function FeedbackSubmitForm({
  loopicalId,
  authorId,
  feedbackPointId,
  showGuestName = false,
  variant = 'card',
  onNewEntry,
  onSuccess,
  annotations,
  onRecordingStateChange,
  onPreviewStateChange,
  onReRecord,
}: FeedbackSubmitFormProps) {
  const router = useRouter()
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('audio')
  const [guestName, setGuestName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[] | null>(null)

  // Listen for follow-up questions after processing completes
  useEffect(() => {
    if (!entryId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`followup-${entryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feedback_entries',
          filter: `id=eq.${entryId}`,
        },
        (payload) => {
          const entry = payload.new as { follow_up_questions: FollowUpQuestion[] | null; processing_status: string }
          if (entry.processing_status === 'complete' && entry.follow_up_questions?.length) {
            setFollowUpQuestions(entry.follow_up_questions)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [entryId])

  async function handleSubmitAudio(blob: Blob, durationSeconds: number) {
    const maxSize = recordingMode === 'audio' ? 25 * 1024 * 1024 : 100 * 1024 * 1024
    if (blob.size > maxSize) {
      toast.error(`Aufnahme ist zu groß (max. ${recordingMode === 'audio' ? '25' : '100'} MB).`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      const isVideo = recordingMode === 'webcam' || recordingMode === 'screen'

      if (isVideo) {
        formData.append('video', blob, 'recording.webm')
        formData.append('mediaType', 'video')
      } else {
        formData.append('audio', blob, 'recording.webm')
      }
      formData.append('loopicalId', loopicalId)
      formData.append('durationSeconds', String(durationSeconds))
      if (authorId) formData.append('authorId', authorId)
      if (feedbackPointId) formData.append('feedbackPointId', feedbackPointId)
      if (guestName) formData.append('guestName', guestName)
      if (annotations && annotations.length > 0) {
        formData.append('annotations', JSON.stringify(annotations))
      }

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
    setFollowUpQuestions(null)
  }

  function handleProcessingComplete() {
    router.refresh()
  }

  const isVideoMode = recordingMode === 'webcam' || recordingMode === 'screen'

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
              <div className="space-y-4">
                <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-6 text-center">
                  <Check className="mx-auto h-8 w-8 text-green-500 mb-3" />
                  <p className="font-medium">Danke für dein Feedback!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dein {isVideoMode ? 'Video' : 'Voice'}-Feedback wurde verarbeitet.
                  </p>
                  <button
                    onClick={handleReset}
                    className="mt-4 text-sm text-muted-foreground underline hover:text-foreground"
                  >
                    Weiteres Feedback aufnehmen
                  </button>
                </div>

                {/* Follow-up questions */}
                {followUpQuestions && followUpQuestions.length > 0 && (
                  <FollowUpPrompt
                    questions={followUpQuestions}
                    loopicalId={loopicalId}
                    parentEntryId={entryId}
                    guestName={guestName || undefined}
                  />
                )}
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

            {/* Recording mode selector */}
            <div className="flex justify-center mb-4">
              <RecordingModeSelector
                value={recordingMode}
                onChange={setRecordingMode}
                disabled={isSubmitting}
              />
            </div>

            {isVideoMode ? (
              <VideoRecorder
                onSubmit={handleSubmitAudio}
                isSubmitting={isSubmitting}
              />
            ) : (
              <VoiceRecorder
                onSubmit={handleSubmitAudio}
                isSubmitting={isSubmitting}
                variant={variant}
                onRecordingStateChange={onRecordingStateChange}
                onPreviewStateChange={onPreviewStateChange}
                onReRecord={onReRecord}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
