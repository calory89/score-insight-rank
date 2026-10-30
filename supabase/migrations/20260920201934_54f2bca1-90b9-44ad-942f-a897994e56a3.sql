CREATE OR REPLACE FUNCTION public.community_deal_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE trusted boolean := false;
BEGIN
  -- auth.uid() is NULL only for server-side contexts: the browser roles (anon/authenticated)
  -- have no INSERT/UPDATE privilege on this table without a signed-in identity.
  IF auth.uid() IS NULL THEN trusted := true; ELSE trusted := public.is_admin(auth.uid()); END IF;
  NEW.source_key := rtrim(split_part(regexp_replace(lower(NEW.source_url), '^https?://(www\.)?', ''), '#', 1), '/');
  NEW.source_domain := split_part(NEW.source_key, '/', 1);
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    IF NOT trusted THEN
      NEW.status := 'pending'; NEW.is_editorial_pick := false; NEW.approved_at := NULL;
      NEW.week_id := NULL; NEW.pick_note := NULL; NEW.reject_reason := NULL;
    END IF;
  ELSE
    IF NOT trusted THEN
      NEW.status := OLD.status; NEW.is_editorial_pick := OLD.is_editorial_pick;
      NEW.approved_at := OLD.approved_at; NEW.week_id := OLD.week_id;
      NEW.pick_note := OLD.pick_note; NEW.reject_reason := OLD.reject_reason;
      NEW.submitted_by := OLD.submitted_by; NEW.slug := OLD.slug;
    END IF;
  END IF;
  RETURN NEW;
END $$;