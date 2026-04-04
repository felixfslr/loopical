import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { Json } from '@/lib/types/database'

interface PointSummary {
  summary: string
  consensusPoints: string[]
  totalEntries: number
  sentimentBreakdown: { positive: number; neutral: number; critical: number }
}

export async function summarizeFeedbackPoint(feedbackPointId: string): Promise<PointSummary> {
  const admin = createAdminClient()

  const [{ data: point }, { data: entries }] = await Promise.all([
    admin
      .from('feedback_points')
      .select('question_text, question_transcript, loopical_id, ai_summary, ai_consensus_points, ai_sentiment_breakdown, ai_summary_updated_at')
      .eq('id', feedbackPointId)
      .single(),
    admin
      .from('feedback_entries')
      .select('transcript, summary, sentiment, action_items')
      .eq('feedback_point_id', feedbackPointId)
      .eq('processing_status', 'complete')
      .order('created_at', { ascending: true }),
  ])

  // Race condition guard: skip if summarized less than 60s ago
  if (point?.ai_summary_updated_at) {
    const lastUpdate = new Date(point.ai_summary_updated_at).getTime()
    if (Date.now() - lastUpdate < 60_000) {
      return {
        summary: point.ai_summary ?? 'Noch kein analysiertes Feedback zu diesem Punkt.',
        consensusPoints: (point.ai_consensus_points as string[]) ?? [],
        totalEntries: entries?.length ?? 0,
        sentimentBreakdown: (point.ai_sentiment_breakdown as PointSummary['sentimentBreakdown']) ?? { positive: 0, neutral: 0, critical: 0 },
      }
    }
  }

  if (!entries?.length || !point) {
    return {
      summary: 'Noch kein analysiertes Feedback zu diesem Punkt.',
      consensusPoints: [],
      totalEntries: 0,
      sentimentBreakdown: { positive: 0, neutral: 0, critical: 0 },
    }
  }

  // Sentiment breakdown
  const sentimentBreakdown = { positive: 0, neutral: 0, critical: 0 }
  for (const e of entries) {
    const s = e.sentiment as keyof typeof sentimentBreakdown
    if (s in sentimentBreakdown) sentimentBreakdown[s]++
  }

  // If only 1 entry, use its summary directly
  if (entries.length === 1) {
    return {
      summary: entries[0].summary || 'Keine Zusammenfassung verfügbar.',
      consensusPoints: [],
      totalEntries: 1,
      sentimentBreakdown,
    }
  }

  const questionText = point.question_text || point.question_transcript || 'Allgemein'

  // Build transcript context (use actual transcripts for deeper analysis)
  const feedbackContext = entries.map((e, i) => {
    return `Feedback ${i + 1} (${e.sentiment ?? 'unbekannt'}):
Transkript: ${(e.transcript ?? '').slice(0, 500)}
Zusammenfassung: ${e.summary ?? 'Keine'}`
  }).join('\n\n')

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
            content:
              'Du bist ein erfahrener Feedback-Analyst. Du fasst mehrere Feedbacks zu einem spezifischen Punkt zusammen und erkennst Übereinstimmungen und Widersprüche. Antworte ausschließlich mit validem JSON.',
          },
          {
            role: 'user',
            content: `Zur Frage "${questionText}" haben ${entries.length} Personen Feedback gegeben.

Stimmungsverteilung: ${sentimentBreakdown.positive} positiv, ${sentimentBreakdown.neutral} neutral, ${sentimentBreakdown.critical} kritisch

${feedbackContext}

Erstelle eine Zusammenfassung und identifiziere Konsens-Punkte.

JSON-Format:
{
  "summary": "Zusammenfassung aller Feedbacks zu diesem Punkt — Was sagen die meisten? Gibt es Widersprüche?",
  "consensus_points": ["Punkt wo sich mehrere einig sind", "Weiterer Konsens-Punkt"]
}

Regeln:
- Summary in der Sprache der Feedbacks
- consensus_points: Nur echte Übereinstimmungen (≥2 Personen ähnliche Meinung)
- Widersprüche explizit erwähnen ("X Personen finden A gut, Y Personen finden A schlecht")
- Maximal 5 consensus_points`,
          },
        ],
        temperature: 0.3,
        max_tokens: 65536,
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

  const result = parsePointSummary(raw)

  // Save to feedback_points
  const { error: updateError } = await admin
    .from('feedback_points')
    .update({
      ai_summary: result.summary,
      ai_consensus_points: result.consensusPoints as unknown as Json,
      ai_sentiment_breakdown: sentimentBreakdown as unknown as Json,
      ai_summary_updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackPointId)

  if (updateError) {
    logger.error({ err: updateError, feedbackPointId }, 'Failed to save feedback point summary')
  }

  return { ...result, totalEntries: entries.length, sentimentBreakdown }
}

function parsePointSummary(raw: string): Omit<PointSummary, 'totalEntries' | 'sentimentBreakdown'> {
  let cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) cleaned = jsonMatch[0]

  try {
    const parsed = JSON.parse(cleaned)
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      consensusPoints: Array.isArray(parsed.consensus_points)
        ? parsed.consensus_points.filter((p: any) => typeof p === 'string')
        : [],
    }
  } catch {
    logger.error({ raw }, 'Failed to parse feedback point summary')
    return {
      summary: 'Zusammenfassung konnte nicht generiert werden.',
      consensusPoints: [],
    }
  }
}
