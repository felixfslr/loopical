import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractTextFromMedia } from '@/lib/ocr'
import { logger } from '@/lib/logger'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: media } = await admin
    .from('loopical_media')
    .select('media_url, media_type, ocr_text')
    .eq('id', id)
    .single()

  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 })
  }

  // Skip if already has OCR text
  if (media.ocr_text) {
    return NextResponse.json({ text: media.ocr_text })
  }

  const text = await extractTextFromMedia(media.media_url, media.media_type)

  if (text) {
    const { error } = await admin
      .from('loopical_media')
      .update({ ocr_text: text })
      .eq('id', id)

    if (error) {
      logger.error({ err: error, mediaId: id }, 'Failed to save OCR text')
    }
  }

  return NextResponse.json({ text })
}
