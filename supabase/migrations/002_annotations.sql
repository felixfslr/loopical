-- ============================================================
-- Add annotation coordinates to loopicals
-- ============================================================

alter table public.loopicals
  add column annotation_x double precision,
  add column annotation_y double precision;

comment on column public.loopicals.annotation_x is 'X position as percentage (0-100) on the project image';
comment on column public.loopicals.annotation_y is 'Y position as percentage (0-100) on the project image';

-- Update function to include annotation columns
create or replace function public.get_loopicals_by_share_token(token text)
returns table (
  id uuid,
  title text,
  description text,
  media_url text,
  media_type text,
  status text,
  order_index integer,
  feedback_count bigint,
  annotation_x double precision,
  annotation_y double precision
)
language plpgsql
security definer set search_path = ''
as $$
begin
  return query
  select
    l.id,
    l.title,
    l.description,
    l.media_url,
    l.media_type,
    l.status,
    l.order_index,
    count(fe.id) as feedback_count,
    l.annotation_x,
    l.annotation_y
  from public.loopicals l
  join public.projects p on p.id = l.project_id
  left join public.feedback_entries fe on fe.loopical_id = l.id
  where p.share_token = token
    and p.archived_at is null
  group by l.id
  order by l.order_index asc;
end;
$$;
