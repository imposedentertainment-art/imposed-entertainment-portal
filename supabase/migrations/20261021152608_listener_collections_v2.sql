CREATE TABLE IF NOT EXISTS public.listener_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 240),
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 100
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listener_collections_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS listener_collections_user_updated_idx
  ON public.listener_collections (user_id, updated_at DESC);

ALTER TABLE public.listener_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listener_collections_select_own ON public.listener_collections;
CREATE POLICY listener_collections_select_own ON public.listener_collections
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'listener'::public.user_role
    )
  );

DROP POLICY IF EXISTS listener_collections_insert_own ON public.listener_collections;
CREATE POLICY listener_collections_insert_own ON public.listener_collections
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'listener'::public.user_role
    )
  );

DROP POLICY IF EXISTS listener_collections_update_own ON public.listener_collections;
CREATE POLICY listener_collections_update_own ON public.listener_collections
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'listener'::public.user_role
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'listener'::public.user_role
    )
  );

DROP POLICY IF EXISTS listener_collections_delete_own ON public.listener_collections;
CREATE POLICY listener_collections_delete_own ON public.listener_collections
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'listener'::public.user_role
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.listener_collections TO authenticated;
