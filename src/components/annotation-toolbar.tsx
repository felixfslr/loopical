'use client'

import { MapPin, Pencil, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AnnotationMode = 'pin' | 'draw'

interface AnnotationToolbarProps {
  mode: AnnotationMode
  onModeChange: (mode: AnnotationMode) => void
  onUndo: () => void
  canUndo: boolean
  isRecording?: boolean
}

export function AnnotationToolbar({
  mode,
  onModeChange,
  onUndo,
  canUndo,
  isRecording,
}: AnnotationToolbarProps) {
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-sm border shadow-lg px-1.5 py-1">
      {isRecording && (
        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse ml-1.5 mr-0.5" />
      )}

      <button
        type="button"
        onClick={() => onModeChange('pin')}
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-full transition-colors',
          mode === 'pin'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
        title="Marker setzen"
      >
        <MapPin className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => onModeChange('draw')}
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-full transition-colors',
          mode === 'draw'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
        title="Freihand zeichnen"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <div className="w-px h-5 bg-border mx-0.5" />

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-full transition-colors',
          canUndo
            ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
            : 'text-muted-foreground/30 cursor-not-allowed',
        )}
        title="Rückgängig"
      >
        <Undo2 className="h-4 w-4" />
      </button>
    </div>
  )
}
