BEGIN;

-- Listeners need access to the deliberately separate followed-release notification
-- stream. The old blanket listener block made the UI's SELECT/read actions impossible.
DROP POLICY IF EXISTS listener_workspace_block ON public.notifications;

CREATE POLICY notifications_listener_select_scope
ON public.notifications
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (SELECT NOT public.is_listener_account())
  OR (
    user_id = (SELECT auth.uid())
    AND kind = 'followed_artist_release'
  )
);

CREATE POLICY notifications_listener_update_scope
ON public.notifications
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  (SELECT NOT public.is_listener_account())
  OR (
    user_id = (SELECT auth.uid())
    AND kind = 'followed_artist_release'
  )
)
WITH CHECK (
  (SELECT NOT public.is_listener_account())
  OR (
    user_id = (SELECT auth.uid())
    AND kind = 'followed_artist_release'
  )
);

-- Listeners consume and acknowledge notifications; they may not fabricate or
-- erase notifications. Existing trigger/service-role writes remain unaffected.
CREATE POLICY notifications_listener_insert_block
ON public.notifications
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK ((SELECT NOT public.is_listener_account()));

CREATE POLICY notifications_listener_delete_block
ON public.notifications
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING ((SELECT NOT public.is_listener_account()));

-- The client only changes the read flag. Column-level grants prevent a listener
-- (or another authenticated user) from rewriting notification content/ownership.
REVOKE UPDATE ON TABLE public.notifications FROM authenticated;
GRANT UPDATE (read) ON TABLE public.notifications TO authenticated;

COMMIT;
