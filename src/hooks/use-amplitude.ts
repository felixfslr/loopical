'use client'

import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

export function useAmplitude(analyserNode: AnalyserNode | null) {
  const rawAmplitude = useMotionValue(0)
  const amplitude = useSpring(rawAmplitude, { stiffness: 300, damping: 30 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!analyserNode) {
      rawAmplitude.set(0)
      return
    }

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount)

    function tick() {
      analyserNode!.getByteFrequencyData(dataArray)
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / dataArray.length) / 255
      rawAmplitude.set(rms)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      rawAmplitude.set(0)
    }
  }, [analyserNode, rawAmplitude])

  return amplitude
}
