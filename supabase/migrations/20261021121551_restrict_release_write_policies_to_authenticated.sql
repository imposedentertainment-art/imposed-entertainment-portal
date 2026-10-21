-- Restrict release write policies to signed-in users while preserving owner/admin checks.
DROP POLICY IF EXISTS "release owner insert" ON public.releases;
CREATE POLICY "release owner insert"
  ON public.releases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND (status = 'Draft' OR public.is_admin())
  );

DROP POLICY IF EXISTS "release owner/admin delete" ON public.releases;
CREATE POLICY "release owner/admin delete"
  ON public.releases
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR (owner_id = (SELECT auth.uid()) AND status = 'Draft')
  );
