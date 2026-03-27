import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { summarizeLoopical } from '@/lib/ai/summarize-loopical'
import { errorResponse } from '@/lib/api-error'

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
    return errorResponse(err)
  }
}
