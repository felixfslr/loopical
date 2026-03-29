-- Migration 007: Action Items table, Inbox columns, Video feedback, Follow-up questions
-- Features: Action Items (F2), Inbox AI Triage (F1), Video Feedback (F3), Follow-up Questions (F4)

-- ============================================================
-- Feature 2: Action Items as First-Class Entity
-- ============================================================

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  feedback_entry_id uuid not null references public.feedback_entries(id) on delete cascade,
  text text not null,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  assignee_id uuid references public.profiles(id) on delete set null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_action_items_feedback_entry on public.action_items(feedback_entry_id);
create index idx_action_items_assignee on public.action_items(assignee_id);
create index idx_action_items_status on public.action_items(status);

-- RLS
alter table public.action_items enable row level security;

-- Allow service role full access (we use admin client for all authenticated operations)
create policy "Service role full access" on public.action_items
  for all using (true) with check (true);

-- Enable realtime
alter publication supabase_realtime add table public.action_items;

-- Migrate existing action_items JSONB data into the new table
insert into public.action_items (feedback_entry_id, text, priority, status, order_index)
select
  fe.id as feedback_entry_id,
  (item.value)->>'text' as text,
  coalesce((item.value)->>'priority', 'medium') as priority,
  case when ((item.value)->>'done')::boolean then 'done' else 'open' end as status,
  (item.ordinality)::integer - 1 as order_index
from public.feedback_entries fe,
  lateral jsonb_array_elements(fe.action_items::jsonb) with ordinality as item(value, ordinality)
where fe.action_items is not null
  and jsonb_typeof(fe.action_items::jsonb) = 'array'
  and jsonb_array_length(fe.action_items::jsonb) > 0;

-- ============================================================
-- Feature 1: Inbox with AI Triage
-- ============================================================

alter table public.feedback_entries
  add column is_read boolean not null default false,
  add column priority_score integer not null default 0;

create index idx_feedback_entries_priority on public.feedback_entries(priority_score desc, created_at desc);
create index idx_feedback_entries_is_read on public.feedback_entries(is_read);

-- Backfill priority scores for existing entries
update public.feedback_entries set priority_score =
  case when sentiment = 'critical' then 40
       when sentiment = 'neutral' then 10
       else 0
  end
  + case when action_items is not null and jsonb_array_length(action_items::jsonb) > 0 then
      case when exists (
        select 1 from jsonb_array_elements(action_items::jsonb) item
        where item->>'priority' = 'high'
      ) then 30 else 15 end
    else 0
  end
where processing_status = 'complete';

-- ============================================================
-- Feature 4: AI Follow-up Questions
-- ============================================================

alter table public.feedback_entries
  add column follow_up_questions jsonb,
  add column parent_entry_id uuid references public.feedback_entries(id) on delete set null;

create index idx_feedback_entries_parent on public.feedback_entries(parent_entry_id);

-- ============================================================
-- Feature 3: Video Feedback
-- ============================================================

alter table public.feedback_entries
  add column media_type text not null default 'audio' check (media_type in ('audio', 'video')),
  add column video_url text;

-- Make audio_url nullable (video entries may not have separate audio)
alter table public.feedback_entries alter column audio_url drop not null;

-- Create video storage bucket (same policies as audio bucket)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'video',
  'video',
  true,
  104857600, -- 100MB
  array['video/webm', 'video/mp4']
) on conflict (id) do nothing;

-- Storage policies for video bucket
create policy "Public read access" on storage.objects
  for select using (bucket_id = 'video');
create policy "Anyone can upload video" on storage.objects
  for insert with check (bucket_id = 'video');
