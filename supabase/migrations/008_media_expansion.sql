-- ============================================================
-- Media Expansion: New document types, OCR, metadata, text feedback
-- ============================================================

-- ============================================================
-- 1. EXPAND loopical_media
-- ============================================================

-- Drop old CHECK constraint and add expanded one
alter table public.loopical_media
  drop constraint if exists loopical_media_media_type_check;

alter table public.loopical_media
  add constraint loopical_media_media_type_check
    check (media_type in ('image', 'pdf', 'url', 'video', 'markdown', 'document'));

-- New columns for metadata, thumbnails, and OCR text
alter table public.loopical_media
  add column metadata jsonb,
  add column thumbnail_url text,
  add column ocr_text text;

comment on column public.loopical_media.metadata is 'Flexible metadata: OG tags, page count, embed type, dimensions, etc.';
comment on column public.loopical_media.thumbnail_url is 'Server-generated preview image for non-image media (PDFs, videos, documents)';
comment on column public.loopical_media.ocr_text is 'Extracted text content from OCR, PDF text extraction, or markdown source';

-- ============================================================
-- 2. EXPAND feedback_points (PDF page + video timestamp markers)
-- ============================================================

alter table public.feedback_points
  add column marker_page integer not null default 0,
  add column marker_timestamp_ms integer;

comment on column public.feedback_points.marker_page is 'PDF page index (0-based) for page-specific markers';
comment on column public.feedback_points.marker_timestamp_ms is 'Video timestamp in ms for time-based markers';

-- ============================================================
-- 3. EXPAND feedback_entries media_type (add text)
-- ============================================================

-- Drop old CHECK and add text option
alter table public.feedback_entries
  drop constraint if exists feedback_entries_media_type_check;

alter table public.feedback_entries
  add constraint feedback_entries_media_type_check
    check (media_type in ('audio', 'video', 'text'));

-- Also expand loopicals.media_type CHECK for legacy column
alter table public.loopicals
  drop constraint if exists loopicals_media_type_check;

alter table public.loopicals
  add constraint loopicals_media_type_check
    check (media_type in ('image', 'pdf', 'url', 'video', 'markdown', 'document'));

-- ============================================================
-- 4. UPDATE SECURITY-DEFINER FUNCTIONS
-- ============================================================

-- Update get_loopical_media_by_share_token to return new columns
drop function if exists public.get_loopical_media_by_share_token(text, uuid);

create or replace function public.get_loopical_media_by_share_token(token text, p_loopical_id uuid)
returns table (
  id uuid,
  media_url text,
  media_type text,
  order_index integer,
  metadata jsonb,
  thumbnail_url text,
  ocr_text text
)
language plpgsql
security definer set search_path = ''
as $$
begin
  return query
  select
    lm.id,
    lm.media_url,
    lm.media_type,
    lm.order_index,
    lm.metadata,
    lm.thumbnail_url,
    lm.ocr_text
  from public.loopical_media lm
  join public.loopicals l on l.id = lm.loopical_id
  join public.projects p on p.id = l.project_id
  where p.share_token = token
    and lm.loopical_id = p_loopical_id
    and p.archived_at is null
  order by lm.order_index asc;
end;
$$;

-- Update get_feedback_points_by_share_token to return new columns
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
