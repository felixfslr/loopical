import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Annotation } from '@/lib/types/database'
import type { AnalysisResult } from './types'

export async function analyzeTranscript(
  transcript: string,
  context: {
    title: string
    description: string | null
    annotations?: Annotation[] | null
    documentContext?: string | null
    /** Loopical ID for context-aware analysis (fetch recent entries) */
    loopicalId?: string
    /** Feedback point ID for point-level context */
    feedbackPointId?: string | null
  },
): Promise<AnalysisResult> {
  // Fetch recent feedback context for smarter analysis (multi-pass context)
  let priorFeedbackContext = ''
  if (context.loopicalId) {
    try {
      const admin = createAdminClient()
      const query = context.feedbackPointId
        ? admin
            .from('feedback_entries')
            .select('summary, sentiment')
            .eq('loopical_id', context.loopicalId)
            .eq('feedback_point_id', context.feedbackPointId)
            .eq('processing_status', 'complete')
            .order('created_at', { ascending: false })
            .limit(5)
        : admin
            .from('feedback_entries')
            .select('summary, sentiment')
            .eq('loopical_id', context.loopicalId)
            .eq('processing_status', 'complete')
            .order('created_at', { ascending: false })
            .limit(5)

      const { data: recentEntries } = await query
      if (recentEntries?.length) {
        priorFeedbackContext = `\n\nBisheriges Feedback zu diesem Element (${recentEntries.length} vorherige Feedbacks):
${recentEntries.map((e, i) => `${i + 1}. (${e.sentiment}): ${e.summary}`).join('\n')}
Berücksichtige diese vorherigen Feedbacks: Erkenne Muster, Wiederholungen und ob das aktuelle Feedback neue Perspektiven bringt oder bekannte Probleme bestätigt.`
      }
    } catch {
      // Non-critical — continue without prior context
    }
  }
  // Ollama Cloud analysis (60s timeout)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  let response: Response
  try {
    response = await fetch(
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
              'Du bist ein erfahrener Feedback-Analyst. Du analysierst Voice-Feedback und gibst strukturierte Ergebnisse als JSON zurück. Antworte ausschließlich mit validem JSON — kein Markdown, kein Codeblock, kein zusätzlicher Text.',
          },
          {
            role: 'user',
            content: `Analysiere folgendes Voice-Feedback zu einem Projekt-Element.

Kontext des Feedback-Punkts: "${context.title}"
${context.description ? `Beschreibung / Frage: "${context.description}"` : ''}
${context.annotations && context.annotations.filter((a) => a.type === 'pin').length > 0 ? `\nDer Feedback-Geber hat ${context.annotations.filter((a) => a.type === 'pin').length} Markierungen auf dem Bild gesetzt (Marker ${context.annotations.filter((a) => a.type === 'pin').map((a) => a.type === 'pin' ? a.label : '').filter(Boolean).join(', ')}). Wenn der Feedback-Geber über markierte Stellen spricht, referenziere die Marker-Nummern in deiner Zusammenfassung (z.B. "Bei Marker 2...").` : ''}
${context.documentContext ? `\nDokument-Inhalt (OCR/Text-Extrakt und/oder visuelle Analyse des reviewten Dokuments):\n"""\n${context.documentContext.slice(0, 4000)}\n"""\nBerücksichtige den Dokumentinhalt bei der Analyse — das Feedback bezieht sich auf dieses Dokument.` : ''}
${priorFeedbackContext}

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
  "tags": ["design", "ux", "copy", "bug", "feature_request", "performance", "accessibility", "content", "general"],
  "severity": 3,
  "effort_estimate": "quick_fix" | "medium" | "major",
  "usability_category": "navigation" | "layout" | "readability" | "interaction" | "performance" | "accessibility" | null,
  "ui_element_references": ["Button-Name", "Header-Bereich"]
}

Regeln:
- Summary in der gleichen Sprache wie das Transkript
- Bei langem Feedback (>1 Minute): ausführlichere Summary, die alle wesentlichen Punkte abdeckt
- Action Items sind konkret und umsetzbar, nicht vage ("Button-Farbe ändern" statt "Design verbessern")
- Priority: "high" = muss gemacht werden, "medium" = sollte gemacht werden, "low" = nice-to-have
- Wenn kein klarer Action Item ableitbar ist, leeres Array
- Tags aus der vorgegebenen Liste wählen, können mehrere sein
- Sentiment basiert auf Tonfall und Inhalt
- severity: 1=kleine Anmerkung, 2=Verbesserungsvorschlag, 3=spürbares Problem, 4=schwerwiegendes Problem, 5=kritischer Blocker
- effort_estimate: "quick_fix"=<1h, "medium"=1h-1Tag, "major"=mehrere Tage
- usability_category: falls das Feedback ein UX-Problem beschreibt, wähle die passendste Kategorie, sonst null
- ui_element_references: erwähnte UI-Elemente (Buttons, Formulare, Header, Navigation etc.) als kurze Labels
${context.description ? '- Das Feedback bezieht sich auf die oben genannte Frage/Beschreibung — beziehe deine Analyse darauf' : ''}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 65536,
      }),
    },
    )
  } finally {
    clearTimeout(timeout)
  }

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

export function parseAIResponse(raw: string): AnalysisResult {
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
    const validUsabilityCategories = ['navigation', 'layout', 'readability', 'interaction', 'performance', 'accessibility']
    const validEffortEstimates = ['quick_fix', 'medium', 'major']

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
      severity: typeof parsed.severity === 'number' && parsed.severity >= 1 && parsed.severity <= 5
        ? parsed.severity
        : undefined,
      effortEstimate: validEffortEstimates.includes(parsed.effort_estimate)
        ? parsed.effort_estimate
        : undefined,
      usabilityCategory: validUsabilityCategories.includes(parsed.usability_category)
        ? parsed.usability_category
        : null,
      uiElementReferences: Array.isArray(parsed.ui_element_references)
        ? parsed.ui_element_references.filter((r: any) => typeof r === 'string')
        : [],
    }
  } catch (e) {
    logger.error({ err: e, raw }, 'Failed to parse AI response')
    return {
      summary: 'Kein klares Feedback erkannt — möglicherweise war die Aufnahme zu leise oder enthielt nur Hintergrundgeräusche.',
      actionItems: [],
      sentiment: 'neutral',
      tags: ['general'],
    }
  }
}
