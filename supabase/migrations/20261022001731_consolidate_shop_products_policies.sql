BEGIN;

DROP POLICY IF EXISTS "Artists manage their own products" ON public.shop_products;
DROP POLICY IF EXISTS "Label admins manage label products" ON public.shop_products;
DROP POLICY IF EXISTS "Shop product insert policy" ON public.shop_products;
DROP POLICY IF EXISTS "Shop product update policy" ON public.shop_products;
DROP POLICY IF EXISTS "Shop product delete policy" ON public.shop_products;

CREATE POLICY "Shop product insert policy"
ON public.shop_products
FOR INSERT TO authenticated
WITH CHECK (
  (owner_id = (SELECT auth.uid())
   AND store_type = 'artist'
   AND artist_id = (SELECT auth.uid())
   AND EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = (SELECT auth.uid()) AND p.role = 'artist'::public.user_role))
  OR
  (owner_id = (SELECT auth.uid())
   AND store_type = 'label'
   AND EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = (SELECT auth.uid()) AND p.role = 'label_admin'::public.user_role))
);

CREATE POLICY "Shop product update policy"
ON public.shop_products
FOR UPDATE TO authenticated
USING (
  (owner_id = (SELECT auth.uid())
   AND store_type = 'artist'
   AND artist_id = (SELECT auth.uid())
   AND EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = (SELECT auth.uid()) AND p.role = 'artist'::public.user_role))
  OR
  (owner_id = (SELECT auth.uid())
   AND store_type = 'label'
   AND EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = (SELECT auth.uid()) AND p.role = 'label_admin'::public.user_role))
)
WITH CHECK (
  (owner_id = (SELECT auth.uid())
   AND store_type = 'artist'
   AND artist_id = (SELECT auth.uid())
   AND EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = (SELECT auth.uid()) AND p.role = 'artist'::public.user_role))
  OR
  (owner_id = (SELECT auth.uid())
   AND store_type = 'label'
   AND EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = (SELECT auth.uid()) AND p.role = 'label_admin'::public.user_role))
);

CREATE POLICY "Shop product delete policy"
ON public.shop_products
FOR DELETE TO authenticated
USING (
  (owner_id = (SELECT auth.uid())
   AND store_type = 'artist'
   AND artist_id = (SELECT auth.uid())
   AND EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = (SELECT auth.uid()) AND p.role = 'artist'::public.user_role))
  OR
  (owner_id = (SELECT auth.uid())
   AND store_type = 'label'
   AND EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = (SELECT auth.uid()) AND p.role = 'label_admin'::public.user_role))
);

COMMIT;
