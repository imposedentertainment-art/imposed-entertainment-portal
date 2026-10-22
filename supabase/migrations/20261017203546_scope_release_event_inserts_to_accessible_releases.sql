DROP POLICY IF EXISTS "event authenticated insert" ON public.release_events;
CREATE POLICY "event accessible release insert"
ON public.release_events
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.releases r
    WHERE r.id = release_events.release_id
      AND (
        r.owner_id = (SELECT auth.uid())
        OR public.is_admin()
        OR (r.band_id IS NOT NULL AND public.is_band_member(r.band_id))
      )
  )
);
