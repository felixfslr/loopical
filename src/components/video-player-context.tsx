'use client'

import { useRef, useState, useEffect } from 'react'
import { Play, Pause, Maximize, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VideoPlayerContextProps {
  src: string
  className?: string
  markers?: { id: string; timestampMs: number; label: string }[]
  onMarkerClick?: (markerId: string) => void
}

export function VideoPlayerContext({ src, className, markers, onMarkerClick }: VideoPlayerContextProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTime = () => setCurrentTime(video.currentTime)
    const handleDuration = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTime)
    video.addEventListener('loadedmetadata', handleDuration)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTime)
      video.removeEventListener('loadedmetadata', handleDuration)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) video.pause()
    else video.play()
  }

  function toggleMute() {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current
    if (!video || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    video.currentTime = pct * duration
  }

  function cycleSpeed() {
    const speeds = [1, 1.25, 1.5, 2, 0.5, 0.75]
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length]
    setPlaybackRate(next)
    if (videoRef.current) videoRef.current.playbackRate = next
  }

  function requestFullscreen() {
    videoRef.current?.requestFullscreen?.()
  }

  function seekToMarker(id: string, timestampMs: number) {
    const video = videoRef.current
    if (!video) return
    video.currentTime = timestampMs / 1000
    onMarkerClick?.(id)
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`rounded-lg overflow-hidden border bg-black ${className ?? ''}`}>
      <div className="relative cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={src}
          className="w-full"
          preload="metadata"
          playsInline
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-5 w-5 text-black ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-background border-t px-3 py-2 space-y-2">
        {/* Progress bar with markers */}
        <div className="relative h-1.5 bg-muted rounded-full cursor-pointer" onClick={handleSeek}>
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          {markers?.map((m) => (
            <button
              key={m.id}
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-amber-400 border-2 border-background hover:scale-125 transition-transform"
              style={{ left: `${(m.timestampMs / (duration * 1000)) * 100}%` }}
              title={m.label}
              onClick={(e) => { e.stopPropagation(); seekToMarker(m.id, m.timestampMs) }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={cycleSpeed}
              className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded transition-colors"
            >
              {playbackRate}x
            </button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={requestFullscreen}>
              <Maximize className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
