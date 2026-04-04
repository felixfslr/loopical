import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

interface FeedbackForClustering {
  id: string
  transcript: string | null
  summary: string | null
  sentiment: string | null
}

export interface ThemeCluster {
  id: string
  label: string
  entryIds: string[]
  sentimentBreakdown: { positive: number; neutral: number; critical: number }
  topSummaries: string[]
}

/**
 * Cluster feedback entries by theme using Kimi K2.5 directly.
 * No embedding model needed — the LLM groups entries by semantic similarity.
 */
export async function clusterFeedback(
  loopicalId: string,
  options?: { projectWide?: boolean; projectId?: string },
): Promise<ThemeCluster[]> {
  const admin = createAdminClient()

  let entries: FeedbackForClustering[]

  if (options?.projectWide && options.projectId) {
    const { data: loopicals } = await admin
      .from('loopicals')
      .select('id')
      .eq('project_id', options.projectId)

    const loopicalIds = (loopicals ?? []).map((l) => l.id)
    if (loopicalIds.length === 0) return []

    const { data } = await admin
      .from('feedback_entries')
      .select('id, transcript, summary, sentiment')
      .in('loopical_id', loopicalIds)
      .eq('processing_status', 'complete')
      .order('created_at', { ascending: false })
      // Cap at 100 entries — the LLM prompt context can't handle more
      .limit(100)

    entries = data ?? []
  } else {
    const { data } = await admin
      .from('feedback_entries')
      .select('id, transcript, summary, sentiment')
      .eq('loopical_id', loopicalId)
      .eq('processing_status', 'complete')
      .order('created_at', { ascending: false })
      // Cap at 100 entries — the LLM prompt context can't handle more
      .limit(100)

    entries = data ?? []
  }

  if (entries.length < 3) return []

  // Build numbered list of summaries for the LLM
  const feedbackList = entries
    .map((e, i) => `[${i + 1}] (${e.sentiment ?? 'neutral'}): ${e.summary || e.transcript?.slice(0, 200) || 'Kein Inhalt'}`)
    .join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)

  try {
    const response = await fetch(
      `${process.env.OLLAMA_CLOUD_BASE_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OLLAMA_CLOUD_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'kimi-k2.5:cloud',
          messages: [
            {
              role: 'system',
              content: 'Du gruppierst Feedback-Einträge nach Themen. Antworte ausschließlich mit validem JSON — kein Markdown, kein Codeblock.',
            },
            {
              role: 'user',
              content: `Gruppiere die folgenden ${entries.length} Feedbacks nach gemeinsamen Themen.

${feedbackList}

Antworte in folgendem JSON-Format:
{
  "clusters": [
    {
      "label": "Kurzes Theme-Label (2-4 Wörter)",
      "entry_numbers": [1, 3, 7]
    }
  ]
}

Regeln:
- Jedes Feedback gehört in genau eine Gruppe
- Gruppen mit nur 1 Feedback → in "Sonstiges" zusammenfassen
- Maximal 8 Gruppen
- Labels in der Sprache der Feedbacks
- Sortiere Gruppen nach Größe (größte zuerst)`,
            },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Ollama Cloud API error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message
    const raw = (message?.content || message?.reasoning || '').trim()

    return parseClusters(raw, entries)
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      logger.warn('Clustering timed out')
    } else {
      logger.error({ err }, 'Clustering failed')
    }
    return []
  } finally {
    clearTimeout(timeout)
  }
}

function parseClusters(raw: string, entries: FeedbackForClustering[]): ThemeCluster[] {
  let cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) cleaned = jsonMatch[0]

  try {
    const parsed = JSON.parse(cleaned)
    const rawClusters = Array.isArray(parsed.clusters) ? parsed.clusters : []

    return rawClusters
      .filter((c: any) => Array.isArray(c.entry_numbers) && c.entry_numbers.length >= 2)
      .map((c: any, i: number) => {
        const entryNumbers: number[] = c.entry_numbers.filter((n: any) => typeof n === 'number')
        const clusterEntries = entryNumbers
          .map((n) => entries[n - 1]) // 1-indexed to 0-indexed
          .filter(Boolean)

        const sentimentBreakdown = { positive: 0, neutral: 0, critical: 0 }
        const summaries: string[] = []

        for (const entry of clusterEntries) {
          const s = entry.sentiment as keyof typeof sentimentBreakdown
          if (s in sentimentBreakdown) sentimentBreakdown[s]++
          if (entry.summary) summaries.push(entry.summary)
        }

        return {
          id: `cluster-${i}`,
          label: typeof c.label === 'string' ? c.label : 'Allgemein',
          entryIds: clusterEntries.map((e) => e.id),
          sentimentBreakdown,
          topSummaries: summaries.slice(0, 3),
        }
      })
      .filter((c: ThemeCluster) => c.entryIds.length >= 2)
  } catch (err) {
    logger.error({ raw, err }, 'Failed to parse clustering response')
    return []
  }
}
