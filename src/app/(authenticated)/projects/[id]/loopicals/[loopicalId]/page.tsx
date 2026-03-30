import { requireUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { LoopicalDetailView } from '@/components/loopical-detail-view'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { LoopicalStatus } from '@/lib/types/database'

const PAGE_SIZE = 20

export default async function LoopicalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; loopicalId: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id, loopicalId } = await params
  const { page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
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

  const [
    { data: feedbackEntries, count: totalCount },
    { data: project },
    { data: feedbackPoints },
    { data: loopicalMedia },
  ] = await Promise.all([
    supabase
      .from('feedback_entries')
      .select(`
        *,
        profiles:author_id(full_name)
      `, { count: 'exact' })
      .eq('loopical_id', loopicalId)
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase
      .from('projects')
      .select('name')
      .eq('id', id)
      .single(),
    supabase
      .from('feedback_points')
      .select('*')
      .eq('loopical_id', loopicalId)
      .order('order_index', { ascending: true }),
    supabase
      .from('loopical_media')
      .select('*')
      .eq('loopical_id', loopicalId)
      .order('order_index', { ascending: true }),
  ])

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
    feedback_point_id: entry.feedback_point_id as string | null,
    annotations: entry.annotations as any,
    video_url: entry.video_url as string | null,
    media_type: (entry.media_type ?? 'audio') as 'audio' | 'video',
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

      <LoopicalDetailView
        loopical={{
          id: loopical.id,
          title: loopical.title,
          description: loopical.description,
          status: loopical.status as LoopicalStatus,
          feedback_mode: loopical.feedback_mode,
          media_url: loopical.media_url,
          ai_summary: (loopical as any).ai_summary ?? null,
          ai_action_items: (loopical as any).ai_action_items ?? null,
          ai_summary_updated_at: (loopical as any).ai_summary_updated_at ?? null,
          context_url: loopical.context_url ?? null,
        }}
        projectId={id}
        authorId={user.id}
        entries={entries}
        feedbackPoints={(feedbackPoints ?? []).map((p) => ({
          id: p.id,
          question_text: p.question_text,
          question_audio_url: p.question_audio_url,
          question_transcript: p.question_transcript,
          marker_x: p.marker_x,
          marker_y: p.marker_y,
          marker_media_index: p.marker_media_index ?? 0,
          order_index: p.order_index ?? 0,
          context_url: p.context_url ?? null,
        }))}
        mediaItems={(loopicalMedia ?? []).map((m) => ({
          id: m.id,
          media_url: m.media_url,
          media_type: m.media_type,
          order_index: m.order_index ?? 0,
          metadata: m.metadata as Record<string, unknown> | null,
          thumbnail_url: m.thumbnail_url ?? null,
          ocr_text: m.ocr_text ?? null,
        }))}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalCount: totalCount ?? 0,
        }}
      />
    </div>
  )
}
