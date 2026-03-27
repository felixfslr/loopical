-- ============================================================
-- Context URL: optional live link for feedback givers
-- ============================================================

-- Loopical-level context URL
ALTER TABLE public.loopicals ADD COLUMN context_url text;
COMMENT ON COLUMN public.loopicals.context_url IS 'Optional URL feedback givers can open in a new tab as live context';

-- Per-feedback-point context URL (overrides loopical-level)
ALTER TABLE public.feedback_points ADD COLUMN context_url text;
COMMENT ON COLUMN public.feedback_points.context_url IS 'Optional URL for this specific feedback point, overrides loopical-level context_url';

-- ============================================================
-- Update security definer functions to return context_url
-- ============================================================

-- get_loopicals_by_share_token
DROP FUNCTION IF EXISTS public.get_loopicals_by_share_token(text);

CREATE OR REPLACE FUNCTION public.get_loopicals_by_share_token(token text)
RETURNS TABLE (
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
  welcome_message text,
  context_url text
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.description,
    l.media_url,
    l.media_type,
    l.status,
    l.order_index,
    count(fe.id) AS feedback_count,
    l.annotation_x,
    l.annotation_y,
    l.feedback_mode,
    l.welcome_message,
    l.context_url
  FROM public.loopicals l
  JOIN public.projects p ON p.id = l.project_id
  LEFT JOIN public.feedback_entries fe ON fe.loopical_id = l.id
  WHERE p.share_token = token
    AND p.archived_at IS NULL
  GROUP BY l.id
  ORDER BY l.order_index ASC;
END;
$$;

-- get_feedback_points_by_share_token
DROP FUNCTION IF EXISTS public.get_feedback_points_by_share_token(text, uuid);

CREATE OR REPLACE FUNCTION public.get_feedback_points_by_share_token(token text, p_loopical_id uuid)
RETURNS TABLE (
  id uuid,
  question_text text,
  question_audio_url text,
  question_transcript text,
  marker_x double precision,
  marker_y double precision,
  marker_media_index integer,
  order_index integer,
  context_url text
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fp.id,
    fp.question_text,
    fp.question_audio_url,
    fp.question_transcript,
    fp.marker_x,
    fp.marker_y,
    fp.marker_media_index,
    fp.order_index,
    fp.context_url
  FROM public.feedback_points fp
  JOIN public.loopicals l ON l.id = fp.loopical_id
  JOIN public.projects p ON p.id = l.project_id
  WHERE p.share_token = token
    AND fp.loopical_id = p_loopical_id
    AND p.archived_at IS NULL
  ORDER BY fp.order_index ASC;
END;
$$;
