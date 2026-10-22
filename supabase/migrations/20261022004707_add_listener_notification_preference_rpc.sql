CREATE OR REPLACE FUNCTION public.set_listener_release_notification_preference(p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Sign-in required to update listener preferences'
      USING ERRCODE = '42501';
  END IF;

  IF p_enabled IS NULL THEN
    RAISE EXCEPTION 'Preference value is required'
      USING ERRCODE = '22004';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = caller_id
      AND p.role::text = 'listener'
  ) THEN
    RAISE EXCEPTION 'Listener account required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles p
  SET notification_preferences = pg_catalog.jsonb_set(
    COALESCE(p.notification_preferences, '{}'::jsonb),
    '{new_followed_releases}',
    pg_catalog.to_jsonb(p_enabled),
    true
  )
  WHERE p.id = caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listener profile not found'
      USING ERRCODE = 'P0002';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_listener_release_notification_preference(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_listener_release_notification_preference(boolean) TO authenticated;
