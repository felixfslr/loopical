-- AI-generated aggregated summary and action items per loopical
alter table public.loopicals
  add column if not exists ai_summary text,
  add column if not exists ai_action_items jsonb,
  add column if not exists ai_summary_updated_at timestamptz;
