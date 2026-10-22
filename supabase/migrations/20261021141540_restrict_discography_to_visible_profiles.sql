CREATE OR REPLACE FUNCTION public.profile_discography(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT coalesce(jsonb_agg(x ORDER BY x.release_date DESC NULLS LAST), '[]'::jsonb)
  FROM (
    SELECT r.id, r.title, r.release_type, r.release_date, r.artwork_path, r.artist_name,
      (
        SELECT coalesce(
          jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'version',t.version,'audio_path',t.audio_path,'n',t.track_number) ORDER BY t.track_number),
          '[]'::jsonb
        )
        FROM public.release_tracks t WHERE t.release_id = r.id
      ) AS tracks
    FROM public.releases r
    WHERE r.owner_id = p_id AND r.status = 'Live' AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles pp
        WHERE pp.id = p_id
          AND (pp.role::text <> 'label_admin' OR public.is_admin() OR pp.id = auth.uid())
          AND (
            p_id = auth.uid()
            OR public.is_admin()
            OR (
              (pp.public_profile_preferences->>'discography') IS DISTINCT FROM 'false'
              AND (
                pp.is_public IS TRUE
                OR EXISTS (
                  SELECT 1
                  FROM public.band_members target_member
                  JOIN public.band_members viewer_member ON viewer_member.band_id = target_member.band_id
                  WHERE target_member.user_id = pp.id
                    AND viewer_member.user_id = auth.uid()
                )
              )
            )
          )
      )
  ) x;
$function$;
