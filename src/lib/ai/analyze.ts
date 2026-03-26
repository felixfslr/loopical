import type { AnalysisResult } from './types'

export async function analyzeTranscript(
  transcript: string,
  context: { title: string; description: string | null },
): Promise<AnalysisResult> {
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
              'Du bist ein Feedback-Analyst. Du analysierst Voice-Feedback und gibst strukturierte Ergebnisse als JSON zurück. Antworte ausschließlich mit validem JSON — kein Markdown, kein Codeblock, kein zusätzlicher Text.',
          },
          {
            role: 'user',
            content: `Analysiere folgendes Voice-Feedback zu einem Projekt-Element.

Kontext des Feedback-Punkts: "${context.title}"
Beschreibung: "${context.description || 'Keine Beschreibung'}"

Transkript des Voice-Feedbacks:
"${transcript}"

Antworte ausschließlich in folgendem JSON-Format:
{
  "summary": "2-3 Sätze Zusammenfassung des Feedbacks",
  "action_items": [
    {"text": "Konkrete Aufgabe 1", "done": false},
    {"text": "Konkrete Aufgabe 2", "done": false}
  ],
  "sentiment": "positive" | "neutral" | "critical",
  "tags": ["design", "ux", "copy", "bug", "feature_request", "general"]
}

Regeln:
- Summary in der gleichen Sprache wie das Transkript
- Action Items sind konkret und umsetzbar, nicht vage
- Wenn kein klarer Action Item ableitbar ist, leeres Array
- Tags nur aus der vorgegebenen Liste wählen, können mehrere sein
- Sentiment basiert auf Tonfall und Inhalt`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Ollama Cloud API error ${response.status}: ${errorText}`,
    )
  }

  const data = await response.json()
  const raw = data.choices?.[0]?.message?.content ?? ''

  return parseAIResponse(raw)
}

function parseAIResponse(raw: string): AnalysisResult {
  // Strip markdown code fences if present
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '')
  cleaned = cleaned.replace(/\n?```\s*$/i, '')
  cleaned = cleaned.trim()

  // Try to extract JSON object if surrounded by extra text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    cleaned = jsonMatch[0]
  }

  try {
    const parsed = JSON.parse(cleaned)
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      actionItems: Array.isArray(parsed.action_items)
        ? parsed.action_items.map((item: any) => ({
            text: typeof item.text === 'string' ? item.text : String(item),
            done: Boolean(item.done),
          }))
        : [],
      sentiment: ['positive', 'neutral', 'critical'].includes(parsed.sentiment)
        ? parsed.sentiment
        : 'neutral',
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t: any) => typeof t === 'string')
        : [],
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e, 'Raw:', raw)
    return {
      summary: 'AI-Analyse konnte nicht verarbeitet werden.',
      actionItems: [],
      sentiment: 'neutral',
      tags: ['general'],
    }
  }
}
