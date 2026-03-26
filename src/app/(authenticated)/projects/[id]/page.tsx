import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LoopicalCard } from '@/components/loopical-card'
import { EmptyState } from '@/components/empty-state'
import { ShareLink } from '@/components/share-link'
import { CreateLoopicalDialog } from '@/components/create-loopical-dialog'
import { createLoopical } from './actions'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) {
    notFound()
  }

  const { data: loopicals } = await supabase
    .from('loopicals')
    .select('*, feedback_entries(count)')
    .eq('project_id', id)
    .order('order_index', { ascending: true })

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Projekten
      </Link>

      {/* Project Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ShareLink shareToken={project.share_token} />
          <CreateLoopicalDialog projectId={id} action={createLoopical} />
        </div>
      </div>

      {/* Loopicals List */}
      {!loopicals || loopicals.length === 0 ? (
        <EmptyState
          title="Noch keine Loopicals"
          description="Erstelle Feedback-Punkte, zu denen dein Team Voice-Feedback geben kann."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loopicals.map((loopical) => (
            <LoopicalCard
              key={loopical.id}
              projectId={id}
              loopical={{
                id: loopical.id,
                title: loopical.title,
                description: loopical.description,
                media_url: loopical.media_url,
                status: loopical.status,
                feedbackCount:
                  (
                    loopical.feedback_entries as unknown as {
                      count: number
                    }[]
                  )?.[0]?.count ?? 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
