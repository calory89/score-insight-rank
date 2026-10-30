
-- Add the duplicate profile policies with IF NOT EXISTS workaround
DO $$
BEGIN
  -- Try to create "Profiles are viewable by everyone" policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Profiles are viewable by everyone') THEN
    EXECUTE 'CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true)';
  END IF;
END $$;
