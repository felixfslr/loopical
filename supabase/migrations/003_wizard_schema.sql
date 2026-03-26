-- ============================================================
-- Feedback Wizard: Multi-media, feedback points, guided mode
-- ============================================================

-- ============================================================
-- 1. NEW TABLES
-- ============================================================

-- Multiple media items per loopical
create table public.loopical_media (
  id uuid primary key default gen_random_uuid(),
  loopical_id uuid not null references public.loopicals(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'pdf', 'url')),
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- Specific feedback points/questions per loopical
create table public.feedback_points (
  id uuid primary key default gen_random_uuid(),
  loopical_id uuid not null references public.loopicals(id) on delete cascade,
  question_text text,
  question_audio_url text,
  question_transcript text,
  marker_x double precision,
  marker_y double precision,
  marker_media_index integer default 0,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. ALTER EXISTING TABLES
-- ============================================================

-- Add feedback mode + welcome message to loopicals
alter table public.loopicals
  add column feedback_mode text not null default 'open'
    check (feedback_mode in ('guided', 'open')),
  add column welcome_message text;

comment on column public.loopicals.feedback_mode is 'guided = step-by-step through feedback_points, open = free-form voice recording';
comment on column public.loopicals.welcome_message is 'Optional intro text shown to feedback givers';

-- Link feedback entries to specific feedback points
alter table public.feedback_entries
  add column feedback_point_id uuid references public.feedback_points(id) on delete set null;

comment on column public.feedback_entries.feedback_point_id is 'When set, this feedback addresses a specific feedback point. Null = general/open feedback.';

-- ============================================================
-- 3. ENABLE RLS
-- ============================================================

alter table public.loopical_media enable row level security;
alter table public.feedback_points enable row level security;

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- loopical_media: same access as loopicals (project members)
create policy "Project members can read loopical media"
  on public.loopical_media for select using (
    exists (
      select 1 from public.loopicals
      join public.projects on projects.id = loopicals.project_id
      where loopicals.id = loopical_media.loopical_id
        and (
          projects.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members
            where project_members.project_id = projects.id
              and project_members.user_id = auth.uid()
          )
        )
    )
  );

create policy "Project members can manage loopical media"
  on public.loopical_media for all using (
    exists (
      select 1 from public.loopicals
      join public.projects on projects.id = loopicals.project_id
      where loopicals.id = loopical_media.loopical_id
        and (
          projects.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members
            where project_members.project_id = projects.id
              and project_members.user_id = auth.uid()
              and project_members.role in ('owner', 'admin', 'member')
          )
        )
    )
  );

-- feedback_points: same access as loopicals
create policy "Project members can read feedback points"
  on public.feedback_points for select using (
    exists (
      select 1 from public.loopicals
      join public.projects on projects.id = loopicals.project_id
      where loopicals.id = feedback_points.loopical_id
        and (
          projects.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members
            where project_members.project_id = projects.id
              and project_members.user_id = auth.uid()
          )
        )
    )
  );

create policy "Project members can manage feedback points"
  on public.feedback_points for all using (
    exists (
      select 1 from public.loopicals
      join public.projects on projects.id = loopicals.project_id
      where loopicals.id = feedback_points.loopical_id
        and (
          projects.owner_id = auth.uid()
          or exists (
            select 1 from public.project_members
            where project_members.project_id = projects.id
              and project_members.user_id = auth.uid()
              and project_members.role in ('owner', 'admin', 'member')
          )
        )
    )
  );

-- ============================================================
-- 5. MIGRATE EXISTING DATA
-- ============================================================

-- Copy existing media_url into loopical_media
insert into public.loopical_media (loopical_id, media_url, media_type, order_index)
select id, media_url, coalesce(media_type, 'image'), 0
from public.loopicals
where media_url is not null;

-- Copy existing annotations into feedback_points
insert into public.feedback_points (loopical_id, question_text, marker_x, marker_y, marker_media_index, order_index)
select id, description, annotation_x, annotation_y, 0, 0
from public.loopicals
where annotation_x is not null and annotation_y is not null;

-- ============================================================
-- 6. UPDATE FUNCTIONS
-- ============================================================

-- Update get_loopicals_by_share_token to include feedback_mode
drop function if exists public.get_loopicals_by_share_token(text);

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
  annotation_y double precision,
  feedback_mode text,
  welcome_message text
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
    l.annotation_y,
    l.feedback_mode,
    l.welcome_message
  from public.loopicals l
  join public.projects p on p.id = l.project_id
  left join public.feedback_entries fe on fe.loopical_id = l.id
  where p.share_token = token
    and p.archived_at is null
  group by l.id
  order by l.order_index asc;
end;
$$;

-- Get feedback points for a loopical via share token
create or replace function public.get_feedback_points_by_share_token(token text, p_loopical_id uuid)
returns table (
  id uuid,
  question_text text,
  question_audio_url text,
  question_transcript text,
  marker_x double precision,
  marker_y double precision,
  marker_media_index integer,
  order_index integer
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
    fp.order_index
  from public.feedback_points fp
  join public.loopicals l on l.id = fp.loopical_id
  join public.projects p on p.id = l.project_id
  where p.share_token = token
    and fp.loopical_id = p_loopical_id
    and p.archived_at is null
  order by fp.order_index asc;
end;
$$;

-- Get media items for a loopical via share token
create or replace function public.get_loopical_media_by_share_token(token text, p_loopical_id uuid)
returns table (
  id uuid,
  media_url text,
  media_type text,
  order_index integer
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
    lm.order_index
  from public.loopical_media lm
  join public.loopicals l on l.id = lm.loopical_id
  join public.projects p on p.id = l.project_id
  where p.share_token = token
    and lm.loopical_id = p_loopical_id
    and p.archived_at is null
  order by lm.order_index asc;
end;
$$;

-- ============================================================
-- 7. INDEXES
-- ============================================================

create index idx_loopical_media_loopical on public.loopical_media(loopical_id);
create index idx_feedback_points_loopical on public.feedback_points(loopical_id);
create index idx_feedback_entries_point on public.feedback_entries(feedback_point_id);
