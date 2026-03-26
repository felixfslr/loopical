'use client'

import { motion } from 'framer-motion'
import { ProcessingStatusWrapper } from '@/components/processing-status'
import { User } from 'lucide-react'

interface OptimisticFeedbackCardProps {
  entryId: string
  onComplete: () => void
}

export function OptimisticFeedbackCard({
  entryId,
  onComplete,
}: OptimisticFeedbackCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium">Du</span>
        <span className="text-xs text-muted-foreground">Gerade eben</span>
      </div>

      {/* Processing Status */}
      <ProcessingStatusWrapper
        entryId={entryId}
        initialStatus="pending"
        onComplete={onComplete}
      >
        <div />
      </ProcessingStatusWrapper>
    </motion.div>
  )
}
