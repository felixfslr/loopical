'use client'

import {
  BarChart3,
  Clock,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Zap,
  Tag,
} from 'lucide-react'

interface WeeklyData {
  week: string
  total: number
  positive: number
  neutral: number
  critical: number
}

interface AnalyticsDashboardProps {
  stats: {
    totalFeedbacks: number
    completedCount: number
    sentimentCounts: { positive: number; neutral: number; critical: number }
    avgDuration: number
    severityCounts: number[]
    effortCounts: { quick_fix: number; medium: number; major: number }
    topTags: [string, number][]
    weeklyData: WeeklyData[]
    completionRate: number | null
    loopicalCount: number
  }
}

const tagLabels: Record<string, string> = {
  design: 'Design',
  ux: 'UX',
  copy: 'Copy',
  bug: 'Bug',
  feature_request: 'Feature',
  performance: 'Performance',
  accessibility: 'A11y',
  content: 'Content',
  general: 'Allgemein',
}

const effortLabels: Record<string, string> = {
  quick_fix: 'Quick Fix',
  medium: 'Mittel',
  major: 'Groß',
}

export function AnalyticsDashboard({ stats }: AnalyticsDashboardProps) {
  const { totalFeedbacks, completedCount, sentimentCounts, avgDuration, severityCounts, effortCounts, topTags, weeklyData, completionRate, loopicalCount } = stats
  const totalSentiment = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.critical
  const positiveRate = totalSentiment > 0 ? Math.round((sentimentCounts.positive / totalSentiment) * 100) : 0
  const criticalRate = totalSentiment > 0 ? Math.round((sentimentCounts.critical / totalSentiment) * 100) : 0

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  // Max value for weekly chart scaling
  const maxWeekly = Math.max(...weeklyData.map((d) => d.total), 1)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Feedbacks" value={totalFeedbacks} sub={`${completedCount} analysiert`} />
        <StatCard icon={Clock} label="Ø Dauer" value={formatDuration(avgDuration)} />
        <StatCard
          icon={TrendingUp}
          label="Positiv-Rate"
          value={`${positiveRate}%`}
          sub={`${criticalRate}% kritisch`}
          variant={criticalRate > 40 ? 'warning' : 'default'}
        />
        {completionRate != null && (
          <StatCard icon={CheckCircle} label="Completion Rate" value={`${completionRate}%`} sub={`${loopicalCount} Loopicals`} />
        )}
      </div>

      {/* Sentiment Bar */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          Stimmungsverteilung
        </h3>
        <div className="flex h-4 rounded-full overflow-hidden bg-muted">
          {totalSentiment > 0 && (
            <>
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(sentimentCounts.positive / totalSentiment) * 100}%` }}
              />
              <div
                className="bg-yellow-500 transition-all"
                style={{ width: `${(sentimentCounts.neutral / totalSentiment) * 100}%` }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(sentimentCounts.critical / totalSentiment) * 100}%` }}
              />
            </>
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Positiv: {sentimentCounts.positive}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" />Neutral: {sentimentCounts.neutral}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Kritisch: {sentimentCounts.critical}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Severity Distribution */}
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Severity-Verteilung
          </h3>
          <div className="space-y-2">
            {severityCounts.map((count, i) => {
              const maxSev = Math.max(...severityCounts, 1)
              const labels = ['Minor', 'Verbesserung', 'Spürbar', 'Schwerwiegend', 'Blocker']
              const colors = ['bg-green-500', 'bg-lime-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500']
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-muted-foreground">{labels[i]}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${colors[i]} rounded-full`} style={{ width: `${(count / maxSev) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Effort Distribution */}
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            Aufwandsverteilung
          </h3>
          <div className="space-y-2">
            {Object.entries(effortCounts).map(([key, count]) => {
              const maxEff = Math.max(...Object.values(effortCounts), 1)
              const colors: Record<string, string> = { quick_fix: 'bg-green-500', medium: 'bg-yellow-500', major: 'bg-red-500' }
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="w-20 text-muted-foreground">{effortLabels[key] ?? key}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${colors[key] ?? 'bg-primary'} rounded-full`} style={{ width: `${(count / maxEff) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tags */}
      {topTags.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Top Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
              >
                {tagLabels[tag] ?? tag}
                <span className="text-muted-foreground">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Trend */}
      {weeklyData.length > 1 && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Feedbacks pro Woche
          </h3>
          <div className="flex items-end gap-1 h-32">
            {weeklyData.map((d) => (
              <div key={d.week} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col-reverse" style={{ height: 96 }}>
                  <div
                    className="w-full bg-green-500/70 rounded-t-sm"
                    style={{ height: `${(d.positive / maxWeekly) * 100}%` }}
                  />
                  <div
                    className="w-full bg-yellow-500/70"
                    style={{ height: `${(d.neutral / maxWeekly) * 100}%` }}
                  />
                  <div
                    className="w-full bg-red-500/70 rounded-t-sm"
                    style={{ height: `${(d.critical / maxWeekly) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground truncate max-w-full">
                  {new Date(d.week).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  variant = 'default',
}: {
  icon: typeof MessageSquare
  label: string
  value: string | number
  sub?: string
  variant?: 'default' | 'warning'
}) {
  return (
    <div className={`rounded-lg border p-4 ${variant === 'warning' ? 'border-orange-500/30 bg-orange-500/5' : ''}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}
