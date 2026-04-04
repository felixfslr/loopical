import { NextResponse } from 'next/server'
import { summarizeFeedbackPoint } from '@/lib/ai/summarize-feedback-point'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, errorResponse } from '@/lib/api-error'
import { logger } from '@/lib/logger'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id } = await params
    if (!id) throw new ApiError('Feedback-Point-ID erforderlich.', 400, 'MISSING_PARAMS')

    // Verify ownership: feedback_point → loopical → project.owner_id
    const admin = createAdminClient()
    const { data: point } = await admin
      .from('feedback_points')
      .select('loopical_id')
      .eq('id', id)
      .single()

    if (!point) throw new ApiError('Feedback-Punkt nicht gefunden.', 404, 'NOT_FOUND')

    const { data: loopical } = await admin
      .from('loopicals')
      .select('project_id')
      .eq('id', point.loopical_id)
      .single()

    if (!loopical) throw new ApiError('Loopical nicht gefunden.', 404, 'NOT_FOUND')

    const { data: project } = await admin
      .from('projects')
      .select('id')
      .eq('id', loopical.project_id)
      .eq('owner_id', user.id)
      .single()

    if (!project) throw new ApiError('Zugriff verweigert.', 403, 'FORBIDDEN')

    const result = await summarizeFeedbackPoint(id)
    return NextResponse.json(result)
  } catch (err) {
    logger.error({ err }, 'Feedback point summarize error')
    return errorResponse(err)
  }
}
