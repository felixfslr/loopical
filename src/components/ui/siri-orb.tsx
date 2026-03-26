"use client"

import { cn } from "@/lib/utils";
import { motion, useMotionValue, useTransform, type MotionValue } from "framer-motion"

interface SiriOrbProps {
  size?: string
  className?: string
  colors?: {
    bg?: string
    c1?: string
    c2?: string
    c3?: string
  }
  animationDuration?: number
  amplitude?: MotionValue<number>
}

export const SiriOrb: React.FC<SiriOrbProps> = ({
  size = "192px",
  className,
  colors,
  animationDuration = 20,
  amplitude,
}) => {
  const defaultColors = {
    bg: "transparent",
    c1: "oklch(75% 0.15 350)",
    c2: "oklch(80% 0.12 200)",
    c3: "oklch(78% 0.14 280)",
  }

  const finalColors = { ...defaultColors, ...colors }
  const sizeValue = parseInt(size.replace("px", ""), 10)

  const blurAmount = Math.max(sizeValue * 0.08, 8)
  const contrastAmount = Math.max(sizeValue * 0.003, 1.8)

  // Fallback motionValue when no amplitude is provided
  const zero = useMotionValue(0)
  const amp = amplitude ?? zero

  const scale = useTransform(amp, [0, 1], [1.0, 1.15])
  const saturate = useTransform(amp, [0, 1], [1.2, 2.0])
  const filterStyle = useTransform(saturate, (s) => `saturate(${s})`)

  const cssVars = {
    "--bg": finalColors.bg,
    "--c1": finalColors.c1,
    "--c2": finalColors.c2,
    "--c3": finalColors.c3,
    "--animation-duration": `${animationDuration}s`,
    "--blur-amount": `${blurAmount}px`,
    "--contrast-amount": contrastAmount,
  } as React.CSSProperties

  return (
    <motion.div
      className={cn("siri-orb", className)}
      style={{
        width: size,
        height: size,
        ...cssVars,
        scale,
        filter: filterStyle,
      }}
    />
  )
}

export default SiriOrb
