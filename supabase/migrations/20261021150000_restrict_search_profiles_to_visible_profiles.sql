-- Keep authenticated profile search consistent with get_profile() visibility rules.
-- Owners/admins can see their permitted records; other users can search only public
-- profiles or profiles belonging to a band they share. Field-level preferences remain intact.
CREATE OR REPLACE FUNCTION public.search_profiles(p_q text DEFAULT ''::text)
RETURNS TABLE(
  id uuid,
  display_name text,
  tagline text,
  bio text,
  location text,
  accent text,
  avatar_path text,
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
    CASE
      WHEN public.is_admin()
        OR p.id = auth.uid()
        OR (p.public_profile_preferences->>'bio') IS DISTINCT FROM 'false'
      THEN p.bio ELSE NULL
    END,
    CASE
      WHEN public.is_admin()
        OR p.id = auth.uid()
        OR (p.public_profile_preferences->>'location') IS DISTINCT FROM 'false'
      THEN p.location ELSE NULL
    END,
    p.accent,
    p.avatar_path,
    p.role::text
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND (p.role::text <> 'label_admin' OR public.is_admin())
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
    )
    AND (
      coalesce(trim(p_q), '') = ''
      OR p.display_name ILIKE '%' || replace(replace(trim(p_q), '%', ''), '_', '') || '%'
      OR p.full_name ILIKE '%' || replace(replace(trim(p_q), '%', ''), '_', '') || '%'
    )
  ORDER BY p.display_name NULLS LAST
  LIMIT 40;
$function$;
