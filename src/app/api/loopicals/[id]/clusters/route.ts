import { NextResponse } from 'next/server'
import { clusterFeedback } from '@/lib/ai/clustering'
import { detectConsensus } from '@/lib/ai/consensus'
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
    const { id: loopicalId } = await params

    if (!loopicalId) {
      throw new ApiError('Loopical-ID erforderlich.', 400, 'MISSING_PARAMS')
    }

    // Verify ownership: loopical → project.owner_id
    const admin = createAdminClient()
    const { data: loopical } = await admin
      .from('loopicals')
      .select('project_id')
      .eq('id', loopicalId)
      .single()

    if (!loopical) throw new ApiError('Loopical nicht gefunden.', 404, 'NOT_FOUND')

    const { data: project } = await admin
      .from('projects')
      .select('id')
      .eq('id', loopical.project_id)
      .eq('owner_id', user.id)
      .single()

    if (!project) throw new ApiError('Zugriff verweigert.', 403, 'FORBIDDEN')

    const clusters = await clusterFeedback(loopicalId)
    const insights = await detectConsensus(clusters)

    return NextResponse.json({ clusters, insights })
  } catch (err) {
    logger.error({ err }, 'Clustering error')
    return errorResponse(err)
  }
}
