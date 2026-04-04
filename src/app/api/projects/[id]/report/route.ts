import { NextResponse } from 'next/server'
import { generateFeedbackReport } from '@/lib/ai/generate-report'
import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiError, errorResponse } from '@/lib/api-error'
import { logger } from '@/lib/logger'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser()
    const { id: projectId } = await params

    // Optional: custom period from query
    const url = new URL(request.url)
    const periodDays = parseInt(url.searchParams.get('days') ?? '7', 10)

    if (!projectId) {
      throw new ApiError('Projekt-ID erforderlich.', 400, 'MISSING_PARAMS')
    }

    // Verify ownership
    const admin = createAdminClient()
    const { data: project } = await admin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single()

    if (!project) {
      throw new ApiError('Zugriff verweigert.', 403, 'FORBIDDEN')
    }

    const report = await generateFeedbackReport(projectId, periodDays)
    return NextResponse.json(report)
  } catch (err) {
    logger.error({ err }, 'Report generation error')
    return errorResponse(err)
  }
}
