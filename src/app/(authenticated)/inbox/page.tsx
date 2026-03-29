import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { InboxList } from '@/components/inbox-list'

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string
    sentiment?: string
    read?: string
  }>
}) {
  const { project, sentiment, read } = await searchParams
  const user = await requireUser()
  const supabase = createAdminClient()

  // Get user's projects
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
        <h1 className="text-2xl font-bold tracking-tight mb-2">Inbox</h1>
        <p className="text-sm text-muted-foreground">Noch keine Projekte vorhanden.</p>
      </div>
    )
  }

  // Get loopicals
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
        <h1 className="text-2xl font-bold tracking-tight mb-2">Inbox</h1>
        <p className="text-sm text-muted-foreground">Noch keine Loopicals vorhanden.</p>
      </div>
    )
  }

  // Fetch feedback entries
  let query = supabase
    .from('feedback_entries')
    .select(`
      id, loopical_id, summary, sentiment, processing_status, guest_name,
      action_items, priority_score, is_read, created_at, media_type,
      parent_entry_id,
      profiles:author_id(full_name)
    `)
    .in('loopical_id', loopicalIds)
    .is('parent_entry_id', null) // Don't show follow-up entries in inbox
    .order('priority_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  // Filters
  if (sentiment && sentiment !== 'all') {
    query = query.eq('sentiment', sentiment)
  }
  if (read === 'unread') {
    query = query.eq('is_read', false)
  } else if (read === 'read') {
    query = query.eq('is_read', true)
  }

  const { data: entries } = await query

  // Build entries with project context
  const inboxEntries = (entries ?? [])
    .map((entry) => {
      const loopical = loopicalMap.get(entry.loopical_id)
      if (!loopical) return null
      const proj = projectMap.get(loopical.project_id)
      if (!proj) return null

      if (project && project !== 'all' && loopical.project_id !== project) return null

      const actionItemCount = Array.isArray(entry.action_items)
        ? (entry.action_items as Array<{ done: boolean }>).filter((a) => !a.done).length
        : 0

      return {
        id: entry.id,
        summary: entry.summary,
        sentiment: entry.sentiment as 'positive' | 'neutral' | 'critical' | null,
        processing_status: entry.processing_status,
        guest_name: entry.guest_name,
        author_name: (entry.profiles as unknown as { full_name: string } | null)?.full_name ?? null,
        priority_score: entry.priority_score,
        is_read: entry.is_read,
        media_type: entry.media_type as 'audio' | 'video',
        action_item_count: actionItemCount,
        created_at: entry.created_at,
        loopical_id: entry.loopical_id,
        loopical_title: loopical.title,
        project_id: loopical.project_id,
        project_name: proj.name,
        project_color: proj.color,
      }
    })
    .filter(Boolean) as Array<{
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
    }>

  const unreadCount = inboxEntries.filter((e) => !e.is_read).length
  const projects = Array.from(projectMap.entries()).map(([id, p]) => ({
    id,
    name: p.name,
    color: p.color,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} ungelesene${unreadCount === 1 ? 's' : ''} Feedback${unreadCount === 1 ? '' : 's'}`
              : 'Alle Feedbacks gelesen'}
          </p>
        </div>
      </div>

      <InboxList
        entries={inboxEntries}
        projects={projects}
        loopicalIds={loopicalIds}
        currentFilters={{
          project: project || 'all',
          sentiment: sentiment || 'all',
          read: read || 'all',
        }}
      />
    </div>
  )
}
