import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { FeedbackSubmitForm } from '@/components/feedback-submit-form'
import { ThemeToggle } from '@/components/theme-toggle'
import { GuestAnnotatedImage } from '@/components/guest-annotated-image'
import { GuidedFeedbackFlow } from '@/components/guided-feedback-flow'
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
        feedbackPoints={feedbackPoints ?? []}
        media={loopicalMedia ?? []}
        shareToken={share_token}
      />
    )
  }

  // Open mode: existing behavior
  // Get all loopicals for annotation markers
  const { data: allLoopicals } = await admin.rpc('get_loopicals_by_share_token', {
    token: share_token,
  })

  const markers = (allLoopicals ?? [])
    .filter((l: any) => l.annotation_x != null && l.annotation_y != null)
    .map((l: any) => ({
      id: l.id,
      label: l.title,
      x: l.annotation_x,
      y: l.annotation_y,
    }))

  // For open mode with multiple media, get the media items
  const { data: loopicalMedia } = await admin.rpc('get_loopical_media_by_share_token', {
    token: share_token,
    p_loopical_id: loopicalId,
  })

  // Use first media from loopical_media table, fallback to legacy media_url
  const displayMediaUrl = loopicalMedia?.[0]?.media_url ?? loopical.media_url

  return (
    <div className="min-h-dvh flex flex-col lg:grid lg:grid-cols-2">
      {/* Navigation bar (mobile only) */}
      <div className="flex items-center justify-between p-4 border-b lg:hidden">
        <Link
          href={`/feedback/${share_token}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <h1 className="text-sm font-medium truncate mx-4">{loopical.title}</h1>
        <ThemeToggle />
      </div>

      {/* Document/Image panel */}
      <div className="bg-muted/30 order-1 lg:order-2">
        {/* Title bar (desktop only) */}
        <div className="hidden lg:block p-6 border-b">
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
        <div className="flex items-center justify-center p-4 lg:p-6 lg:flex-1">
          {displayMediaUrl ? (
            <GuestAnnotatedImage
              src={displayMediaUrl}
              alt={loopical.title}
              markers={markers}
              activeMarkerId={loopicalId}
              shareToken={share_token}
            />
          ) : (
            <div className="py-8">
              <p className="text-muted-foreground text-sm">
                Kein Dokument vorhanden
              </p>
            </div>
          )}
        </div>

        {/* Description (mobile) */}
        {loopical.description && (
          <div className="px-4 pb-4 lg:hidden">
            <p className="text-sm text-muted-foreground">
              {loopical.description}
            </p>
          </div>
        )}
      </div>

      {/* Recording panel */}
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 lg:p-8 order-2 lg:order-1 bg-gradient-to-b from-muted/50 to-background">
        {/* Desktop nav */}
        <Link
          href={`/feedback/${share_token}`}
          className="hidden lg:inline-flex absolute top-4 left-4 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <div className="hidden lg:block absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <FeedbackSubmitForm
            loopicalId={loopicalId}
            showGuestName
            variant="standalone"
          />
        </div>

        {/* Footer */}
        <p className="mt-8 lg:absolute lg:bottom-4 text-xs text-muted-foreground">
          Powered by{' '}
          <span className="font-medium text-foreground">Loopical</span>
        </p>
      </div>
    </div>
  )
}
