'use client'

import { updateLoopicalStatus } from '@/app/(authenticated)/projects/[id]/loopicals/[loopicalId]/actions'
import type { LoopicalStatus } from '@/lib/types/database'
import { useTransition } from 'react'

const statuses: { value: LoopicalStatus; label: string }[] = [
  { value: 'open', label: 'Offen' },
  { value: 'in_progress', label: 'In Arbeit' },
  { value: 'done', label: 'Erledigt' },
]

interface StatusSelectorProps {
  loopicalId: string
  projectId: string
  currentStatus: LoopicalStatus
}

export function StatusSelector({
  loopicalId,
  projectId,
  currentStatus,
}: StatusSelectorProps) {
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    startTransition(async () => {
      await updateLoopicalStatus(loopicalId, projectId, e.target.value as LoopicalStatus)
    })
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      {statuses.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  )
}
