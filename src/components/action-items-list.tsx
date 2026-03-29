'use client'

import { useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Circle,
  Clock,
  CheckCircle2,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  MessageSquare,
} from 'lucide-react'
import { updateActionItemStatus } from '@/app/(authenticated)/action-items/actions'
import { toast } from 'sonner'
import type { ActionItemStatus } from '@/lib/types/database'

interface ActionItemData {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'done'
  assignee_id: string | null
  created_at: string
  feedback_entry_id: string
  feedback_author: string
  loopical_id: string
  loopical_title: string
  project_id: string
  project_name: string
  project_color: string
}

interface ActionItemsListProps {
  items: ActionItemData[]
  projects: Array<{ id: string; name: string; color: string }>
  currentFilters: {
    status: string
    priority: string
    project: string
  }
}

const statusConfig = {
  open: { label: 'Offen', icon: Circle, className: 'text-muted-foreground' },
  in_progress: { label: 'In Arbeit', icon: Clock, className: 'text-blue-500' },
  done: { label: 'Erledigt', icon: CheckCircle2, className: 'text-green-500' },
} as const

const priorityConfig = {
  high: { label: 'Hoch', icon: ArrowUpCircle, className: 'text-red-500' },
  medium: { label: 'Mittel', icon: ArrowRightCircle, className: 'text-yellow-500' },
  low: { label: 'Niedrig', icon: ArrowDownCircle, className: 'text-muted-foreground' },
} as const

const nextStatus: Record<ActionItemStatus, ActionItemStatus> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'open',
}

export function ActionItemsList({ items, projects, currentFilters }: ActionItemsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function buildFilterUrl(key: string, value: string) {
    const params = new URLSearchParams()
    const filters = { ...currentFilters, [key]: value }
    for (const [k, v] of Object.entries(filters)) {
      if (v && v !== 'all') params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function handleStatusToggle(itemId: string, currentStatus: ActionItemStatus) {
    startTransition(async () => {
      const result = await updateActionItemStatus(itemId, nextStatus[currentStatus])
      if (result.error) toast.error(result.error)
    })
  }

  const counts = {
    all: items.length,
    open: items.filter((i) => i.status === 'open').length,
    in_progress: items.filter((i) => i.status === 'in_progress').length,
    done: items.filter((i) => i.status === 'done').length,
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Status filter */}
        <div className="flex gap-1 rounded-lg border p-1">
          {(['all', 'open', 'in_progress', 'done'] as const).map((s) => (
            <Link
              key={s}
              href={buildFilterUrl('status', s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currentFilters.status === s
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'Alle' : statusConfig[s].label} ({counts[s]})
            </Link>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex gap-1 rounded-lg border p-1">
          {(['all', 'high', 'medium', 'low'] as const).map((p) => (
            <Link
              key={p}
              href={buildFilterUrl('priority', p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currentFilters.priority === p
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {p === 'all' ? 'Alle' : priorityConfig[p].label}
            </Link>
          ))}
        </div>

        {/* Project filter */}
        {projects.length > 1 && (
          <div className="flex gap-1 rounded-lg border p-1">
            <Link
              href={buildFilterUrl('project', 'all')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currentFilters.project === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              Alle Projekte
            </Link>
            {projects.map((p) => (
              <Link
                key={p.id}
                href={buildFilterUrl('project', p.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  currentFilters.project === p.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full mr-1.5"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Keine Action Items gefunden.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const sc = statusConfig[item.status]
            const pc = priorityConfig[item.priority]
            const StatusIcon = sc.icon
            const PriorityIcon = pc.icon

            return (
              <div
                key={item.id}
                className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                  item.status === 'done' ? 'opacity-60' : ''
                }`}
              >
                {/* Status toggle button */}
                <button
                  onClick={() => handleStatusToggle(item.id, item.status)}
                  className={`mt-0.5 shrink-0 transition-colors hover:opacity-80 ${sc.className}`}
                  title={`Status: ${sc.label} → ${statusConfig[nextStatus[item.status]].label}`}
                  disabled={isPending}
                >
                  <StatusIcon className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                    {item.text}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-5"
                      style={{
                        borderColor: item.project_color + '40',
                        color: item.project_color,
                      }}
                    >
                      {item.project_name}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {item.loopical_title}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {item.feedback_author}
                    </span>
                  </div>
                </div>

                {/* Priority */}
                <div className={`shrink-0 ${pc.className}`} title={`Priorität: ${pc.label}`}>
                  <PriorityIcon className="h-4 w-4" />
                </div>

                {/* Link to source */}
                <Link
                  href={`/projects/${item.project_id}/loopicals/${item.loopical_id}`}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Quelle →
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
