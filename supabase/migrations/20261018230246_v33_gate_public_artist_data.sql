-- v33: the public listener directory and profile payloads must be served only through the Edge Function after server-verified Turnstile and a signed session.
revoke all on function public.get_public_artist_directory() from public;
revoke all on function public.get_public_artist_directory() from anon;
grant execute on function public.get_public_artist_directory() to authenticated;
revoke all on function public.get_public_artist_page(text) from public;
revoke all on function public.get_public_artist_page(text) from anon;
grant execute on function public.get_public_artist_page(text) to authenticated;
