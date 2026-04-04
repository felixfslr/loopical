'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Loader2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Users,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import type { FeedbackReport } from '@/lib/ai/generate-report'

interface ReportViewProps {
  projectId: string
  projectName: string
}

export function ReportView({ projectId, projectName }: ReportViewProps) {
  const [report, setReport] = useState<FeedbackReport | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [periodDays, setPeriodDays] = useState(7)

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/report?days=${periodDays}`,
        { method: 'POST' },
      )
      if (!response.ok) throw new Error('Failed')
      const data = await response.json()
      setReport(data)
    } catch {
      toast.error('Report konnte nicht generiert werden.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-medium">Feedback-Report generieren</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          Erstelle einen AI-gestützten Report mit Themes, Konsens-Punkten, Widersprüchen und Top Action Items.
        </p>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zeitraum:</span>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setPeriodDays(d)}
              className={`rounded-md px-3 py-1 text-sm ${
                periodDays === d
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {d} Tage
            </button>
          ))}
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating} size="lg">
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isGenerating ? 'Wird generiert…' : 'Report generieren'}
        </Button>
      </div>
    )
  }

  const { sentimentBreakdown } = report
  const total = sentimentBreakdown.positive + sentimentBreakdown.neutral + sentimentBreakdown.critical

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="rounded-lg border bg-muted/30 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{report.title}</h2>
          <Button variant="outline" size="sm" onClick={() => setReport(null)}>
            Neuer Report
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Zeitraum: {new Date(report.period.from).toLocaleDateString('de-DE')} — {new Date(report.period.to).toLocaleDateString('de-DE')}
        </p>
      </div>

      {/* Executive Summary */}
      <div className="rounded-lg border p-5 space-y-2">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Executive Summary
        </h3>
        <p className="text-sm leading-relaxed">{report.executiveSummary}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Users} label="Feedbacks" value={report.totalFeedbacks} />
        <KPI icon={Clock} label="Ø Dauer" value={`${Math.floor(report.metrics.avgDuration / 60)}m ${report.metrics.avgDuration % 60}s`} />
        {report.metrics.avgSeverity && (
          <KPI icon={AlertTriangle} label="Ø Severity" value={report.metrics.avgSeverity.toFixed(1)} />
        )}
        {report.metrics.responseRate != null && (
          <KPI icon={Target} label="Response Rate" value={`${report.metrics.responseRate}%`} />
        )}
      </div>

      {/* Sentiment */}
      {total > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="text-sm font-medium">Stimmung</h3>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            <div className="bg-green-500" style={{ width: `${(sentimentBreakdown.positive / total) * 100}%` }} />
            <div className="bg-yellow-500" style={{ width: `${(sentimentBreakdown.neutral / total) * 100}%` }} />
            <div className="bg-red-500" style={{ width: `${(sentimentBreakdown.critical / total) * 100}%` }} />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Positiv: {sentimentBreakdown.positive}</span>
            <span>Neutral: {sentimentBreakdown.neutral}</span>
            <span>Kritisch: {sentimentBreakdown.critical}</span>
          </div>
        </div>
      )}

      {/* Themes */}
      {report.themes.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium">Erkannte Themen</h3>
          <div className="space-y-2">
            {report.themes.map((theme, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    theme.sentiment === 'critical' ? 'bg-red-500' :
                    theme.sentiment === 'positive' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  {theme.label}
                </span>
                <span className="text-muted-foreground">{theme.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consensus */}
      {report.consensusPoints.length > 0 && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            Konsens
          </h3>
          <ul className="text-sm space-y-1">
            {report.consensusPoints.map((cp, i) => (
              <li key={i}>• {cp}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Contradictions */}
      {report.contradictions.length > 0 && (
        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-4 w-4" />
            Widersprüche
          </h3>
          <ul className="text-sm space-y-1">
            {report.contradictions.map((c, i) => (
              <li key={i}>• {c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {report.topActionItems.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Top Action Items
          </h3>
          <div className="space-y-2">
            {report.topActionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
                  item.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                  item.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {item.priority}
                </span>
                <span className="flex-1">{item.text}</span>
                {item.frequency > 1 && (
                  <span className="text-xs text-muted-foreground">{item.frequency}x erwähnt</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KPI({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
