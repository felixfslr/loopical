import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { MessageSquare, Mic } from 'lucide-react'
import type { LoopicalStatus } from '@/lib/types/database'

export default async function GuestFeedbackPage({
  params,
}: {
  params: Promise<{ share_token: string }>
}) {
  const { share_token } = await params
  const admin = createAdminClient()

  // Get project via share token
  const { data: projects } = await admin.rpc('get_project_by_share_token', {
    token: share_token,
  })

  const project = projects?.[0]
  if (!project) {
    notFound()
  }

  // Get loopicals
  const { data: loopicals } = await admin.rpc('get_loopicals_by_share_token', {
    token: share_token,
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-sm text-muted-foreground mb-2">Feedback für</p>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {project.description}
            </p>
          )}
        </div>

        {/* Loopicals List */}
        {!loopicals || loopicals.length === 0 ? (
          <div className="text-center py-12">
            <Mic className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Noch keine Feedback-Punkte vorhanden.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Wähle einen Punkt aus, um Voice-Feedback zu geben:
            </p>
            {loopicals.map((loopical: any) => (
              <Link
                key={loopical.id}
                href={`/feedback/${share_token}/${loopical.id}`}
              >
                <Card className="group cursor-pointer transition-colors hover:border-foreground/20">
                  <CardContent className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">
                        {loopical.title}
                      </h3>
                      {loopical.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {loopical.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {loopical.feedback_count}
                      </span>
                      <Mic className="h-4 w-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <span className="font-medium text-foreground">Loopical</span>
          </p>
        </div>
      </div>
    </div>
  )
}
