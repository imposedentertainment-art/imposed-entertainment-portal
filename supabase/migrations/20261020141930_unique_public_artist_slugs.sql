create unique index if not exists profiles_public_slug_unique_idx on public.profiles (public_slug) where public_slug is not null;
