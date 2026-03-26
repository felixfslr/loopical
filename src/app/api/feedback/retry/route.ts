import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processFeedbackEntry } from '@/lib/ai/pipeline'

export async function POST(request: Request) {
  try {
    const { entryId } = await request.json()

    if (!entryId) {
      return NextResponse.json({ error: 'entryId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Reset status to pending
    await admin
      .from('feedback_entries')
      .update({ processing_status: 'pending' })
      .eq('id', entryId)

    // Process inline (don't use after() so we can report errors)
    await processFeedbackEntry(entryId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Retry error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
