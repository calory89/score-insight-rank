
CREATE TABLE public.property_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_notes_user_analysis ON public.property_notes(user_id, analysis_id);

ALTER TABLE public.property_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.property_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notes" ON public.property_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.property_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.property_notes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_property_notes_updated_at BEFORE UPDATE ON public.property_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
