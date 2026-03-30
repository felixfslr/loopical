-- ============================================================
-- Iframe viewport markers: desktop/mobile viewport for URL media markers
-- ============================================================

-- Add viewport column to feedback_points for iframe-based markers
alter table public.feedback_points
  add column marker_viewport text default 'desktop'
    check (marker_viewport in ('desktop', 'mobile'));

comment on column public.feedback_points.marker_viewport is 'Viewport size used when placing marker on URL/iframe media: desktop (1440x900) or mobile (375x812)';

-- Update security-definer function to return viewport
drop function if exists public.get_feedback_points_by_share_token(text, uuid);

create or replace function public.get_feedback_points_by_share_token(token text, p_loopical_id uuid)
returns table (
  id uuid,
  question_text text,
  question_audio_url text,
  question_transcript text,
  marker_x double precision,
  marker_y double precision,
  marker_media_index integer,
  marker_page integer,
  marker_timestamp_ms integer,
  marker_viewport text,
  order_index integer,
  context_url text
)
language plpgsql
security definer set search_path = ''
as $$
begin
  return query
  select
    fp.id,
    fp.question_text,
    fp.question_audio_url,
    fp.question_transcript,
    fp.marker_x,
    fp.marker_y,
    fp.marker_media_index,
    fp.marker_page,
    fp.marker_timestamp_ms,
    fp.marker_viewport,
    fp.order_index,
    fp.context_url
  from public.feedback_points fp
  join public.loopicals l on l.id = fp.loopical_id
  join public.projects p on p.id = l.project_id
  where p.share_token = token
    and fp.loopical_id = p_loopical_id
    and p.archived_at is null
  order by fp.order_index asc;
end;
$$;
