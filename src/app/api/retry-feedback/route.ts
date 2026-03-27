import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { processFeedbackEntry } from '@/lib/ai/pipeline'
import { ApiError, errorResponse } from '@/lib/api-error'

export async function POST(request: Request) {
  try {
    const { entryId } = await request.json()

    if (!entryId) {
      throw new ApiError('entryId required', 400, 'MISSING_PARAMS')
    }

    const admin = createAdminClient()

    // Reset status to pending
    await admin
      .from('feedback_entries')
      .update({ processing_status: 'pending' })
      .eq('id', entryId)

    // Process inline
    await processFeedbackEntry(entryId)

    return NextResponse.json({ success: true })
  } catch (err) {
    return errorResponse(err)
  }
}
