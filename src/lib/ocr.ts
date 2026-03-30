import { logger } from '@/lib/logger'

/**
 * Extract text from a PDF via pdf-parse.
 * Returns extracted text or null if the PDF has no extractable text (scanned/image-only).
 */
export async function extractPdfText(pdfUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pdfUrl, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null

    const buffer = Buffer.from(await res.arrayBuffer())
    // Dynamic import to avoid bundling pdf-parse on the client
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = (pdfParseModule as any).default || pdfParseModule
    const data = await pdfParse(buffer)

    const text = data.text?.trim()
    if (!text || text.length < 10) return null // Too short = likely scanned
    return text
  } catch (err) {
    logger.warn({ err }, 'PDF text extraction failed')
    return null
  }
}

/**
 * Run OCR on a media item. For PDFs, uses text extraction.
 * For images, would need a vision model (future enhancement).
 */
export async function extractTextFromMedia(
  mediaUrl: string,
  mediaType: string,
): Promise<string | null> {
  switch (mediaType) {
    case 'pdf':
      return extractPdfText(mediaUrl)
    case 'image':
      // Future: use vision model for image OCR
      return null
    default:
      return null
  }
}
