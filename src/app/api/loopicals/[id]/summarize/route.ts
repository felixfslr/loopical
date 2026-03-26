import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { summarizeLoopical } from '@/lib/ai/summarize-loopical'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser()
    const { id } = await params

    const result = await summarizeLoopical(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Summarize error:', err)
    return NextResponse.json(
      { error: 'Zusammenfassung konnte nicht generiert werden.' },
      { status: 500 },
    )
  }
}
