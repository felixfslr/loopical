'use client'

import { useRealtimeStatus } from '@/hooks/use-realtime-status'
import type { ProcessingStatus } from '@/lib/types/database'
import { AiLoader } from '@/components/ui/ai-loader'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const statusMessages: Record<ProcessingStatus, string> = {
  pending: 'Verarbeitung startet...',
  transcribing: 'Transkribiere',
  analyzing: 'Analysiere',
  complete: '',
  error: 'Verarbeitung fehlgeschlagen',
}

interface ProcessingStatusProps {
  entryId: string
  initialStatus: ProcessingStatus
  onRetry?: () => void
  children: React.ReactNode // Shown when complete
}

export function ProcessingStatusWrapper({
  entryId,
  initialStatus,
  onRetry,
  children,
}: ProcessingStatusProps) {
  const status = useRealtimeStatus(entryId, initialStatus)

  if (status === 'complete') {
    return <>{children}</>
  }

  if (status === 'error') {
    return (
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
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-md bg-muted/50 p-6">
      <AiLoader size={100} text={statusMessages[status]} />
    </div>
  )
}
