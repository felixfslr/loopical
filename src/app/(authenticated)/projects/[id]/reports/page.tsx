import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ReportView } from '@/components/report-view'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ProjectReportsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireUser()
  const { id: projectId } = await params
  const admin = createAdminClient()

  const { data: project } = await admin
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('owner_id', user.id)
    .single()

  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">Projekt nicht gefunden.</div>
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <h1 className="text-xl font-bold">{project.name} — Feedback Reports</h1>
      </div>

      <ReportView projectId={projectId} projectName={project.name} />
    </div>
  )
}
