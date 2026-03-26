-- ============================================================
-- Loopical MVP Schema
-- ============================================================
-- Order: 1) All tables, 2) All RLS policies, 3) Functions, 4) Indexes

-- ============================================================
-- 1. TABLES
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#6366f1',
  share_token text unique not null default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table public.loopicals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  media_url text,
  media_type text check (media_type in ('image', 'pdf', 'url')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  order_index integer not null default 0
);

create table public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  loopical_id uuid not null references public.loopicals(id) on delete cascade,
  audio_url text not null,
  audio_duration_seconds integer,
  transcript text,
  summary text,
  action_items jsonb,
  sentiment text check (sentiment in ('positive', 'neutral', 'critical')),
  tags text[],
  language text,
  word_timestamps jsonb,
  processing_status text not null default 'pending' check (processing_status in ('pending', 'transcribing', 'analyzing', 'complete', 'error')),
  author_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  feedback_entry_id uuid not null references public.feedback_entries(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. ENABLE RLS ON ALL TABLES
-- ============================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.loopicals enable row level security;
alter table public.feedback_entries enable row level security;
alter table public.comments enable row level security;

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- profiles
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- projects
create policy "Project owner full access"
  on public.projects for all using (auth.uid() = owner_id);
create policy "Project members can read"
  on public.projects for select using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = projects.id
        and project_members.user_id = auth.uid()
    )
  );

-- project_members
create policy "Members can read own memberships"
  on public.project_members for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.projects
      where projects.id = project_members.project_id
        and projects.owner_id = auth.uid()
    )
  );
create policy "Owner can manage members"
  on public.project_members for all using (
    exists (
      select 1 from public.projects
      where projects.id = project_members.project_id
        and projects.owner_id = auth.uid()
    )
  );

-- loopicals
create policy "Project members can read loopicals"
  on public.loopicals for select using (
    exists (
      select 1 from public.projects
      where projects.id = loopicals.project_id
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
create policy "Project members can manage loopicals"
  on public.loopicals for all using (
    exists (
      select 1 from public.projects
      where projects.id = loopicals.project_id
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

-- feedback_entries
create policy "Project members can read feedback"
  on public.feedback_entries for select using (
    exists (
      select 1 from public.loopicals
      join public.projects on projects.id = loopicals.project_id
      where loopicals.id = feedback_entries.loopical_id
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
create policy "Authenticated users can insert feedback"
  on public.feedback_entries for insert with check (
    auth.uid() is not null
  );
create policy "Project members can update feedback"
  on public.feedback_entries for update using (
    exists (
      select 1 from public.loopicals
      join public.projects on projects.id = loopicals.project_id
      where loopicals.id = feedback_entries.loopical_id
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

-- comments
create policy "Project members can read comments"
  on public.comments for select using (
    exists (
      select 1 from public.feedback_entries
      join public.loopicals on loopicals.id = feedback_entries.loopical_id
      join public.projects on projects.id = loopicals.project_id
      where feedback_entries.id = comments.feedback_entry_id
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
create policy "Authenticated users can insert comments"
  on public.comments for insert with check (
    auth.uid() = author_id
  );

-- ============================================================
-- 4. REALTIME
-- ============================================================

alter publication supabase_realtime add table public.feedback_entries;

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', null)
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Get project by share token (guest access)
create or replace function public.get_project_by_share_token(token text)
returns table (
  id uuid,
  name text,
  description text,
  color text,
  share_token text
)
language plpgsql
security definer set search_path = ''
as $$
begin
  return query
  select p.id, p.name, p.description, p.color, p.share_token
  from public.projects p
  where p.share_token = token
    and p.archived_at is null;
end;
$$;

-- Get loopicals by share token (guest access)
create or replace function public.get_loopicals_by_share_token(token text)
returns table (
  id uuid,
  title text,
  description text,
  media_url text,
  media_type text,
  status text,
  order_index integer,
  feedback_count bigint
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
    count(fe.id) as feedback_count
  from public.loopicals l
  join public.projects p on p.id = l.project_id
  left join public.feedback_entries fe on fe.loopical_id = l.id
  where p.share_token = token
    and p.archived_at is null
  group by l.id
  order by l.order_index asc;
end;
$$;

-- ============================================================
-- 6. INDEXES
-- ============================================================

create index idx_projects_owner on public.projects(owner_id);
create index idx_projects_share_token on public.projects(share_token);
create index idx_project_members_project on public.project_members(project_id);
create index idx_project_members_user on public.project_members(user_id);
create index idx_loopicals_project on public.loopicals(project_id);
create index idx_feedback_entries_loopical on public.feedback_entries(loopical_id);
create index idx_comments_feedback on public.comments(feedback_entry_id);
