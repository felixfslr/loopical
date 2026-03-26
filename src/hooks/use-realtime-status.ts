'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ProcessingStatus } from '@/lib/types/database'

export function useRealtimeStatus(
  entryId: string,
  initialStatus: ProcessingStatus,
) {
  const [status, setStatus] = useState<ProcessingStatus>(initialStatus)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/feedback-status?id=${entryId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.status) {
          setStatus(data.status)
          return data.status
        }
      }
    } catch {
      // ignore polling errors
    }
    return null
  }, [entryId])

  useEffect(() => {
    if (initialStatus === 'complete' || initialStatus === 'error') return

    // Poll every 2 seconds until complete or error
    const interval = setInterval(async () => {
      const newStatus = await poll()
      if (newStatus === 'complete' || newStatus === 'error') {
        clearInterval(interval)
        // Reload page to show full results
        if (newStatus === 'complete') {
          window.location.reload()
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [entryId, initialStatus, poll])

  return status
}
