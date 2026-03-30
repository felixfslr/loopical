export interface OgData {
  title: string | null
  description: string | null
  image: string | null
  embeddable: boolean
  embedBlockReason: string | null
}

export async function fetchOpenGraph(url: string): Promise<OgData> {
  const empty: OgData = { title: null, description: null, image: null, embeddable: false, embedBlockReason: null }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Loopical/1.0 (OG fetcher)' },
      signal: AbortSignal.timeout(8000),
      redirect: 'manual', // Don't follow redirects automatically — detect login redirects
    })

    // Detect login redirects (301/302/303/307/308 to auth/login/signin paths)
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location') || ''
      const isLoginRedirect = /\b(login|signin|sign-in|auth|sso|oauth|cas|saml)\b/i.test(location)
      if (isLoginRedirect) {
        return { ...empty, embedBlockReason: 'login_required' }
      }
      // Non-login redirect — re-fetch following redirect to get OG data
      const followRes = await fetch(url, {
        headers: { 'User-Agent': 'Loopical/1.0 (OG fetcher)' },
        signal: AbortSignal.timeout(5000),
      })
      if (!followRes.ok) return { ...empty, embedBlockReason: 'http_error' }
      return parseResponse(followRes, url)
    }

    if (!res.ok) return { ...empty, embedBlockReason: 'http_error' }

    return parseResponse(res, url)
  } catch {
    return { ...empty, embedBlockReason: 'fetch_failed' }
  }
}

function parseResponse(res: Response, originalUrl: string): OgData {
  const embedCheck = checkEmbeddable(res.headers, originalUrl)

  // We need to read the body — but we already have the response
  // Return a promise-like result by making this async in the caller
  // Actually, let's restructure: return partial and let caller fill in HTML-based data
  return {
    title: null,
    description: null,
    image: null,
    ...embedCheck,
  }
}

/**
 * Full OG fetch that reads headers + body.
 */
export async function fetchOpenGraphFull(url: string): Promise<OgData> {
  const empty: OgData = { title: null, description: null, image: null, embeddable: false, embedBlockReason: null }

  try {
    // First: HEAD request to check embed headers without downloading body
    const headRes = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Loopical/1.0 (embed check)' },
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    })

    // Detect login redirects
    if (headRes.status >= 300 && headRes.status < 400) {
      const location = headRes.headers.get('location') || ''
      if (/\b(login|signin|sign-in|auth|sso|oauth|cas|saml)\b/i.test(location)) {
        return { ...empty, embedBlockReason: 'login_required' }
      }
    }

    const embedFromHead = checkEmbeddable(headRes.headers, url)

    // Now GET for OG tags
    const getRes = await fetch(url, {
      headers: { 'User-Agent': 'Loopical/1.0 (OG fetcher)' },
      signal: AbortSignal.timeout(8000),
    })

    if (!getRes.ok) return { ...empty, ...embedFromHead, embedBlockReason: embedFromHead.embedBlockReason || 'http_error' }

    const contentType = getRes.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      // Non-HTML (e.g. PDF, image) — embeddable depends on headers only
      return { ...empty, ...embedFromHead }
    }

    const html = await getRes.text()
    const title = extractMeta(html, 'og:title') || extractTag(html, 'title')
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description')
    const image = extractMeta(html, 'og:image')

    // Also check for meta-based frame blocking
    const metaFrameBlock = checkMetaFrameBlock(html)
    const embedResult = metaFrameBlock
      ? { embeddable: false, embedBlockReason: metaFrameBlock }
      : embedFromHead

    return { title, description, image, ...embedResult }
  } catch {
    return { ...empty, embedBlockReason: 'fetch_failed' }
  }
}

/**
 * Check HTTP headers for iframe blocking signals.
 */
function checkEmbeddable(headers: Headers, url: string): { embeddable: boolean; embedBlockReason: string | null } {
  // X-Frame-Options
  const xfo = headers.get('x-frame-options')?.toLowerCase()
  if (xfo === 'deny') {
    return { embeddable: false, embedBlockReason: 'x_frame_options_deny' }
  }
  if (xfo === 'sameorigin') {
    return { embeddable: false, embedBlockReason: 'x_frame_options_sameorigin' }
  }

  // Content-Security-Policy: frame-ancestors
  const csp = headers.get('content-security-policy') || ''
  const frameAncestors = csp.match(/frame-ancestors\s+([^;]+)/i)?.[1]?.trim()
  if (frameAncestors) {
    // 'none' → completely blocked
    if (frameAncestors === "'none'") {
      return { embeddable: false, embedBlockReason: 'csp_frame_ancestors_none' }
    }
    // 'self' only → blocked for cross-origin
    if (frameAncestors === "'self'") {
      return { embeddable: false, embedBlockReason: 'csp_frame_ancestors_self' }
    }
    // Specific domains listed — blocked unless our domain is listed
    if (!frameAncestors.includes('*') && !frameAncestors.includes('loopical')) {
      return { embeddable: false, embedBlockReason: 'csp_frame_ancestors_restricted' }
    }
  }

  // No blocking headers found
  return { embeddable: true, embedBlockReason: null }
}

/**
 * Check HTML meta tags for frame-busting patterns.
 */
function checkMetaFrameBlock(html: string): string | null {
  // <meta http-equiv="X-Frame-Options" content="deny">
  const metaXfo = html.match(/<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*content=["']([^"']*)["']/i)?.[1]
  if (metaXfo) {
    const val = metaXfo.toLowerCase()
    if (val === 'deny' || val === 'sameorigin') return 'meta_x_frame_options'
  }

  // Common JS frame-busting patterns (top !== self)
  if (/if\s*\(\s*(?:top|window\.top|parent)\s*!==?\s*(?:self|window\.self|window)\s*\)/.test(html)) {
    return 'js_frame_buster'
  }

  return null
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
