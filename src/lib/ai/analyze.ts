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
              'Du bist ein erfahrener Feedback-Analyst. Du analysierst Voice-Feedback und gibst strukturierte Ergebnisse als JSON zurück. Antworte ausschließlich mit validem JSON — kein Markdown, kein Codeblock, kein zusätzlicher Text.',
          },
          {
            role: 'user',
            content: `Analysiere folgendes Voice-Feedback zu einem Projekt-Element.

Kontext des Feedback-Punkts: "${context.title}"
${context.description ? `Beschreibung / Frage: "${context.description}"` : ''}

Transkript des Voice-Feedbacks:
"""
${transcript}
"""

Antworte ausschließlich in folgendem JSON-Format:
{
  "summary": "Zusammenfassung des Feedbacks — Länge proportional zum Input: kurzes Feedback = 2-3 Sätze, langes Feedback = ausführlicher Absatz mit allen wichtigen Punkten",
  "action_items": [
    {"text": "Konkrete, umsetzbare Aufgabe", "priority": "high", "done": false}
  ],
  "sentiment": "positive" | "neutral" | "critical",
  "tags": ["design", "ux", "copy", "bug", "feature_request", "performance", "accessibility", "content", "general"]
}

Regeln:
- Summary in der gleichen Sprache wie das Transkript
- Bei langem Feedback (>1 Minute): ausführlichere Summary, die alle wesentlichen Punkte abdeckt
- Action Items sind konkret und umsetzbar, nicht vage ("Button-Farbe ändern" statt "Design verbessern")
- Priority: "high" = muss gemacht werden, "medium" = sollte gemacht werden, "low" = nice-to-have
- Wenn kein klarer Action Item ableitbar ist, leeres Array
- Tags aus der vorgegebenen Liste wählen, können mehrere sein
- Sentiment basiert auf Tonfall und Inhalt
${context.description ? '- Das Feedback bezieht sich auf die oben genannte Frage/Beschreibung — beziehe deine Analyse darauf' : ''}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 65536,
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
  // Kimi K2.5 may put content in 'content' or 'reasoning' field
  const message = data.choices?.[0]?.message
  const raw = message?.content || message?.reasoning || ''

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
            priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
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
      summary: 'Kein klares Feedback erkannt — möglicherweise war die Aufnahme zu leise oder enthielt nur Hintergrundgeräusche.',
      actionItems: [],
      sentiment: 'neutral',
      tags: ['general'],
    }
  }
}
