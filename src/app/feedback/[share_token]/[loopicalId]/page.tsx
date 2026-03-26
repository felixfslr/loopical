import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { FeedbackSubmitForm } from '@/components/feedback-submit-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-16">
        <Link
          href={`/feedback/${share_token}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Alle Feedback-Punkte
        </Link>

        {/* Loopical Info */}
        <div className="mb-8">
          {loopical.media_url && (
            <div className="aspect-video max-h-64 w-full overflow-hidden rounded-lg bg-muted mb-6">
              <img
                src={loopical.media_url}
                alt={loopical.title}
                className="h-full w-full object-contain"
              />
            </div>
          )}

          <h1 className="text-2xl font-bold tracking-tight">
            {loopical.title}
          </h1>
          {loopical.description && (
            <p className="text-muted-foreground mt-2">{loopical.description}</p>
          )}
        </div>

        {/* Recording UI */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Dein Voice-Feedback
          </h2>
          <FeedbackSubmitForm
            loopicalId={loopicalId}
            showGuestName
          />
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <span className="font-medium text-foreground">Loopical</span>
          </p>
        </div>
      </div>
    </div>
  )
}
