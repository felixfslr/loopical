'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, ListChecks, Mic } from 'lucide-react'
import type { FeedbackMode } from '@/lib/types/database'

interface WizardStepModeProps {
  mode: FeedbackMode
  onModeChange: (mode: FeedbackMode) => void
  onNext: () => void
  onBack: () => void
}

export function WizardStepMode({ mode, onModeChange, onNext, onBack }: WizardStepModeProps) {
  const options: { value: FeedbackMode; title: string; description: string; icon: typeof ListChecks }[] = [
    {
      value: 'guided',
      title: 'Geführtes Feedback',
      description: 'Definiere spezifische Fragen zu bestimmten Stellen. Feedback-Geber werden Punkt für Punkt durchgeführt.',
      icon: ListChecks,
    },
    {
      value: 'open',
      title: 'Offenes Feedback',
      description: 'Feedback-Geber sprechen frei und können selbst entscheiden, worüber sie sprechen.',
      icon: Mic,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Wie soll Feedback gesammelt werden?</h2>
        <p className="text-sm text-muted-foreground">
          Wähle, ob du spezifische Fragen stellen oder offenes Feedback erhalten möchtest.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon
          const isSelected = mode === option.value
          return (
            <button
              key={option.value}
              onClick={() => onModeChange(option.value)}
              className={cn(
                'flex flex-col items-start gap-3 rounded-lg border-2 p-5 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{option.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={onNext}>
          {mode === 'open' ? 'Zur Vorschau' : 'Weiter'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
