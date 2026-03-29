import { logger } from '@/lib/logger'

/**
 * Generate 1–2 follow-up questions based on the feedback transcript.
 * Uses Kimi K2.5 via Ollama Cloud.
 */
export async function generateFollowUpQuestions(
  transcript: string,
  context: { title: string; description: string | null },
): Promise<string[]> {
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
              content:
                'Du generierst 1–2 präzise Rückfragen basierend auf Voice-Feedback. Antworte ausschließlich mit einem JSON-Array von Strings. Keine Markdown-Codeblöcke, kein zusätzlicher Text.',
            },
            {
              role: 'user',
              content: `Basierend auf folgendem Voice-Feedback, generiere 1–2 kurze, spezifische Rückfragen, die helfen würden, das Feedback besser zu verstehen oder umzusetzen.

Kontext: "${context.title}"
${context.description ? `Beschreibung: "${context.description}"` : ''}

Transkript:
"""
${transcript}
"""

Regeln:
- Maximal 2 Fragen
- Fragen in der gleichen Sprache wie das Transkript
- Fragen sollen spezifisch und auf den Inhalt bezogen sein
- Keine generischen Fragen wie "Gibt es noch etwas?"
- Wenn das Feedback bereits sehr klar und vollständig ist, gib ein leeres Array zurück: []

Antworte ausschließlich mit einem JSON-Array:
["Frage 1", "Frage 2"]`,
            },
          ],
          temperature: 0.4,
          max_tokens: 1024,
        }),
      },
    )

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Follow-up generation failed')
      return []
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message
    const raw = (message?.content || message?.reasoning || '').trim()

    // Parse JSON array
    let cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
    if (!arrayMatch) return []

    const parsed = JSON.parse(arrayMatch[0])
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((q: unknown) => typeof q === 'string' && q.trim().length > 0)
      .slice(0, 2)
  } catch (err) {
    logger.warn({ err }, 'Follow-up question generation failed')
    return []
  } finally {
    clearTimeout(timeout)
  }
}
