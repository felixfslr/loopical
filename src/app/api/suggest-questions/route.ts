import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { suggestFeedbackQuestions } from '@/lib/ai/suggest-questions'

export async function POST(request: Request) {
  try {
    await requireUser()

    const { title, mediaCount } = await request.json()

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const suggestions = await suggestFeedbackQuestions(title, mediaCount ?? 0)
    return NextResponse.json({ questions: suggestions })
  } catch (err) {
    console.error('Suggest questions error:', err)
    return NextResponse.json(
      { error: 'Vorschläge konnten nicht generiert werden.' },
      { status: 500 },
    )
  }
}
