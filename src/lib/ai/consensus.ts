import { logger } from '@/lib/logger'
import type { ThemeCluster } from './clustering'

export interface ConsensusInsight {
  type: 'consensus' | 'contradiction'
  theme: string
  description: string
  strength: number // how many people
  sentiment: 'positive' | 'neutral' | 'critical' | 'mixed'
}

/**
 * Analyze theme clusters for consensus and contradictions.
 */
export async function detectConsensus(
  clusters: ThemeCluster[],
): Promise<ConsensusInsight[]> {
  const insights: ConsensusInsight[] = []

  for (const cluster of clusters) {
    if (cluster.entryIds.length < 2) continue

    const total = cluster.sentimentBreakdown.positive + cluster.sentimentBreakdown.neutral + cluster.sentimentBreakdown.critical
    if (total === 0) continue

    const positiveRate = cluster.sentimentBreakdown.positive / total
    const criticalRate = cluster.sentimentBreakdown.critical / total

    // Consensus: >70% same sentiment
    if (positiveRate >= 0.7) {
      insights.push({
        type: 'consensus',
        theme: cluster.label,
        description: `${cluster.entryIds.length} von ${total} Feedbacks sind positiv zu "${cluster.label}"`,
        strength: cluster.entryIds.length,
        sentiment: 'positive',
      })
    } else if (criticalRate >= 0.7) {
      insights.push({
        type: 'consensus',
        theme: cluster.label,
        description: `${cluster.sentimentBreakdown.critical} von ${total} Feedbacks sind kritisch zu "${cluster.label}"`,
        strength: cluster.entryIds.length,
        sentiment: 'critical',
      })
    }

    // Contradiction: both positive and critical > 25%
    if (positiveRate >= 0.25 && criticalRate >= 0.25) {
      insights.push({
        type: 'contradiction',
        theme: cluster.label,
        description: `Zu "${cluster.label}": ${cluster.sentimentBreakdown.positive} positiv, ${cluster.sentimentBreakdown.critical} kritisch — geteilte Meinungen`,
        strength: cluster.entryIds.length,
        sentiment: 'mixed',
      })
    }
  }

  // Sort by strength (most entries first)
  insights.sort((a, b) => b.strength - a.strength)

  // Use LLM to generate a natural language summary if we have insights
  if (insights.length > 0) {
    try {
      const summaryInsight = await generateConsensusNarrative(insights)
      if (summaryInsight) {
        insights.unshift(summaryInsight)
      }
    } catch (err) {
      logger.warn({ err }, 'Consensus narrative generation failed')
    }
  }

  return insights
}

async function generateConsensusNarrative(
  insights: ConsensusInsight[],
): Promise<ConsensusInsight | null> {
  const context = insights.map((i) => `- ${i.description}`).join('\n')

  try {
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
              content: 'Fasse Konsens- und Widerspruchspunkte in einem Satz zusammen. Antworte NUR mit dem Satz.',
            },
            {
              role: 'user',
              content: `Fasse folgende Erkenntnisse in einem Satz zusammen:\n${context}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      },
    )

    if (!response.ok) return null

    const data = await response.json()
    const summary = (data.choices?.[0]?.message?.content || '').trim()
    if (!summary) return null

    return {
      type: 'consensus',
      theme: 'Gesamtbild',
      description: summary,
      strength: insights.reduce((a, b) => a + b.strength, 0),
      sentiment: 'neutral',
    }
  } catch {
    return null
  }
}
