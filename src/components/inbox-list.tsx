'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRealtimeInbox } from '@/hooks/use-realtime-inbox'
import { markAsRead, markAsUnread, bulkMarkAsRead } from '@/app/(authenticated)/inbox/actions'
import { toast } from 'sonner'
import {
  Circle,
  CheckCircle2,
  Video,
  Mic,
  ListChecks,
  Eye,
  EyeOff,
} from 'lucide-react'

const sentimentConfig = {
  positive: { label: 'Positiv', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  neutral: { label: 'Neutral', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  critical: { label: 'Kritisch', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
} as const

interface InboxEntry {
  id: string
  summary: string | null
  sentiment: 'positive' | 'neutral' | 'critical' | null
  processing_status: string
  guest_name: string | null
  author_name: string | null
  priority_score: number
  is_read: boolean
  media_type: 'audio' | 'video'
  action_item_count: number
  created_at: string
  loopical_id: string
  loopical_title: string
  project_id: string
  project_name: string
  project_color: string
}

interface InboxListProps {
  entries: InboxEntry[]
  projects: Array<{ id: string; name: string; color: string }>
  loopicalIds: string[]
  currentFilters: {
    project: string
    sentiment: string
    read: string
  }
}

export function InboxList({ entries, projects, loopicalIds, currentFilters }: InboxListProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // Realtime: refresh on new feedback
  useRealtimeInbox(loopicalIds)

  function buildFilterUrl(key: string, value: string) {
    const params = new URLSearchParams()
    const filters = { ...currentFilters, [key]: value }
    for (const [k, v] of Object.entries(filters)) {
      if (v && v !== 'all') params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function handleMarkAsRead(entryId: string) {
    startTransition(async () => {
      const result = await markAsRead(entryId)
      if (result.error) toast.error(result.error)
    })
  }

  function handleMarkAsUnread(entryId: string) {
    startTransition(async () => {
      const result = await markAsUnread(entryId)
      if (result.error) toast.error(result.error)
    })
  }

  function handleMarkAllAsRead() {
    const unreadIds = entries.filter((e) => !e.is_read).map((e) => e.id)
    if (unreadIds.length === 0) return
    startTransition(async () => {
      const result = await bulkMarkAsRead(unreadIds)
      if (result.error) toast.error(result.error)
    })
  }

  const unreadCount = entries.filter((e) => !e.is_read).length

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Read/Unread filter */}
        <div className="flex gap-1 rounded-lg border p-1">
          {(['all', 'unread', 'read'] as const).map((r) => (
            <Link
              key={r}
              href={buildFilterUrl('read', r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currentFilters.read === r
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {r === 'all' ? 'Alle' : r === 'unread' ? 'Ungelesen' : 'Gelesen'}
            </Link>
          ))}
        </div>

        {/* Sentiment filter */}
        <div className="flex gap-1 rounded-lg border p-1">
          {(['all', 'critical', 'neutral', 'positive'] as const).map((s) => (
            <Link
              key={s}
              href={buildFilterUrl('sentiment', s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                currentFilters.sentiment === s
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'Alle' : sentimentConfig[s].label}
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

        {/* Bulk actions */}
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
            className="ml-auto"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Alle als gelesen ({unreadCount})
          </Button>
        )}
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Keine Feedbacks gefunden.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => {
            const authorName = entry.guest_name || entry.author_name || 'Anonym'
            const date = new Date(entry.created_at)
            const isProcessing = entry.processing_status !== 'complete' && entry.processing_status !== 'error'

            return (
              <div
                key={entry.id}
                className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                  !entry.is_read ? 'bg-primary/[0.02] border-primary/20' : ''
                }`}
              >
                {/* Unread indicator */}
                <div className="mt-1.5 shrink-0">
                  {!entry.is_read ? (
                    <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                  ) : (
                    <div className="h-2.5 w-2.5" />
                  )}
                </div>

                {/* Content */}
                <Link
                  href={`/projects/${entry.project_id}/loopicals/${entry.loopical_id}`}
                  className="flex-1 min-w-0"
                  onClick={() => !entry.is_read && handleMarkAsRead(entry.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 h-5 shrink-0"
                      style={{
                        borderColor: entry.project_color + '40',
                        color: entry.project_color,
                      }}
                    >
                      {entry.project_name}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {entry.loopical_title}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {date.toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${!entry.is_read ? '' : 'text-muted-foreground'}`}>
                      {authorName}
                    </span>
                    {entry.media_type === 'video' ? (
                      <Video className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Mic className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  {entry.summary && !isProcessing && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                      {entry.summary}
                    </p>
                  )}
                  {isProcessing && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                      Wird verarbeitet...
                    </p>
                  )}
                </Link>

                {/* Meta */}
                <div className="flex items-center gap-2 shrink-0">
                  {entry.action_item_count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ListChecks className="h-3 w-3" />
                      {entry.action_item_count}
                    </span>
                  )}
                  {entry.sentiment && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 h-5 ${sentimentConfig[entry.sentiment].className}`}
                    >
                      {sentimentConfig[entry.sentiment].label}
                    </Badge>
                  )}
                  {/* Read/Unread toggle */}
                  <button
                    onClick={() => entry.is_read ? handleMarkAsUnread(entry.id) : handleMarkAsRead(entry.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    title={entry.is_read ? 'Als ungelesen markieren' : 'Als gelesen markieren'}
                    disabled={isPending}
                  >
                    {entry.is_read ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
