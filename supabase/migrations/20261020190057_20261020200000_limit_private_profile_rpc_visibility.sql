CREATE OR REPLACE FUNCTION public.get_profile(p_id uuid)
RETURNS TABLE(
  id uuid,
  display_name text,
  tagline text,
  bio text,
  location text,
  accent text,
  avatar_path text,
  banner_path text,
  links jsonb,
  contact_email text,
  role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    p.id,
    p.display_name,
    p.tagline,
    CASE WHEN p.id = auth.uid() OR public.is_admin() OR (p.public_profile_preferences->>'bio') IS DISTINCT FROM 'false' THEN p.bio ELSE NULL END,
    CASE WHEN p.id = auth.uid() OR public.is_admin() OR (p.public_profile_preferences->>'location') IS DISTINCT FROM 'false' THEN p.location ELSE NULL END,
    p.accent,
    p.avatar_path,
    p.banner_path,
    CASE WHEN p.id = auth.uid() OR public.is_admin() OR (p.public_profile_preferences->>'links') IS DISTINCT FROM 'false' THEN p.links ELSE '[]'::jsonb END,
    CASE WHEN p.id = auth.uid() OR public.is_admin() OR (p.show_email IS TRUE AND (p.public_profile_preferences->>'email') IS DISTINCT FROM 'false') THEN p.email ELSE NULL END,
    p.role::text
  FROM public.profiles p
  WHERE p.id = p_id
    AND auth.uid() IS NOT NULL
    AND (p.role::text <> 'label_admin' OR public.is_admin() OR p.id = auth.uid())
    AND (
      p.id = auth.uid()
      OR public.is_admin()
      OR p.is_public IS TRUE
      OR EXISTS (
        SELECT 1
        FROM public.band_members target_member
        JOIN public.band_members viewer_member
          ON viewer_member.band_id = target_member.band_id
        WHERE target_member.user_id = p.id
          AND viewer_member.user_id = auth.uid()
      )
    );
$function$;
