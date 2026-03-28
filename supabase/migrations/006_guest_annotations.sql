-- Guest annotations: pins + freehand strokes on feedback images
ALTER TABLE public.feedback_entries
  ADD COLUMN annotations jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.feedback_entries.annotations IS
  'Guest-created annotations (pins + freehand strokes) with timestamps, stored as JSON array';
