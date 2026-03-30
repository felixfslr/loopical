import { NextRequest, NextResponse } from 'next/server'
import { fetchOpenGraphFull } from '@/lib/opengraph'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  try {
    new URL(url) // validate
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  const data = await fetchOpenGraphFull(url)
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
