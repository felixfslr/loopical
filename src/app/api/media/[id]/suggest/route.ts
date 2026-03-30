import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { suggestFeedbackPoints } from '@/lib/ai/suggest-feedback-points'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: loopicalId } = await params
  const admin = createAdminClient()

  // Get loopical title
  const { data: loopical } = await admin
    .from('loopicals')
    .select('title')
    .eq('id', loopicalId)
    .single()

  if (!loopical) {
    return NextResponse.json({ error: 'Loopical not found' }, { status: 404 })
  }

  // Get all OCR text from media items
  const { data: mediaItems } = await admin
    .from('loopical_media')
    .select('ocr_text')
    .eq('loopical_id', loopicalId)
    .not('ocr_text', 'is', null)

  const documentContext = (mediaItems ?? [])
    .map((m) => m.ocr_text)
    .filter(Boolean)
    .join('\n\n---\n\n')

  if (!documentContext) {
    return NextResponse.json({ suggestions: [], message: 'Kein Dokumenttext vorhanden für Vorschläge.' })
  }

  const suggestions = await suggestFeedbackPoints(documentContext, loopical.title)
  return NextResponse.json({ suggestions })
}
