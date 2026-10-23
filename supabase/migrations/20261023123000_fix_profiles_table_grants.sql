-- Restore profile editing for signed-in users while removing unintended anonymous write access.
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT INSERT ON TABLE public.profiles TO authenticated;
GRANT UPDATE ON TABLE public.profiles TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.profiles FROM anon;

REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.profiles FROM authenticated;
