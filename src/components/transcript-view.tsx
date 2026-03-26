'use client'

import { useRef, useEffect } from 'react'
import type { WordTimestamp } from '@/lib/ai/types'
import { cn } from '@/lib/utils'

interface TranscriptViewProps {
  text: string
  wordTimestamps?: WordTimestamp[] | null
  currentTime?: number
}

export function TranscriptView({
  text,
  wordTimestamps,
  currentTime = 0,
}: TranscriptViewProps) {
  const activeWordRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [currentTime])

  // If no word timestamps, show plain text
  if (!wordTimestamps || wordTimestamps.length === 0) {
    return (
      <div className="text-sm leading-relaxed text-muted-foreground">
        {text}
      </div>
    )
  }

  return (
    <div className="text-sm leading-relaxed max-h-48 overflow-y-auto">
      {wordTimestamps.map((word, i) => {
        const isActive = currentTime >= word.start && currentTime < word.end
        return (
          <span
            key={i}
            ref={isActive ? activeWordRef : undefined}
            className={cn(
              'transition-colors duration-150',
              isActive
                ? 'bg-primary/20 text-foreground rounded px-0.5'
                : 'text-muted-foreground',
            )}
          >
            {word.word}{' '}
          </span>
        )
      })}
    </div>
  )
}
