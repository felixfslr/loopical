'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProcessingStatus } from '@/lib/types/database'

interface UseRealtimeStatusOptions {
  onComplete?: () => void
}

export function useRealtimeStatus(
  entryId: string,
  initialStatus: ProcessingStatus,
  options?: UseRealtimeStatusOptions,
) {
  const [status, setStatus] = useState<ProcessingStatus>(initialStatus)
  const onCompleteRef = useRef(options?.onComplete)
  onCompleteRef.current = options?.onComplete

  useEffect(() => {
    if (initialStatus === 'complete' || initialStatus === 'error') return

    const supabase = createClient()
    const channel = supabase
      .channel(`feedback-entry-${entryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feedback_entries',
          filter: `id=eq.${entryId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any).processing_status as ProcessingStatus
          setStatus(newStatus)
          if (newStatus === 'complete') {
            onCompleteRef.current?.()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [entryId, initialStatus])

  return status
}
