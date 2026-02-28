
-- Add AI cross-validation columns to inspection_items
ALTER TABLE public.inspection_items 
ADD COLUMN IF NOT EXISTS ai_agreement text,
ADD COLUMN IF NOT EXISTS ai_visual_note text;
