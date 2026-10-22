CREATE OR REPLACE FUNCTION public.accept_band_invite(p_id uuid, p_accept boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  r public.band_invites;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign-in required to respond to a band invite'
      USING ERRCODE = '42501';
  END IF;

  -- Lock the pending invitation so concurrent accept/decline requests cannot
  -- both act on the same invite state.
  SELECT *
    INTO r
    FROM public.band_invites
   WHERE id = p_id
     AND status = 'Pending'
     AND lower(email) = lower(auth.jwt()->>'email')
     AND (expires_at IS NULL OR expires_at > now())
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or expired';
  END IF;

  IF p_accept THEN
    INSERT INTO public.band_members(band_id, user_id, role)
    VALUES (r.band_id, auth.uid(), 'member')
    ON CONFLICT DO NOTHING;

    UPDATE public.band_invites
       SET status = 'Accepted'
     WHERE id = p_id AND status = 'Pending';
  ELSE
    UPDATE public.band_invites
       SET status = 'Declined'
     WHERE id = p_id AND status = 'Pending';
  END IF;
END;
$function$;
