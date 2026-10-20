CREATE OR REPLACE FUNCTION public.is_listener_account()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'listener'
  );
$function$;

REVOKE ALL ON FUNCTION public.is_listener_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_listener_account() TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_invite_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF new.raw_user_meta_data->>'account_type' = 'listener' THEN
    RETURN new;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.invites i
    WHERE lower(i.email) = lower(new.email)
      AND i.status = 'Pending'
      AND (i.expires_at IS NULL OR i.expires_at > now())
  ) OR EXISTS (
    SELECT 1 FROM public.band_invites b
    WHERE lower(b.email) = lower(new.email)
      AND b.status = 'Pending'
      AND (b.expires_at IS NULL OR b.expires_at > now())
  ) THEN
    RETURN new;
  END IF;
  RAISE EXCEPTION 'Artist and label accounts are invite-only. Listener accounts can be created from the listener portal.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE r text;
BEGIN
  SELECT i.role INTO r FROM public.invites i
  WHERE lower(i.email) = lower(new.email) AND i.status IN ('Pending','Accepted')
  ORDER BY i.created_at DESC LIMIT 1;

  INSERT INTO public.profiles(id, display_name, full_name, email, role)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)),
    new.email,
    CASE
      WHEN new.raw_user_meta_data->>'account_type' = 'listener' THEN 'listener'::public.user_role
      WHEN r = 'label_admin' THEN 'label_admin'::public.user_role
      ELSE 'artist'::public.user_role
    END
  )
  ON CONFLICT (id) DO UPDATE SET email = excluded.email;
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_invite_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF new.raw_user_meta_data->>'account_type' = 'listener' THEN
    RETURN new;
  END IF;
  UPDATE public.invites SET status='Accepted', accepted_at=now()
  WHERE lower(email)=lower(new.email) AND status='Pending';
  RETURN new;
END;
$function$;

UPDATE public.profiles p
SET role = 'listener'::public.user_role
FROM auth.users u
WHERE u.id = p.id AND u.raw_user_meta_data->>'account_type' = 'listener'
  AND p.role::text <> 'listener';

DO $policy$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','p')
      AND c.relrowsecurity
      AND c.relname NOT IN ('profiles','smart_links')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS listener_workspace_block ON public.%I', t.relname);
    EXECUTE format(
      'CREATE POLICY listener_workspace_block ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_listener_account()) WITH CHECK (NOT public.is_listener_account())',
      t.relname
    );
  END LOOP;
END;
$policy$;

DROP POLICY IF EXISTS listener_profile_read_scope ON public.profiles;
CREATE POLICY listener_profile_read_scope ON public.profiles AS RESTRICTIVE
FOR SELECT TO authenticated
USING (NOT public.is_listener_account() OR id = (SELECT auth.uid()));

DROP POLICY IF EXISTS listener_profile_insert_block ON public.profiles;
CREATE POLICY listener_profile_insert_block ON public.profiles AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (NOT public.is_listener_account());

DROP POLICY IF EXISTS listener_profile_update_block ON public.profiles;
CREATE POLICY listener_profile_update_block ON public.profiles AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (NOT public.is_listener_account())
WITH CHECK (NOT public.is_listener_account());

DROP POLICY IF EXISTS listener_profile_delete_block ON public.profiles;
CREATE POLICY listener_profile_delete_block ON public.profiles AS RESTRICTIVE
FOR DELETE TO authenticated
USING (NOT public.is_listener_account());

DROP POLICY IF EXISTS listener_smart_links_read_scope ON public.smart_links;
CREATE POLICY listener_smart_links_read_scope ON public.smart_links AS RESTRICTIVE
FOR SELECT TO authenticated
USING (NOT public.is_listener_account() OR published = true);

DROP POLICY IF EXISTS listener_smart_links_insert_block ON public.smart_links;
CREATE POLICY listener_smart_links_insert_block ON public.smart_links AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (NOT public.is_listener_account());

DROP POLICY IF EXISTS listener_smart_links_update_block ON public.smart_links;
CREATE POLICY listener_smart_links_update_block ON public.smart_links AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (NOT public.is_listener_account())
WITH CHECK (NOT public.is_listener_account());

DROP POLICY IF EXISTS listener_smart_links_delete_block ON public.smart_links;
CREATE POLICY listener_smart_links_delete_block ON public.smart_links AS RESTRICTIVE
FOR DELETE TO authenticated
USING (NOT public.is_listener_account());
