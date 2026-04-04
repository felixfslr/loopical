import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { LoopicalCard } from '@/components/loopical-card'
import { EmptyState } from '@/components/empty-state'
import { ShareDialog } from '@/components/share-dialog'
import { DropZoneUploader } from '@/components/drop-zone-uploader'
import { ProjectActionsMenu } from '@/components/project-actions-menu'
import { ArchivedBanner } from '@/components/archived-banner'
import { ArrowLeft, Plus, BarChart3, FileText } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
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

      {project.archived_at && <ArchivedBanner projectId={id} />}

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
          <Link
            href={`/projects/${id}/analytics`}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>
          <Link
            href={`/projects/${id}/reports`}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Reports
          </Link>
          <ShareDialog
            shareToken={project.share_token}
            projectName={project.name}
            loopicalCount={loopicals?.length ?? 0}
          />
          <Link
            href={`/projects/${id}/loopicals/new`}
            className="group/button inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 transition-all outline-none select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Neues Loopical
          </Link>
          <ProjectActionsMenu projectId={id} />
        </div>
      </div>

      {/* Drop Zone */}
      <div className="mb-6">
        <DropZoneUploader projectId={id} />
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
