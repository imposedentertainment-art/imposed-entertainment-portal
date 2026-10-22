alter table public.bands add column if not exists tagline text not null default '' check (char_length(tagline) <= 100);
alter table public.bands add column if not exists accent_color text not null default '#d7bd72' check (accent_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.bands add column if not exists avatar_path text;
alter table public.bands add column if not exists banner_path text;
alter table public.bands add column if not exists links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 12);
