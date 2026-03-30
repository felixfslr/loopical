interface FigmaUrlInfo {
  fileKey: string
  nodeId?: string
}

export function parseFigmaUrl(url: string): FigmaUrlInfo | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('figma.com')) return null

    const pathParts = u.pathname.split('/')
    // /design/:fileKey/:fileName or /file/:fileKey/:fileName
    const designIdx = pathParts.indexOf('design')
    const fileIdx = pathParts.indexOf('file')
    const idx = designIdx !== -1 ? designIdx : fileIdx
    if (idx === -1 || !pathParts[idx + 1]) return null

    // Check for branch: /design/:fileKey/branch/:branchKey/:fileName
    const branchIdx = pathParts.indexOf('branch')
    const fileKey = branchIdx !== -1 ? pathParts[branchIdx + 1] : pathParts[idx + 1]

    // Node ID from query param (convert - to :)
    const nodeId = u.searchParams.get('node-id')?.replace(/-/g, ':') ?? undefined

    return { fileKey, nodeId }
  } catch {
    return null
  }
}

export async function fetchFigmaScreenshot(
  fileKey: string,
  nodeId?: string,
): Promise<string | null> {
  const token = process.env.FIGMA_ACCESS_TOKEN
  if (!token) return null

  try {
    const ids = nodeId ? `&ids=${nodeId}` : ''
    const res = await fetch(
      `https://api.figma.com/v1/images/${fileKey}?format=png&scale=2${ids}`,
      {
        headers: { 'X-Figma-Token': token },
        signal: AbortSignal.timeout(10000),
      },
    )
    if (!res.ok) return null

    const data = await res.json()
    if (!data.images) return null

    // Return the first available image URL
    return Object.values(data.images)[0] as string ?? null
  } catch {
    return null
  }
}
