CREATE OR REPLACE FUNCTION public.deny_listener_workspace_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_listener_account() THEN
    -- Listener accounts use this single, narrow profile setting for their own
    -- followed-release alerts. Allow nothing else through the workspace write guard.
    IF TG_TABLE_SCHEMA = 'public'
       AND TG_TABLE_NAME = 'profiles'
       AND TG_OP = 'UPDATE'
       AND NEW.notification_preferences IS DISTINCT FROM OLD.notification_preferences
       AND (NEW.notification_preferences - 'new_followed_releases')
             IS NOT DISTINCT FROM
           (OLD.notification_preferences - 'new_followed_releases')
       AND pg_catalog.jsonb_typeof(NEW.notification_preferences->'new_followed_releases') = 'boolean'
       AND (pg_catalog.to_jsonb(NEW) - 'notification_preferences')
             IS NOT DISTINCT FROM
           (pg_catalog.to_jsonb(OLD) - 'notification_preferences')
    THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Listener accounts cannot modify artist or label workspace data.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
