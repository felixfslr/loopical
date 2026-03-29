'use client'

import { Mic, Video, Monitor } from 'lucide-react'

export type RecordingMode = 'audio' | 'webcam' | 'screen'

interface RecordingModeSelectorProps {
  value: RecordingMode
  onChange: (mode: RecordingMode) => void
  disabled?: boolean
}

const modes = [
  { value: 'audio' as const, label: 'Audio', icon: Mic },
  { value: 'webcam' as const, label: 'Webcam', icon: Video },
  { value: 'screen' as const, label: 'Bildschirm', icon: Monitor },
]

export function RecordingModeSelector({ value, onChange, disabled }: RecordingModeSelectorProps) {
  return (
    <div className="flex gap-1 rounded-lg border p-1">
      {modes.map((mode) => {
        const Icon = mode.icon
        const isActive = value === mode.value
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            disabled={disabled}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
