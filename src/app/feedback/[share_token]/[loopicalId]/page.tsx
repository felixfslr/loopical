import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { GuidedFeedbackFlow } from '@/components/guided-feedback-flow'
import { OpenFeedbackFlow } from '@/components/open-feedback-flow'

export default async function GuestLoopicalFeedbackPage({
  params,
}: {
  params: Promise<{ share_token: string; loopicalId: string }>
}) {
  const { share_token, loopicalId } = await params
  const admin = createAdminClient()

  // Verify share token is valid
  const { data: projects } = await admin.rpc('get_project_by_share_token', {
    token: share_token,
  })

  const project = projects?.[0]
  if (!project) {
    notFound()
  }

  // Get loopical details
  const { data: loopical } = await admin
    .from('loopicals')
    .select('*')
    .eq('id', loopicalId)
    .eq('project_id', project.id)
    .single()

  if (!loopical) {
    notFound()
  }

  // Guided mode: load feedback points and media
  if (loopical.feedback_mode === 'guided') {
    const [{ data: feedbackPoints }, { data: loopicalMedia }] = await Promise.all([
      admin.rpc('get_feedback_points_by_share_token', {
        token: share_token,
        p_loopical_id: loopicalId,
      }),
      admin.rpc('get_loopical_media_by_share_token', {
        token: share_token,
        p_loopical_id: loopicalId,
      }),
    ])

    return (
      <GuidedFeedbackFlow
        loopicalId={loopicalId}
        loopicalTitle={loopical.title}
        welcomeMessage={loopical.welcome_message}
        contextUrl={loopical.context_url}
        feedbackPoints={feedbackPoints ?? []}
        media={(loopicalMedia ?? []).map((m) => ({
          ...m,
          metadata: (typeof m.metadata === 'object' && m.metadata !== null && !Array.isArray(m.metadata)) ? m.metadata as Record<string, unknown> : null,
        }))}
        shareToken={share_token}
      />
    )
  }

  // Open mode: load markers and media
  const [{ data: allLoopicals }, { data: loopicalMedia }] = await Promise.all([
    admin.rpc('get_loopicals_by_share_token', { token: share_token }),
    admin.rpc('get_loopical_media_by_share_token', {
      token: share_token,
      p_loopical_id: loopicalId,
    }),
  ])

  const existingMarkers = (allLoopicals ?? [])
    .filter((l: any) => l.annotation_x != null && l.annotation_y != null)
    .map((l: any) => ({
      id: l.id,
      label: l.title,
      x: l.annotation_x,
      y: l.annotation_y,
    }))

  const displayMediaUrl = loopicalMedia?.[0]?.media_url ?? loopical.media_url

  return (
    <OpenFeedbackFlow
      loopicalId={loopicalId}
      loopicalTitle={loopical.title}
      loopicalDescription={loopical.description}
      contextUrl={loopical.context_url}
      displayMediaUrl={displayMediaUrl}
      existingMarkers={existingMarkers}
      shareToken={share_token}
    />
  )
}
