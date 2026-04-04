import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { clusterFeedback } from './clustering'
import { detectConsensus } from './consensus'

export interface FeedbackReport {
  title: string
  generatedAt: string
  period: { from: string; to: string }
  executiveSummary: string
  totalFeedbacks: number
  sentimentBreakdown: { positive: number; neutral: number; critical: number }
  themes: { label: string; count: number; sentiment: string }[]
  consensusPoints: string[]
  contradictions: string[]
  topActionItems: { text: string; priority: string; frequency: number }[]
  metrics: {
    avgDuration: number
    avgSeverity: number | null
    responseRate: number | null
  }
}

export async function generateFeedbackReport(
  projectId: string,
  periodDays: number = 7,
): Promise<FeedbackReport> {
  const admin = createAdminClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - periodDays)
  const cutoffIso = cutoff.toISOString()

  // Fetch project
  const { data: project } = await admin
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  // Fetch all loopicals for project
  const { data: loopicals } = await admin
    .from('loopicals')
    .select('id, title, share_link_views')
    .eq('project_id', projectId)

  const loopicalIds = (loopicals ?? []).map((l) => l.id)
  if (loopicalIds.length === 0) {
    return emptyReport(project?.name ?? 'Unbekannt', cutoffIso)
  }

  // Fetch entries in the period
  const { data: entries } = await admin
    .from('feedback_entries')
    .select('id, summary, sentiment, tags, action_items, audio_duration_seconds, severity, created_at')
    .in('loopical_id', loopicalIds)
    .eq('processing_status', 'complete')
    .gte('created_at', cutoffIso)
    .order('created_at', { ascending: false })

  const allEntries = entries ?? []

  if (allEntries.length === 0) {
    return emptyReport(project?.name ?? 'Unbekannt', cutoffIso)
  }

  // Sentiment breakdown
  const sentimentBreakdown = { positive: 0, neutral: 0, critical: 0 }
  for (const e of allEntries) {
    const s = e.sentiment as keyof typeof sentimentBreakdown
    if (s in sentimentBreakdown) sentimentBreakdown[s]++
  }

  // Avg duration
  const durations = allEntries
    .map((e) => e.audio_duration_seconds)
    .filter((d): d is number => d != null && d > 0)
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  // Avg severity
  const severities = allEntries
    .map((e) => e.severity as number | null)
    .filter((s): s is number => s != null)
  const avgSeverity = severities.length > 0
    ? Math.round((severities.reduce((a, b) => a + b, 0) / severities.length) * 10) / 10
    : null

  // Response rate
  const totalViews = (loopicals ?? []).reduce((a, l) => a + (l.share_link_views ?? 0), 0)
  const responseRate = totalViews > 0 ? Math.round((allEntries.length / totalViews) * 100) : null

  // Aggregate action items and count frequency
  const actionItemMap = new Map<string, { text: string; priority: string; count: number }>()
  for (const e of allEntries) {
    const items = e.action_items as { text: string; priority: string }[] | null
    if (!items) continue
    for (const item of items) {
      const key = item.text.toLowerCase().slice(0, 50)
      const existing = actionItemMap.get(key)
      if (existing) {
        existing.count++
        if (item.priority === 'high') existing.priority = 'high'
      } else {
        actionItemMap.set(key, { text: item.text, priority: item.priority, count: 1 })
      }
    }
  }

  const topActionItems = Array.from(actionItemMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((a) => ({ text: a.text, priority: a.priority, frequency: a.count }))

  // Theme clustering (use first loopical as representative)
  let themes: FeedbackReport['themes'] = []
  let consensusPoints: string[] = []
  let contradictions: string[] = []

  try {
    const clusters = await clusterFeedback(loopicalIds[0], {
      projectWide: true,
      projectId,
    })

    themes = clusters.map((c) => {
      const totalS = c.sentimentBreakdown.positive + c.sentimentBreakdown.neutral + c.sentimentBreakdown.critical
      const dominant = c.sentimentBreakdown.critical > totalS * 0.5
        ? 'critical'
        : c.sentimentBreakdown.positive > totalS * 0.5
          ? 'positive'
          : 'neutral'
      return { label: c.label, count: c.entryIds.length, sentiment: dominant }
    })

    const insights = await detectConsensus(clusters)
    consensusPoints = insights.filter((i) => i.type === 'consensus').map((i) => i.description)
    contradictions = insights.filter((i) => i.type === 'contradiction').map((i) => i.description)
  } catch (err) {
    logger.warn({ err }, 'Theme clustering failed for report')
  }

  // Generate executive summary using LLM
  let executiveSummary = ''
  try {
    executiveSummary = await generateExecutiveSummary({
      projectName: project?.name ?? '',
      totalFeedbacks: allEntries.length,
      sentimentBreakdown,
      themes,
      consensusPoints,
      topActionItems,
      periodDays,
    })
  } catch {
    executiveSummary = `In den letzten ${periodDays} Tagen wurden ${allEntries.length} Feedbacks analysiert.`
  }

  return {
    title: `Feedback-Report: ${project?.name ?? 'Projekt'}`,
    generatedAt: new Date().toISOString(),
    period: { from: cutoffIso, to: new Date().toISOString() },
    executiveSummary,
    totalFeedbacks: allEntries.length,
    sentimentBreakdown,
    themes,
    consensusPoints,
    contradictions,
    topActionItems,
    metrics: { avgDuration, avgSeverity, responseRate },
  }
}

