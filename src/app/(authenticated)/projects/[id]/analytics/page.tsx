import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ProjectAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireUser()
  const { id: projectId } = await params
  const admin = createAdminClient()

  // Fetch project (owner-only)
  const { data: project } = await admin
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('owner_id', user.id)
    .single()

  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">Projekt nicht gefunden.</div>
  }

  // Fetch all loopical IDs for this project
  const { data: loopicals } = await admin
    .from('loopicals')
    .select('id, title')
    .eq('project_id', projectId)

  const loopicalIds = (loopicals ?? []).map((l) => l.id)

  if (loopicalIds.length === 0) {
    return (
      <div className="p-8 space-y-4">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <p className="text-center text-muted-foreground">Noch keine Loopicals vorhanden.</p>
      </div>
    )
  }

  // Aggregate stats across all feedback entries for this project
  const { data: entries } = await admin
    .from('feedback_entries')
    .select('sentiment, processing_status, audio_duration_seconds, created_at, tags, severity, effort_estimate, feedback_point_id')
    .in('loopical_id', loopicalIds)

  const allEntries = entries ?? []
  const completed = allEntries.filter((e) => e.processing_status === 'complete')

  // Compute stats
  const totalFeedbacks = allEntries.length
  const completedCount = completed.length

  const sentimentCounts = { positive: 0, neutral: 0, critical: 0 }
  for (const e of completed) {
    const s = e.sentiment as keyof typeof sentimentCounts
    if (s in sentimentCounts) sentimentCounts[s]++
  }

  const durations = completed
    .map((e) => e.audio_duration_seconds)
    .filter((d): d is number => d != null && d > 0)
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  // Severity distribution
  const severityCounts = [0, 0, 0, 0, 0] // index 0-4 for severity 1-5
  for (const e of completed) {
    const s = e.severity as number | null
    if (s != null && s >= 1 && s <= 5) severityCounts[s - 1]++
  }

  // Effort distribution
  const effortCounts = { quick_fix: 0, medium: 0, major: 0 }
  for (const e of completed) {
    const ef = e.effort_estimate as keyof typeof effortCounts
    if (ef in effortCounts) effortCounts[ef]++
  }

  // Tag frequency
  const tagFreq: Record<string, number> = {}
  for (const e of completed) {
    const tags = e.tags as string[] | null
    if (tags) {
      for (const tag of tags) {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1
      }
    }
  }
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Feedback over time (group by week)
  const weeklyData: Record<string, { total: number; positive: number; neutral: number; critical: number }> = {}
  for (const e of allEntries) {
    const date = new Date(e.created_at)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    if (!weeklyData[weekKey]) weeklyData[weekKey] = { total: 0, positive: 0, neutral: 0, critical: 0 }
    weeklyData[weekKey].total++
    const s = e.sentiment as 'positive' | 'neutral' | 'critical'
    if (s in weeklyData[weekKey]) weeklyData[weekKey][s]++
  }

  // Completion rate for guided points
  const { data: feedbackPoints } = await admin
    .from('feedback_points')
    .select('id')
    .in('loopical_id', loopicalIds)

  const totalPoints = feedbackPoints?.length ?? 0
  const answeredPoints = totalPoints > 0
    ? new Set(completed.filter((e) => e.feedback_point_id).map((e) => e.feedback_point_id)).size
    : 0
  const completionRate = totalPoints > 0 ? Math.round((answeredPoints / totalPoints) * 100) : null

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
        <h1 className="text-xl font-bold">{project.name} — Analytics</h1>
      </div>

      <AnalyticsDashboard
        stats={{
          totalFeedbacks,
          completedCount,
          sentimentCounts,
          avgDuration,
          severityCounts,
          effortCounts,
          topTags,
          weeklyData: Object.entries(weeklyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([week, data]) => ({ week, ...data })),
          completionRate,
          loopicalCount: loopicalIds.length,
        }}
      />
    </div>
  )
}
