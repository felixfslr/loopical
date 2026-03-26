import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { StatusSelector } from '@/components/status-selector'
import { EditableAnnotation } from '@/components/editable-annotation'
import { LoopicalFeedbackSection } from '@/components/loopical-feedback-section'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { LoopicalStatus } from '@/lib/types/database'

export default async function LoopicalDetailPage({
  params,
}: {
  params: Promise<{ id: string; loopicalId: string }>
}) {
  const { id, loopicalId } = await params
  const user = await requireUser()
  const supabase = createAdminClient()

  const { data: loopical } = await supabase
    .from('loopicals')
    .select('*')
    .eq('id', loopicalId)
    .single()

  if (!loopical) {
    notFound()
  }

  const { data: feedbackEntries } = await supabase
    .from('feedback_entries')
    .select(`
      *,
      profiles:author_id(full_name)
    `)
    .eq('loopical_id', loopicalId)
    .order('created_at', { ascending: false })

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', id)
    .single()

  const entries = (feedbackEntries ?? []).map((entry) => ({
    ...entry,
    author_name:
      (entry.profiles as unknown as { full_name: string } | null)
        ?.full_name ?? null,
    processing_status: entry.processing_status as any,
    sentiment: entry.sentiment as any,
    word_timestamps: entry.word_timestamps as any,
    action_items: entry.action_items as any,
    tags: entry.tags as any,
  }))

  return (
    <div>
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {project?.name ?? 'Projekt'}
      </Link>

      {/* Loopical Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {loopical.title}
            </h1>
            {loopical.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {loopical.description}
              </p>
            )}
          </div>
          <StatusSelector
            loopicalId={loopicalId}
            projectId={id}
            currentStatus={loopical.status as LoopicalStatus}
          />
        </div>

        {/* Image */}
        {loopical.media_url && (
          <EditableAnnotation
            src={loopical.media_url}
            alt={loopical.title}
            loopicalId={loopicalId}
            projectId={id}
            annotationX={loopical.annotation_x}
            annotationY={loopical.annotation_y}
          />
        )}
      </div>

      {/* Feedback Section (Record + List with optimistic UI) */}
      <LoopicalFeedbackSection
        entries={entries}
        projectId={id}
        loopicalId={loopicalId}
        authorId={user.id}
      />
    </div>
  )
}
