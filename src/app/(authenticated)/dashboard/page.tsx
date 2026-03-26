import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/project-card'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, loopicals(count)')
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

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

      {!projects || projects.length === 0 ? (
        <EmptyState
          title="Noch keine Projekte"
          description="Erstelle dein erstes Projekt und beginne, Voice-Feedback zu sammeln."
          actionLabel="Projekt erstellen"
          actionHref="/projects/new"
        />
      ) : (
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
      )}
    </div>
  )
}
