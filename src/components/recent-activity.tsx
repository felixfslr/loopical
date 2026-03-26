import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

const sentimentConfig = {
  positive: { label: 'Positiv', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  neutral: { label: 'Neutral', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  critical: { label: 'Kritisch', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
} as const

const statusDot: Record<string, string> = {
  complete: 'bg-green-500',
  error: 'bg-red-500',
  pending: 'bg-yellow-500 animate-pulse',
  transcribing: 'bg-yellow-500 animate-pulse',
  analyzing: 'bg-yellow-500 animate-pulse',
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMin = Math.floor((now - then) / 60000)

  if (diffMin < 1) return 'Gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `vor ${diffH} Std.`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Gestern'
  return `vor ${diffD} Tagen`
}

interface ActivityEntry {
  id: string
  created_at: string
  sentiment: string | null
  processing_status: string
  guest_name: string | null
  loopical_title: string
  project_name: string
  project_color: string
  project_id: string
  loopical_id: string
}

interface RecentActivityProps {
  entries: ActivityEntry[]
}

export function RecentActivity({ entries }: RecentActivityProps) {
  if (entries.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4">Letzte Aktivität</h2>
      <div className="space-y-2">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/projects/${entry.project_id}/loopicals/${entry.loopical_id}`}
            className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
          >
            {/* Project color dot */}
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.project_color }}
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                <span className="font-medium">{entry.project_name}</span>
                <span className="text-muted-foreground"> · {entry.loopical_title}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.guest_name ?? 'Anonym'} · {relativeTime(entry.created_at)}
              </p>
            </div>

            {/* Status + Sentiment */}
            <div className="flex items-center gap-2 shrink-0">
              {entry.sentiment && entry.sentiment in sentimentConfig && (
                <Badge
                  variant="outline"
                  className={sentimentConfig[entry.sentiment as keyof typeof sentimentConfig].className + ' text-xs'}
                >
                  {sentimentConfig[entry.sentiment as keyof typeof sentimentConfig].label}
                </Badge>
              )}
              <div
                className={`h-2 w-2 rounded-full ${statusDot[entry.processing_status] ?? 'bg-muted'}`}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
