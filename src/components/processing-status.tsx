'use client'

import { useRealtimeStatus } from '@/hooks/use-realtime-status'
import type { ProcessingStatus } from '@/lib/types/database'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const statusMessages: Record<ProcessingStatus, string> = {
  pending: 'Warte auf Verarbeitung...',
  transcribing: 'Transkribiere Audio...',
  analyzing: 'Analysiere Feedback mit AI...',
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
    <div className="flex items-center gap-3 rounded-md bg-muted/50 p-3">
      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
      <span className="text-sm text-muted-foreground">
        {statusMessages[status]}
      </span>
    </div>
  )
}
