'use client'

import { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import type { WordTimestamp } from '@/lib/ai/types'
import { cn } from '@/lib/utils'

interface TranscriptViewProps {
  text: string
  wordTimestamps?: WordTimestamp[] | null
  currentTime?: number
  onSeek?: (time: number) => void
}

export function TranscriptView({
  text,
  wordTimestamps,
  currentTime = 0,
  onSeek,
}: TranscriptViewProps) {
  const activeWordRef = useRef<HTMLSpanElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }
  }, [currentTime])

  async function handleCopy() {
    const fullText = wordTimestamps?.length
      ? wordTimestamps.map((w) => w.word).join(' ')
      : text
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // If no word timestamps, show plain text
  if (!wordTimestamps || wordTimestamps.length === 0) {
    return (
      <div className="relative group">
        <div className="text-sm leading-relaxed text-muted-foreground">
          {text}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
          onClick={handleCopy}
          title="Kopieren"
        >
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    )
  }

  return (
    <div className="relative group">
      <div className="text-sm leading-relaxed max-h-48 overflow-y-auto pr-6">
        {wordTimestamps.map((word, i) => {
          const isActive = currentTime >= word.start && currentTime < word.end
          const isClickable = !!onSeek
          return (
            <span
              key={i}
              ref={isActive ? activeWordRef : undefined}
              className={cn(
                'transition-colors duration-150',
                isActive
                  ? 'bg-primary/20 text-foreground rounded px-0.5'
                  : 'text-muted-foreground',
                isClickable && 'cursor-pointer hover:text-foreground hover:bg-muted/50 rounded px-0.5',
              )}
              onClick={isClickable ? () => onSeek(word.start) : undefined}
            >
              {word.word}{' '}
            </span>
          )
        })}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
        onClick={handleCopy}
        title="Kopieren"
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  )
}
