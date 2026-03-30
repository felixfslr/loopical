export interface OgData {
  title: string | null
  description: string | null
  image: string | null
}

export async function fetchOpenGraph(url: string): Promise<OgData> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Loopical/1.0 (OG fetcher)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return { title: null, description: null, image: null }

    const html = await res.text()
    const title = extractMeta(html, 'og:title') || extractTag(html, 'title')
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description')
    const image = extractMeta(html, 'og:image')

    return { title, description, image }
  } catch {
    return { title: null, description: null, image: null }
  }
}

function extractMeta(html: string, property: string): string | null {
  // Match both property="og:..." and name="description" patterns
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escapeRegex(property)}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escapeRegex(property)}["']`,
    'i',
  )
  const match = html.match(regex)
  return match?.[1] || match?.[2] || null
}

function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i')
  return html.match(regex)?.[1]?.trim() || null
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