async function generateExecutiveSummary(data: {
  projectName: string
  totalFeedbacks: number
  sentimentBreakdown: { positive: number; neutral: number; critical: number }
  themes: { label: string; count: number; sentiment: string }[]
  consensusPoints: string[]
  topActionItems: { text: string; priority: string; frequency: number }[]
  periodDays: number
}): Promise<string> {
  const response = await fetch(
    `${process.env.OLLAMA_CLOUD_BASE_URL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OLLAMA_CLOUD_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'kimi-k2.5:cloud',
        messages: [
          {
            role: 'system',
            content: 'Du schreibst eine knappe Executive Summary für einen Feedback-Report. Max 3 Sätze. Sprache: Deutsch.',
          },
          {
            role: 'user',
            content: `Projekt: ${data.projectName}
Zeitraum: letzte ${data.periodDays} Tage
Feedbacks: ${data.totalFeedbacks} (${data.sentimentBreakdown.positive} positiv, ${data.sentimentBreakdown.neutral} neutral, ${data.sentimentBreakdown.critical} kritisch)
Themen: ${data.themes.map((t) => `${t.label} (${t.count}x, ${t.sentiment})`).join(', ')}
Konsens: ${data.consensusPoints.join('; ') || 'Keiner'}
Top Action Items: ${data.topActionItems.slice(0, 3).map((a) => a.text).join('; ') || 'Keine'}

Schreibe eine Executive Summary (max 3 Sätze):`,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    },
  )

  if (!response.ok) throw new Error('LLM error')

  const result = await response.json()
  return (result.choices?.[0]?.message?.content || '').trim()
}

function emptyReport(projectName: string, cutoffIso: string): FeedbackReport {
  return {
    title: `Feedback-Report: ${projectName}`,
    generatedAt: new Date().toISOString(),
    period: { from: cutoffIso, to: new Date().toISOString() },
    executiveSummary: 'Im angegebenen Zeitraum wurden keine Feedbacks erfasst.',
    totalFeedbacks: 0,
    sentimentBreakdown: { positive: 0, neutral: 0, critical: 0 },
    themes: [],
    consensusPoints: [],
    contradictions: [],
    topActionItems: [],
    metrics: { avgDuration: 0, avgSeverity: null, responseRate: null },
  }
}
