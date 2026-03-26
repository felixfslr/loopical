'use client'

import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function LoopicalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertCircle className="h-10 w-10 text-destructive/50 mb-4" />
      <h2 className="text-lg font-semibold mb-2">Fehler beim Laden</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Das Loopical konnte nicht geladen werden.
      </p>
      <Button onClick={reset} variant="outline">
        Erneut versuchen
      </Button>
    </div>
  )
}
