import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, ListChecks, TrendingUp } from 'lucide-react'

interface DashboardStatsProps {
  totalFeedback: number
  sentimentCounts: { positive: number; neutral: number; critical: number }
  openActionItems: number
}

export function DashboardStats({
  totalFeedback,
  sentimentCounts,
  openActionItems,
}: DashboardStatsProps) {
  const total = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.critical
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {/* Total Feedback */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalFeedback}</p>
            <p className="text-xs text-muted-foreground">Gesamt-Feedback</p>
          </div>
        </CardContent>
      </Card>

      {/* Sentiment */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Stimmung</p>
          </div>
          {total > 0 ? (
            <>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${pct(sentimentCounts.positive)}%` }}
                />
                <div
                  className="bg-yellow-500 transition-all"
                  style={{ width: `${pct(sentimentCounts.neutral)}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${pct(sentimentCounts.critical)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="text-green-500">{sentimentCounts.positive} Positiv</span>
                <span className="text-yellow-500">{sentimentCounts.neutral} Neutral</span>
                <span className="text-red-500">{sentimentCounts.critical} Kritisch</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Noch keine Daten</p>
          )}
        </CardContent>
      </Card>

      {/* Open Action Items */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <ListChecks className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{openActionItems}</p>
            <p className="text-xs text-muted-foreground">Offene Action Items</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
