REVOKE EXECUTE ON FUNCTION public.can_see_release(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_release(uuid) TO authenticated;
