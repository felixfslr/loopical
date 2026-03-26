import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { MessageSquare } from 'lucide-react'
import type { LoopicalStatus } from '@/lib/types/database'

interface LoopicalCardProps {
  projectId: string
  loopical: {
    id: string
    title: string
    description: string | null
    media_url: string | null
    status: LoopicalStatus
    feedbackCount: number
  }
}

export function LoopicalCard({ projectId, loopical }: LoopicalCardProps) {
  return (
    <Link href={`/projects/${projectId}/loopicals/${loopical.id}`}>
      <Card className="group cursor-pointer transition-colors hover:border-foreground/20">
        {loopical.media_url && (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
            <img
              src={loopical.media_url}
              alt={loopical.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <CardContent className={loopical.media_url ? 'pt-3' : ''}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium truncate">{loopical.title}</h3>
            <StatusBadge status={loopical.status} />
          </div>
          {loopical.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {loopical.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
            <MessageSquare className="h-3 w-3" />
            <span>
              {loopical.feedbackCount}{' '}
              {loopical.feedbackCount === 1 ? 'Feedback' : 'Feedbacks'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
