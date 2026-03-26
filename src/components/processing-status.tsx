'use client'

import { useRealtimeStatus } from '@/hooks/use-realtime-status'
import type { ProcessingStatus } from '@/lib/types/database'
import { AiLoader } from '@/components/ui/ai-loader'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'framer-motion'

const statusMessages: Record<ProcessingStatus, string> = {
  pending: 'Verarbeitung startet...',
  transcribing: 'Transkribiere',
  analyzing: 'Analysiere',
  complete: '',
  error: 'Verarbeitung fehlgeschlagen',
}

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: 'easeInOut' as const },
}

interface ProcessingStatusProps {
  entryId: string
  initialStatus: ProcessingStatus
  onRetry?: () => void
  onComplete?: () => void
  children: React.ReactNode
}

export function ProcessingStatusWrapper({
  entryId,
  initialStatus,
  onRetry,
  onComplete,
  children,
}: ProcessingStatusProps) {
  const status = useRealtimeStatus(entryId, initialStatus, { onComplete })

  return (
    <AnimatePresence mode="wait">
      {status === 'complete' ? (
        <motion.div key="complete" {...fadeSlide}>
          {children}
        </motion.div>
      ) : status === 'error' ? (
        <motion.div key="error" {...fadeSlide}>
          <div className="flex items-center gap-3 rounded-md bg-destructive/10 p-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive">
              {statusMessages.error}
            </span>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Erneut versuchen
              </Button>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div key={`processing-${status}`} {...fadeSlide}>
          <div className="flex flex-col items-center gap-3 rounded-md bg-muted/50 p-6">
            <AiLoader size={100} text={statusMessages[status]} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
