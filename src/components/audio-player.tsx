'use client'

import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-react'

interface AudioPlayerProps {
  src: string
  onTimeUpdate?: (currentTime: number) => void
}

export interface AudioPlayerHandle {
  seekTo: (time: number) => void
}

const SPEEDS = [1, 1.5, 2] as const

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer({ src, onTimeUpdate }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)

    useImperativeHandle(ref, () => ({
      seekTo(time: number) {
        const audio = audioRef.current
        if (audio) {
          audio.currentTime = time
          setCurrentTime(time)
        }
      },
    }))

    useEffect(() => {
      const audio = audioRef.current
      if (!audio) return

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
        onTimeUpdate?.(audio.currentTime)
      }
      const handleLoadedMetadata = () => setDuration(audio.duration)
      const handleEnded = () => setIsPlaying(false)

      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('loadedmetadata', handleLoadedMetadata)
      audio.addEventListener('ended', handleEnded)

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('ended', handleEnded)
      }
    }, [onTimeUpdate])

    function togglePlay() {
      const audio = audioRef.current
      if (!audio) return
      if (isPlaying) {
        audio.pause()
      } else {
        audio.play()
      }
      setIsPlaying(!isPlaying)
    }

    function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
      const audio = audioRef.current
      if (!audio || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      audio.currentTime = percent * duration
    }

    function cycleSpeed() {
      const audio = audioRef.current
      if (!audio) return
      const nextIndex = (SPEEDS.indexOf(speed) + 1) % SPEEDS.length
      const newSpeed = SPEEDS[nextIndex]
      audio.playbackRate = newSpeed
      setSpeed(newSpeed)
    }

    // Keyboard shortcuts
    function handleKeyDown(e: React.KeyboardEvent) {
      const audio = audioRef.current
      if (!audio) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          audio.currentTime = Math.max(0, audio.currentTime - 5)
          break
        case 'ArrowRight':
          e.preventDefault()
          audio.currentTime = Math.min(duration, audio.currentTime + 5)
          break
        case '[':
          e.preventDefault()
          cycleSpeed()
          break
      }
    }

    const formatTime = (s: number) => {
      if (!isFinite(s)) return '0:00'
      const m = Math.floor(s / 60)
      const sec = Math.floor(s % 60)
      return `${m}:${String(sec).padStart(2, '0')}`
    }

    const progress = duration ? (currentTime / duration) * 100 : 0

    return (
      <div
        ref={containerRef}
        className="flex items-center gap-3 rounded-lg border p-3 focus-within:ring-1 focus-within:ring-primary/30"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <audio ref={audioRef} src={src} preload="metadata" />

        {/* Play/Pause */}
        <Button variant="ghost" size="icon-sm" onClick={togglePlay}>
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        {/* Time */}
        <span className="text-xs tabular-nums text-muted-foreground min-w-[3.5rem]">
          {formatTime(currentTime)}
        </span>

        {/* Progress Bar */}
        <div
          className="relative flex-1 h-1.5 rounded-full bg-muted cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Duration */}
        <span className="text-xs tabular-nums text-muted-foreground min-w-[3.5rem] text-right">
          {formatTime(duration)}
        </span>

        {/* Speed */}
        <button
          onClick={cycleSpeed}
          className="text-xs font-medium text-muted-foreground hover:text-foreground min-w-[2rem] text-center"
        >
          {speed}x
        </button>
      </div>
    )
  },
)
