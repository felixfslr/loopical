import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { suggestFeedbackQuestions } from '@/lib/ai/suggest-questions'
import { ApiError, errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    await requireUser()

    const { title, mediaCount } = await request.json()

    if (!title || typeof title !== 'string') {
      throw new ApiError('Title is required', 400, 'MISSING_PARAMS')
    }

    const suggestions = await suggestFeedbackQuestions(title, mediaCount ?? 0)
    return NextResponse.json({ questions: suggestions })
  } catch (err) {
    return errorResponse(err)
  }
}
