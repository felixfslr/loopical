'use client'

import { useRef, useCallback, useEffect } from 'react'

export function useAudioVisualizer(
  analyserNode: AnalyserNode | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const animationFrameRef = useRef<number>(0)

  const draw = useCallback(() => {
    if (!analyserNode || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserNode.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render)
      analyserNode.getByteFrequencyData(dataArray)

      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      const barCount = 40
      const barWidth = width / barCount - 2
      const step = Math.floor(bufferLength / barCount)

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step]
        const barHeight = (value / 255) * height * 0.8
        const x = i * (barWidth + 2)
        const y = (height - barHeight) / 2

        ctx.fillStyle = `oklch(0.637 0.237 25.331 / ${0.3 + (value / 255) * 0.7})`
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 2)
        ctx.fill()
      }
    }

    render()
  }, [analyserNode, canvasRef])

  useEffect(() => {
    if (analyserNode) {
      draw()
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [analyserNode, draw])
}
