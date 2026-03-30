'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Circle,
  Clock,
  CheckCircle2,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  MessageSquare,
  Pencil,
  Check,
  X as XIcon,
} from 'lucide-react'
import { updateActionItemStatus, updateActionItemText } from '@/app/(authenticated)/action-items/actions'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkStatusChange(status: ActionItemStatus) {
    startTransition(async () => {
      for (const id of selectedIds) {
        const result = await updateActionItemStatus(id, status)
        if (result.error) {
          toast.error(result.error)
          return
        }
      }
      setSelectedIds(new Set())
    })
  }

  function startEditing(item: ActionItemData) {
    setEditingId(item.id)
    setEditText(item.text)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditText('')
  }

  function saveEdit(itemId: string) {
    if (!editText.trim()) return
    startTransition(async () => {
      const result = await updateActionItemText(itemId, editText.trim())
      if (result.error) {
        toast.error(result.error)
        return
      }
      setEditingId(null)
      setEditText('')
    })
  }

  const counts = {
    all: items.length,
    open: items.filter((i) => i.status === 'open').length,
    in_progress: items.filter((i) => i.status === 'in_progress').length,
    done: items.filter((i) => i.status === 'done').length,
  }

  const hasSelection = selectedIds.size > 0

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

      {/* Bulk action bar */}
      {hasSelection && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
          <span className="text-xs font-medium">{selectedIds.size} ausgewählt</span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleBulkStatusChange('done')}>
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Erledigt
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleBulkStatusChange('in_progress')}>
            <Clock className="mr-1 h-3 w-3" />
            In Arbeit
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
            Abbrechen
          </Button>
        </div>
      )}

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
            const isEditing = editingId === item.id
            const isSelected = selectedIds.has(item.id)

            return (
              <div
                key={item.id}
                className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                  item.status === 'done' ? 'opacity-60' : ''
                } ${isSelected ? 'border-primary/50 bg-primary/5' : ''}`}
              >
                {/* Checkbox for bulk select */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(item.id)}
                  className="mt-1 shrink-0 accent-primary"
                />

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
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(item.id)
                          if (e.key === 'Escape') cancelEditing()
                        }}
                      />
                      <Button variant="ghost" size="icon-sm" onClick={() => saveEdit(item.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={cancelEditing}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p
                      className={`text-sm ${item.status === 'done' ? 'line-through text-muted-foreground' : ''}`}
                      onDoubleClick={() => startEditing(item)}
                    >
                      {item.text}
                    </p>
                  )}
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

                {/* Edit button */}
                {!isEditing && (
                  <button
                    onClick={() => startEditing(item)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    title="Bearbeiten"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}

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
