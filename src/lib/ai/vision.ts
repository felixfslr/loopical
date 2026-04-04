import { logger } from '@/lib/logger'
import type { Annotation } from '@/lib/types/database'

interface VisionAnalysisInput {
  /** URL of the media image (Supabase storage public URL) */
  imageUrl: string
  /** The transcript of the feedback */
  transcript: string
  /** Loopical title for context */
  title: string
  /** Description / question for context */
  description: string | null
  /** Guest annotations (pins with coordinates) */
  annotations?: Annotation[] | null
}

interface VisionInsight {
  /** What the AI sees at the annotated areas */
  visualContext: string
  /** UI elements identified in the image */
  identifiedElements: string[]
  /** Design/UX observations from looking at the image */
  designObservations: string[]
}

/**
 * Analyze feedback with visual context using Kimi K2.5 vision via Ollama Cloud.
 * Sends the media image + transcript to Kimi K2.5, which can SEE the actual UI/design.
 * Only called when the loopical has image media.
 */
export async function analyzeWithVision(input: VisionAnalysisInput): Promise<VisionInsight | null> {
  const baseUrl = process.env.OLLAMA_CLOUD_BASE_URL
  const apiKey = process.env.OLLAMA_CLOUD_API_KEY
  if (!baseUrl || !apiKey) {
    logger.warn('Ollama Cloud not configured — skipping vision analysis')
    return null
  }

  try {
    // Fetch the image and convert to base64 data URL
    const imageResponse = await fetch(input.imageUrl)
    if (!imageResponse.ok) {
      logger.warn({ url: input.imageUrl }, 'Failed to fetch image for vision analysis')
      return null
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const contentType = imageResponse.headers.get('content-type') || 'image/png'
    const dataUrl = `data:${contentType};base64,${base64Image}`

    // Build annotation context
    const pinAnnotations = (input.annotations ?? []).filter((a) => a.type === 'pin')
    const annotationContext = pinAnnotations.length > 0
      ? `\n\nDer Feedback-Geber hat ${pinAnnotations.length} Markierung(en) gesetzt:\n${pinAnnotations.map((a) => {
          if (a.type !== 'pin') return ''
          return `- Marker ${a.label} bei Position (${Math.round(a.x)}%, ${Math.round(a.y)}%) vom oberen linken Bildrand`
        }).filter(Boolean).join('\n')}`
      : ''

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60_000)

    const userPrompt = `Du analysierst ein Screenshot/Design-Bild zusammen mit Voice-Feedback eines Users.

Kontext: "${input.title}"
${input.description ? `Frage/Beschreibung: "${input.description}"` : ''}
${annotationContext}

Transkript des Feedbacks:
"""
${input.transcript.slice(0, 2000)}
"""

Analysiere das Bild und beantworte ausschließlich in folgendem JSON-Format:
{
  "visual_context": "Beschreibe, was du an den markierten Stellen / im Bild siehst, das relevant für das Feedback ist. Verknüpfe das Gesagte mit dem Sichtbaren.",
  "identified_elements": ["UI-Element 1", "UI-Element 2"],
  "design_observations": ["Beobachtung zu UX/Design 1", "Beobachtung 2"]
}

Regeln:
- visual_context: Verknüpfe was der User sagt mit was du im Bild siehst
- identified_elements: Konkrete UI-Elemente die du im Bild erkennst (Buttons, Formulare, Navigation etc.)
- design_observations: Deine eigenen UX/Design-Beobachtungen basierend auf dem Bild (max 3)
- Antworte in der Sprache des Transkripts
- Nur valides JSON, kein Markdown, kein Codeblock`

    let response: Response
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'kimi-k2.5:cloud',
          messages: [
            {
              role: 'system',
              content: 'Du bist ein erfahrener UX/Design-Analyst mit Vision-Fähigkeiten. Du analysierst Screenshots zusammen mit Voice-Feedback und gibst strukturierte Ergebnisse als JSON zurück. Antworte ausschließlich mit validem JSON.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
                },
                {
                  type: 'text',
                  text: userPrompt,
                },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ status: response.status, error: errorText }, 'Kimi Vision API error')
      return null
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message
    const raw = message?.content || message?.reasoning || ''

    return parseVisionResponse(raw)
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      logger.warn('Vision analysis timed out')
    } else {
      logger.error({ err }, 'Vision analysis failed')
    }
    return null
  }
}

function parseVisionResponse(raw: string): VisionInsight | null {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) cleaned = jsonMatch[0]

  try {
    const parsed = JSON.parse(cleaned)
    return {
      visualContext: typeof parsed.visual_context === 'string' ? parsed.visual_context : '',
      identifiedElements: Array.isArray(parsed.identified_elements)
        ? parsed.identified_elements.filter((e: any) => typeof e === 'string')
        : [],
      designObservations: Array.isArray(parsed.design_observations)
        ? parsed.design_observations.filter((o: any) => typeof o === 'string')
        : [],
    }
  } catch {
    logger.error({ raw }, 'Failed to parse vision response')
    return null
  }
}
