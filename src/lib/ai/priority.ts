import type { AnalysisResult } from './types'

/**
 * Compute a 0–100 priority score for inbox triage.
 * Higher score = more urgent / important feedback.
 */
export function computePriorityScore(
  analysis: AnalysisResult,
  durationSeconds: number | null,
): number {
  let score = 0

  // Sentiment weight
  if (analysis.sentiment === 'critical') score += 40
  else if (analysis.sentiment === 'neutral') score += 10

  // Action item weight
  const hasHigh = analysis.actionItems.some((a) => a.priority === 'high')
  const hasMedium = analysis.actionItems.some((a) => a.priority === 'medium')
  if (hasHigh) score += 30
  else if (hasMedium) score += 15

  // Many action items = more substantial
  if (analysis.actionItems.length > 3) score += 10

  // Longer recordings tend to be more substantial
  if (durationSeconds && durationSeconds > 60) score += 5

  return Math.min(100, score)
}
