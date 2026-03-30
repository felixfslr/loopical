'use client'

import { useReducer, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { WizardProgress } from './wizard-progress'
import { WizardStepMedia, type MediaItem } from './wizard-step-media'
import { WizardStepMode } from './wizard-step-mode'
import { WizardStepPoints, type FeedbackPointDraft } from './wizard-step-points'
import { WizardStepPreview } from './wizard-step-preview'
import { createLoopicalWizard } from '@/app/(authenticated)/projects/[id]/loopicals/new/actions'
import { toast } from 'sonner'
import type { FeedbackMode } from '@/lib/types/database'

interface WizardState {
  step: number
  title: string
  media: MediaItem[]
  contextUrl: string
  feedbackMode: FeedbackMode
  feedbackPoints: FeedbackPointDraft[]
  welcomeMessage: string
}

type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_MEDIA'; media: MediaItem[] }
  | { type: 'SET_MODE'; mode: FeedbackMode }
  | { type: 'SET_POINTS'; points: FeedbackPointDraft[] }
  | { type: 'SET_WELCOME'; message: string }
  | { type: 'SET_CONTEXT_URL'; url: string }

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'SET_TITLE':
      return { ...state, title: action.title }
    case 'SET_MEDIA':
      return { ...state, media: action.media }
    case 'SET_MODE':
      return { ...state, feedbackMode: action.mode }
    case 'SET_POINTS':
      return { ...state, feedbackPoints: action.points }
    case 'SET_WELCOME':
      return { ...state, welcomeMessage: action.message }
    case 'SET_CONTEXT_URL':
      return { ...state, contextUrl: action.url }
  }
}

interface LoopicalWizardProps {
  projectId: string
}

export function LoopicalWizard({ projectId }: LoopicalWizardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [state, dispatch] = useReducer(reducer, {
    step: 1,
    title: '',
    media: [],
    contextUrl: '',
    feedbackMode: 'guided',
    feedbackPoints: [],
    welcomeMessage: '',
  })

  // In guided mode: steps 1-4, in open mode: steps 1, 2, 4 (skip 3)
  const isGuided = state.feedbackMode === 'guided'
  const stepLabels = isGuided
    ? ['Upload', 'Modus', 'Punkte', 'Vorschau']
    : ['Upload', 'Modus', 'Vorschau']
  const totalSteps = stepLabels.length

  // Map internal step to display step for progress
  function displayStep() {
    if (!isGuided && state.step === 4) return 3
    return state.step
  }

  function goToStep(step: number) {
    dispatch({ type: 'SET_STEP', step })
  }

  function handleModeNext() {
    if (state.feedbackMode === 'open') {
      goToStep(4) // Skip step 3
    } else {
      goToStep(3)
    }
  }

  function handleModeBack() {
    goToStep(1)
  }

  function handlePointsBack() {
    goToStep(2)
  }

  function handlePreviewBack() {
    if (state.feedbackMode === 'open') {
      goToStep(2)
    } else {
      goToStep(3)
    }
  }

  async function handleUploadQuestionAudio(pointId: string, blob: Blob) {
    const formData = new FormData()
    formData.append('audio', blob, 'question.webm')

    try {
      const res = await fetch('/api/question-audio', { method: 'POST', body: formData })
      if (!res.ok) {
        toast.error('Audio-Upload fehlgeschlagen. Bitte versuche es erneut.')
        dispatch({
          type: 'SET_POINTS',
          points: state.feedbackPoints.map((p) =>
            p.id === pointId ? { ...p, isUploading: false } : p,
          ),
        })
        return
      }

      const { audio_url, transcript } = await res.json()
      dispatch({
        type: 'SET_POINTS',
        points: state.feedbackPoints.map((p) =>
          p.id === pointId
            ? { ...p, questionAudioUrl: audio_url, questionTranscript: transcript, isUploading: false }
            : p,
        ),
      })
    } catch {
      toast.error('Audio-Upload fehlgeschlagen. Bitte prüfe deine Verbindung.')
      dispatch({
        type: 'SET_POINTS',
        points: state.feedbackPoints.map((p) =>
          p.id === pointId ? { ...p, isUploading: false } : p,
        ),
      })
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('projectId', projectId)
      formData.append('title', state.title)
      formData.append('feedbackMode', state.feedbackMode)
      formData.append('welcomeMessage', state.welcomeMessage)
      if (state.contextUrl) formData.append('contextUrl', state.contextUrl)

      // Add media files and URLs
      for (const item of state.media) {
        if (item.file) {
          formData.append('media', item.file)
        } else if (item.url) {
          formData.append('mediaUrl', item.url)
        }
      }

      // Add feedback points as JSON
      if (state.feedbackMode === 'guided') {
        const points = state.feedbackPoints.map((p, i) => ({
          questionText: p.questionText,
          questionAudioUrl: p.questionAudioUrl || null,
          questionTranscript: p.questionTranscript || null,
          markerX: p.markerX ?? null,
          markerY: p.markerY ?? null,
          markerMediaIndex: p.markerMediaIndex,
          orderIndex: i,
          contextUrl: p.contextUrl || null,
        }))
        formData.append('feedbackPoints', JSON.stringify(points))
      }

      const result = await createLoopicalWizard(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }

      router.push(`/projects/${projectId}`)
      router.refresh()
    })
  }

  return (
    <div>
      <WizardProgress
        currentStep={displayStep()}
        totalSteps={totalSteps}
        labels={stepLabels}
      />

      {state.step === 1 && (
        <WizardStepMedia
          title={state.title}
          onTitleChange={(t) => dispatch({ type: 'SET_TITLE', title: t })}
          media={state.media}
          onMediaChange={(m) => dispatch({ type: 'SET_MEDIA', media: m })}
          contextUrl={state.contextUrl}
          onContextUrlChange={(url) => dispatch({ type: 'SET_CONTEXT_URL', url })}
          onNext={() => goToStep(2)}
        />
      )}

      {state.step === 2 && (
        <WizardStepMode
          mode={state.feedbackMode}
          onModeChange={(m) => dispatch({ type: 'SET_MODE', mode: m })}
          onNext={handleModeNext}
          onBack={handleModeBack}
        />
      )}

      {state.step === 3 && (
        <WizardStepPoints
          title={state.title}
          media={state.media}
          points={state.feedbackPoints}
          onPointsChange={(p) => dispatch({ type: 'SET_POINTS', points: p })}
          onNext={() => goToStep(4)}
          onBack={handlePointsBack}
          onUploadQuestionAudio={handleUploadQuestionAudio}
        />
      )}

      {state.step === 4 && (
        <WizardStepPreview
          title={state.title}
          media={state.media}
          mode={state.feedbackMode}
          points={state.feedbackPoints}
          welcomeMessage={state.welcomeMessage}
          contextUrl={state.contextUrl}
          onWelcomeMessageChange={(m) => dispatch({ type: 'SET_WELCOME', message: m })}
          onBack={handlePreviewBack}
          onSubmit={handleSubmit}
          isSubmitting={isPending}
        />
      )}
    </div>
  )
}
