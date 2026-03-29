import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProjectCard } from '@/components/project-card'
import { EmptyState } from '@/components/empty-state'
import { DashboardStats } from '@/components/dashboard-stats'
import { RecentActivity } from '@/components/recent-activity'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const user = await requireUser()
  const supabase = createAdminClient()

  let projectsQuery = supabase
    .from('projects')
    .select('*, loopicals(count)')
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (q?.trim()) {
    projectsQuery = projectsQuery.ilike('name', `%${q.trim()}%`)
  }

  const [{ data: projects }, { data: archivedProjects }] = await Promise.all([
    projectsQuery,
    supabase
      .from('projects')
      .select('*, loopicals(count)')
      .eq('owner_id', user.id)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false }),
  ])

  // Fetch feedback data for insights
  const projectIds = (projects ?? []).map((p) => p.id)

  let totalFeedback = 0
  const sentimentCounts = { positive: 0, neutral: 0, critical: 0 }
  let openActionItems = 0
  const activityEntries: Array<{
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
  }> = []

  if (projectIds.length > 0) {
    // Get loopicals for all projects
    const { data: loopicals } = await supabase
      .from('loopicals')
      .select('id, title, project_id')
      .in('project_id', projectIds)

    const loopicalIds = (loopicals ?? []).map((l) => l.id)

    if (loopicalIds.length > 0) {
      const { data: feedback } = await supabase
        .from('feedback_entries')
        .select('id, processing_status, sentiment, action_items, created_at, guest_name, loopical_id')
        .in('loopical_id', loopicalIds)
        .order('created_at', { ascending: false })
        .limit(50)

      // Build lookup maps
      const projectMap = new Map(
        (projects ?? []).map((p) => [p.id, { name: p.name, color: p.color }])
      )
      const loopicalMap = new Map(
        (loopicals ?? []).map((l) => [l.id, { title: l.title, project_id: l.project_id }])
      )

      for (const entry of feedback ?? []) {
        totalFeedback++

        if (entry.sentiment === 'positive') sentimentCounts.positive++
        else if (entry.sentiment === 'neutral') sentimentCounts.neutral++
        else if (entry.sentiment === 'critical') sentimentCounts.critical++

        if (entry.action_items && Array.isArray(entry.action_items)) {
          for (const item of entry.action_items as Array<{ done: boolean }>) {
            if (!item.done) openActionItems++
          }
        }

        // Build activity entries (first 5)
        if (activityEntries.length < 5) {
          const loopical = loopicalMap.get(entry.loopical_id)
          const project = loopical ? projectMap.get(loopical.project_id) : null
          if (loopical && project) {
            activityEntries.push({
              id: entry.id,
              created_at: entry.created_at,
              sentiment: entry.sentiment,
              processing_status: entry.processing_status,
              guest_name: entry.guest_name,
              loopical_title: loopical.title,
              project_name: project.name,
              project_color: project.color,
              project_id: loopical.project_id,
              loopical_id: entry.loopical_id,
            })
          }
        }
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projekte</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Verwalte deine Feedback-Projekte
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neues Projekt
          </Button>
        </Link>
      </div>

      {projects && projects.length > 0 && totalFeedback > 0 && (
        <DashboardStats
          totalFeedback={totalFeedback}
          sentimentCounts={sentimentCounts}
          openActionItems={openActionItems}
        />
      )}

      <RecentActivity entries={activityEntries} />

      {!projects || (projects.length === 0 && !q) ? (
        <EmptyState
          title="Noch keine Projekte"
          description="Erstelle dein erstes Projekt und beginne, Voice-Feedback zu sammeln."
          actionLabel="Projekt erstellen"
          actionHref="/projects/new"
        />
      ) : (
        <>
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold">Alle Projekte</h2>
            <div className="w-64">
              <SearchInput placeholder="Projekte suchen..." />
            </div>
          </div>
          {projects && projects.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={{
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    color: project.color,
                    loopicalCount:
                      (project.loopicals as unknown as { count: number }[])?.[0]
                        ?.count ?? 0,
                    createdAt: project.created_at,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Keine Projekte gefunden für &ldquo;{q}&rdquo;
              </p>
            </div>
          )}
        </>
      )}

      {/* Archived Projects */}
      {archivedProjects && archivedProjects.length > 0 && (
        <details className="mt-12">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground select-none list-none [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              Archivierte Projekte ({archivedProjects.length})
              <span className="text-xs transition-transform group-open:rotate-90">▸</span>
            </span>
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archivedProjects.map((project) => (
              <div key={project.id} className="opacity-60">
                <ProjectCard
                  project={{
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    color: project.color,
                    loopicalCount:
                      (project.loopicals as unknown as { count: number }[])?.[0]
                        ?.count ?? 0,
                    createdAt: project.created_at,
                  }}
                />
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
