import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    await requireUser()

    const { title, points } = await request.json()

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const pointTexts = Array.isArray(points)
      ? points.map((p: string) => `- ${p}`).join('\n')
      : ''

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
                'Du schreibst kurze, freundliche Begrüßungstexte für Feedback-Sessions. Maximal 2-3 Sätze. Antworte nur mit dem Text, kein JSON, kein Markdown.',
            },
            {
              role: 'user',
              content: `Schreibe eine freundliche Begrüßung für eine Feedback-Session zu "${title}".
${pointTexts ? `\nFeedback-Punkte:\n${pointTexts}` : ''}

Die Begrüßung soll den Feedback-Geber motivieren und kurz erklären, worauf er achten soll. Maximal 2-3 Sätze, in der Sprache des Titels.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 256,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`API error ${response.status}`)
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message
    const text = (message?.content || message?.reasoning || '').trim()

    return NextResponse.json({ message: text })
  } catch (err) {
    return errorResponse(err)
  }
}
