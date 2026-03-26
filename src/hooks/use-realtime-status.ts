'use client'

import { useEffect, useState, useCallback } from 'react'
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

    const interval = setInterval(async () => {
      const newStatus = await poll()
      if (newStatus === 'complete' || newStatus === 'error') {
        clearInterval(interval)
        if (newStatus === 'complete') {
          options?.onComplete?.()
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [entryId, initialStatus, poll, options])

  return status
}
