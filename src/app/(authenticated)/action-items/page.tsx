import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ActionItemsList } from '@/components/action-items-list'

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    priority?: string
    project?: string
  }>
}) {
  const { status, priority, project } = await searchParams
  const user = await requireUser()
  const supabase = createAdminClient()

  // Get all projects the user owns or is a member of
  const [{ data: ownedProjects }, { data: memberships }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, color')
      .eq('owner_id', user.id)
      .is('archived_at', null),
    supabase
      .from('project_members')
      .select('project_id, projects(id, name, color)')
      .eq('user_id', user.id),
  ])

  const projectMap = new Map<string, { name: string; color: string }>()
  for (const p of ownedProjects ?? []) {
    projectMap.set(p.id, { name: p.name, color: p.color })
  }
  for (const m of memberships ?? []) {
    const p = m.projects as unknown as { id: string; name: string; color: string } | null
    if (p) projectMap.set(p.id, { name: p.name, color: p.color })
  }

  const projectIds = Array.from(projectMap.keys())
  if (projectIds.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Action Items</h1>
        <p className="text-sm text-muted-foreground">Noch keine Projekte vorhanden.</p>
      </div>
    )
  }

  // Get loopicals for user's projects
  const { data: loopicals } = await supabase
    .from('loopicals')
    .select('id, title, project_id')
    .in('project_id', projectIds)

  const loopicalIds = (loopicals ?? []).map((l) => l.id)
  const loopicalMap = new Map(
    (loopicals ?? []).map((l) => [l.id, { title: l.title, project_id: l.project_id }]),
  )

  if (loopicalIds.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Action Items</h1>
        <p className="text-sm text-muted-foreground">Noch keine Loopicals vorhanden.</p>
      </div>
    )
  }

  // Fetch action items via feedback_entries join
  let query = supabase
    .from('action_items')
    .select(`
      *,
      feedback_entries!inner(
        id, loopical_id, guest_name, created_at,
        profiles:author_id(full_name)
      )
    `)
    .order('created_at', { ascending: false })

  // Filter by status
  if (status && status !== 'all') {
    query = query.eq('status', status as 'open' | 'in_progress' | 'done')
  }

  // Filter by priority
  if (priority && priority !== 'all') {
    query = query.eq('priority', priority as 'high' | 'medium' | 'low')
  }

  const { data: actionItems } = await query

  // Filter to only items that belong to the user's projects
  const items = (actionItems ?? [])
    .map((item) => {
      const entry = item.feedback_entries as unknown as {
        id: string
        loopical_id: string
        guest_name: string | null
        created_at: string
        profiles: { full_name: string } | null
      }
      const loopical = loopicalMap.get(entry.loopical_id)
      if (!loopical) return null
      const proj = projectMap.get(loopical.project_id)
      if (!proj) return null

      // Filter by project if specified
      if (project && project !== 'all' && loopical.project_id !== project) return null

      return {
        id: item.id,
        text: item.text,
        priority: item.priority as 'high' | 'medium' | 'low',
        status: item.status as 'open' | 'in_progress' | 'done',
        assignee_id: item.assignee_id,
        created_at: item.created_at,
        feedback_entry_id: item.feedback_entry_id,
        feedback_author: entry.profiles?.full_name ?? entry.guest_name ?? 'Anonym',
        loopical_id: entry.loopical_id,
        loopical_title: loopical.title,
        project_id: loopical.project_id,
        project_name: proj.name,
        project_color: proj.color,
      }
    })
    .filter(Boolean) as Array<{
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
    }>

  const projects = Array.from(projectMap.entries()).map(([id, p]) => ({
    id,
    name: p.name,
    color: p.color,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Action Items</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Alle Action Items aus deinen Feedbacks
        </p>
      </div>

      <ActionItemsList
        items={items}
        projects={projects}
        currentFilters={{
          status: status || 'all',
          priority: priority || 'all',
          project: project || 'all',
        }}
      />
    </div>
  )
}
