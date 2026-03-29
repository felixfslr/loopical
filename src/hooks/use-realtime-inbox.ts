'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribe to new feedback entries for the user's loopicals.
 * Triggers a router refresh when new feedback arrives.
 */
export function useRealtimeInbox(loopicalIds: string[]) {
  const router = useRouter()

  useEffect(() => {
    if (loopicalIds.length === 0) return

    const supabase = createClient()
    const channel = supabase
      .channel('inbox-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback_entries',
        },
        (payload) => {
          const entry = payload.new as { loopical_id: string }
          if (loopicalIds.includes(entry.loopical_id)) {
            router.refresh()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loopicalIds, router])
}
