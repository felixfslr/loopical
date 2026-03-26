import { createAdminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/types/database'

interface AggregatedSummary {
  summary: string
  actionItems: { text: string; done: boolean; priority: 'high' | 'medium' | 'low' }[]
}

export async function summarizeLoopical(loopicalId: string): Promise<AggregatedSummary> {
  const admin = createAdminClient()

  const [{ data: loopical }, { data: entries }, { data: feedbackPoints }] = await Promise.all([
    admin.from('loopicals').select('title, description').eq('id', loopicalId).single(),
    admin
      .from('feedback_entries')
      .select('summary, action_items, sentiment, feedback_point_id')
      .eq('loopical_id', loopicalId)
      .eq('processing_status', 'complete')
      .order('created_at', { ascending: true }),
    admin
      .from('feedback_points')
      .select('id, question_text, question_transcript, order_index')
      .eq('loopical_id', loopicalId)
      .order('order_index', { ascending: true }),
  ])

  if (!entries?.length) {
    return { summary: 'Noch kein analysiertes Feedback vorhanden.', actionItems: [] }
  }

  // Build context for AI
  const pointMap = new Map(
    (feedbackPoints ?? []).map((p) => [p.id, p.question_text || p.question_transcript || 'Allgemein']),
  )

  const feedbackSummaries = entries.map((e, i) => {
    const pointLabel = e.feedback_point_id ? pointMap.get(e.feedback_point_id) ?? 'Punkt' : 'Allgemein'
    const actions = (e.action_items as any[]) ?? []
    return `Feedback ${i + 1} (${pointLabel}, Stimmung: ${e.sentiment ?? 'unbekannt'}):
Zusammenfassung: ${e.summary ?? 'Keine'}
Action Items: ${actions.length ? actions.map((a: any) => `- ${a.text} (${a.priority})`).join('\n') : 'Keine'}`
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
              'Du bist ein erfahrener Feedback-Analyst. Du fasst mehrere Feedbacks zu einem Gesamtbild zusammen. Antworte ausschließlich mit validem JSON.',
          },
          {
            role: 'user',
            content: `Fasse die folgenden ${entries.length} Feedbacks zu "${loopical?.title ?? ''}" zusammen.
${loopical?.description ? `Beschreibung: ${loopical.description}` : ''}

${feedbackSummaries}

Erstelle eine Gesamtzusammenfassung und eine konsolidierte Liste von Action Items (dedupliziert, priorisiert).

JSON-Format:
{
  "summary": "Gesamtzusammenfassung aller Feedbacks — Trends, Übereinstimmungen, Widersprüche",
  "action_items": [
    {"text": "Konkrete Aufgabe", "priority": "high", "done": false}
  ]
}

Regeln:
- Zusammenfassung in der Sprache der Feedbacks
- Doppelte oder ähnliche Action Items zusammenfassen
- Priority basiert auf Häufigkeit und Dringlichkeit über alle Feedbacks
- Maximal 10 Action Items`,
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

  const result = parseAggregatedResponse(raw)

  // Save to loopical
  await admin
    .from('loopicals')
    .update({
      ai_summary: result.summary,
      ai_action_items: result.actionItems as unknown as Json,
      ai_summary_updated_at: new Date().toISOString(),
    })
    .eq('id', loopicalId)

  return result
}

function parseAggregatedResponse(raw: string): AggregatedSummary {
  let cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) cleaned = jsonMatch[0]

  try {
    const parsed = JSON.parse(cleaned)
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      actionItems: Array.isArray(parsed.action_items)
        ? parsed.action_items.map((item: any) => ({
            text: typeof item.text === 'string' ? item.text : String(item),
            done: Boolean(item.done),
            priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
          }))
        : [],
    }
  } catch {
    return {
      summary: 'Zusammenfassung konnte nicht generiert werden.',
      actionItems: [],
    }
  }
}
