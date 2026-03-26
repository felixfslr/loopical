import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { FeedbackSubmitForm } from '@/components/feedback-submit-form'
import { ThemeToggle } from '@/components/theme-toggle'
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
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-2">
      {/* Left panel: Recording */}
      <div className="relative flex flex-col items-center justify-center bg-gradient-to-b from-muted/50 to-background p-8 order-2 lg:order-1 min-h-[60vh] lg:min-h-0">
        {/* Back link */}
        <Link
          href={`/feedback/${share_token}`}
          className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>

        {/* Theme toggle */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <FeedbackSubmitForm
          loopicalId={loopicalId}
          showGuestName
          variant="standalone"
        />

        {/* Footer */}
        <p className="absolute bottom-4 text-xs text-muted-foreground">
          Powered by{' '}
          <span className="font-medium text-foreground">Loopical</span>
        </p>
      </div>

      {/* Right panel: Document/Image */}
      <div className="relative flex flex-col bg-muted/30 order-1 lg:order-2">
        {/* Title bar */}
        <div className="p-6 border-b">
          <h1 className="text-lg font-bold tracking-tight">
            {loopical.title}
          </h1>
          {loopical.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {loopical.description}
            </p>
          )}
        </div>

        {/* Image area */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
          {loopical.media_url ? (
            <img
              src={loopical.media_url}
              alt={loopical.title}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Kein Dokument vorhanden
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
