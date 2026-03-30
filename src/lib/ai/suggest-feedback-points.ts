import { logger } from '@/lib/logger'

interface SuggestedPoint {
  questionText: string
  priority: 'high' | 'medium' | 'low'
}

export async function suggestFeedbackPoints(
  documentContext: string,
  title: string,
): Promise<SuggestedPoint[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

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
              content: 'Du bist ein UX-Experte. Schlage gezielte Feedback-Fragen vor. Antworte nur mit validem JSON.',
            },
            {
              role: 'user',
              content: `Analysiere das folgende Dokument/den folgenden Inhalt und schlage 3-5 gezielte Feedback-Fragen vor, die ein Reviewer beantworten sollte.

Titel: "${title}"

Dokumentinhalt:
"""
${documentContext.slice(0, 4000)}
"""

Antworte als JSON-Array:
[
  {"questionText": "Frage an den Reviewer", "priority": "high|medium|low"}
]

Regeln:
- Fragen in der Sprache des Dokuments
- Konkrete, spezifische Fragen (nicht "Wie findest du es?")
- Priority: high = kritische Aspekte, medium = wichtig, low = nice-to-have
- 3-5 Fragen, sortiert nach Priorität`,
            },
          ],
          temperature: 0.5,
          max_tokens: 2048,
        }),
      },
    )

    if (!response.ok) return []

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || ''

    let cleaned = raw.trim()
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()

    const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
    if (jsonMatch) cleaned = jsonMatch[0]

    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((p: any) => typeof p.questionText === 'string')
      .map((p: any) => ({
        questionText: p.questionText,
        priority: ['high', 'medium', 'low'].includes(p.priority) ? p.priority : 'medium',
      }))
  } catch (err) {
    logger.warn({ err }, 'Feedback point suggestion failed')
    return []
  } finally {
    clearTimeout(timeout)
  }
}
