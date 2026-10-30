
-- Due Diligence Checklists
CREATE TABLE public.due_diligence_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, analysis_id)
);
ALTER TABLE public.due_diligence_checklists ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_due_diligence_user ON public.due_diligence_checklists(user_id);

CREATE POLICY "Users can view own checklists" ON public.due_diligence_checklists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checklists" ON public.due_diligence_checklists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checklists" ON public.due_diligence_checklists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own checklists" ON public.due_diligence_checklists FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_due_diligence_updated_at BEFORE UPDATE ON public.due_diligence_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Scout Alerts
CREATE TABLE public.scout_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  criteria jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scout_alerts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_scout_alerts_active ON public.scout_alerts(active) WHERE active = true;

CREATE POLICY "Users can view own alerts" ON public.scout_alerts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON public.scout_alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.scout_alerts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON public.scout_alerts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_scout_alerts_updated_at BEFORE UPDATE ON public.scout_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications (persisted, replaces localStorage)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'scout_match',
  title text NOT NULL,
  body text,
  metadata jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
