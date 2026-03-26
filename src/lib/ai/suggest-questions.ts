export interface SuggestedQuestion {
  text: string
}

export async function suggestFeedbackQuestions(
  title: string,
  mediaCount: number,
): Promise<SuggestedQuestion[]> {
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
              'Du bist ein UX-Feedback-Experte. Du schlägst gezielte Feedback-Fragen vor, die Designern und Produktteams helfen, verwertbares Feedback zu bekommen. Antworte ausschließlich mit validem JSON.',
          },
          {
            role: 'user',
            content: `Schlage 5 gezielte Feedback-Fragen/-Hinweise für folgendes Projekt vor:

Titel: "${title}"
Anzahl Bilder/Screenshots: ${mediaCount}

JSON-Format:
{
  "questions": [
    {"text": "Frage oder Hinweis für den Feedback-Geber"}
  ]
}

Regeln:
- Fragen sollen spezifisch und umsetzbar sein
- Mischung aus UX, Design, Inhalt und Funktionalität
- In der Sprache des Titels antworten
- Keine generischen Fragen wie "Was denkst du?"
- Fragen sollen dem Feedback-Geber helfen, strukturiert zu antworten`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
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

  return parseSuggestions(raw)
}

function parseSuggestions(raw: string): SuggestedQuestion[] {
  let cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) cleaned = jsonMatch[0]

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed.questions)) {
      return parsed.questions
        .filter((q: any) => typeof q.text === 'string' && q.text.length > 0)
        .slice(0, 5)
    }
    return []
  } catch {
    return []
  }
}
