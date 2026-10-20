CREATE OR REPLACE FUNCTION public.deny_listener_workspace_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_listener_account() THEN
    RAISE EXCEPTION 'Listener accounts cannot modify artist or label workspace data.'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.deny_listener_workspace_writes() FROM PUBLIC, anon, authenticated;

DO $triggers$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','p')
      AND c.relrowsecurity
      AND c.relname <> 'edge_rate_limits'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS deny_listener_workspace_writes ON public.%I', t.relname);
    EXECUTE format(
      'CREATE TRIGGER deny_listener_workspace_writes BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.deny_listener_workspace_writes()',
      t.relname
    );
  END LOOP;
END;
$triggers$;
