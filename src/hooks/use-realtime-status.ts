'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProcessingStatus } from '@/lib/types/database'

export function useRealtimeStatus(
  entryId: string,
  initialStatus: ProcessingStatus,
) {
  const [status, setStatus] = useState<ProcessingStatus>(initialStatus)

  useEffect(() => {
    if (initialStatus === 'complete' || initialStatus === 'error') return

    const supabase = createClient()

    const channel = supabase
      .channel(`feedback-${entryId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feedback_entries',
          filter: `id=eq.${entryId}`,
        },
        (payload) => {
          const newStatus = payload.new.processing_status as ProcessingStatus
          setStatus(newStatus)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [entryId, initialStatus])

  return status
}
