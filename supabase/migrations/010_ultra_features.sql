-- Migration 010: Ultra Tool Features
-- Adds: enhanced AI analysis fields, per-feedback-point aggregation, pointer tracking

-- 1. Enhanced AI analysis fields on feedback_entries
ALTER TABLE feedback_entries
  ADD COLUMN IF NOT EXISTS severity smallint CHECK (severity >= 1 AND severity <= 5),
  ADD COLUMN IF NOT EXISTS effort_estimate text CHECK (effort_estimate IN ('quick_fix', 'medium', 'major')),
  ADD COLUMN IF NOT EXISTS usability_category text CHECK (usability_category IN ('navigation', 'layout', 'readability', 'interaction', 'performance', 'accessibility')),
  ADD COLUMN IF NOT EXISTS ui_element_references text[];

-- 2. Per-feedback-point AI aggregation
ALTER TABLE feedback_points
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_consensus_points jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_sentiment_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS ai_summary_updated_at timestamptz;

-- 3. Indexes for efficient aggregation queries
CREATE INDEX IF NOT EXISTS idx_feedback_entries_severity ON feedback_entries (severity) WHERE severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_entries_usability_category ON feedback_entries (usability_category) WHERE usability_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_entries_effort_estimate ON feedback_entries (effort_estimate) WHERE effort_estimate IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_points_ai_summary_updated_at ON feedback_points (ai_summary_updated_at) WHERE ai_summary_updated_at IS NOT NULL;

-- 4. Share link view tracking for analytics
ALTER TABLE loopicals
  ADD COLUMN IF NOT EXISTS share_link_views integer DEFAULT 0;

-- 5. Enable pgvector extension for future embedding support (Phase 3)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- 6. Feedback embeddings table (Phase 3 - commented out until needed)
-- CREATE TABLE IF NOT EXISTS feedback_embeddings (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   feedback_entry_id uuid NOT NULL REFERENCES feedback_entries(id) ON DELETE CASCADE,
--   embedding vector(1536),
--   model text NOT NULL DEFAULT 'text-embedding-3-small',
--   created_at timestamptz DEFAULT now(),
--   UNIQUE(feedback_entry_id)
-- );
