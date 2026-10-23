-- Permit higher-resolution artist profile photos and banners.
-- The profile editor validates an 8 MiB maximum before uploading.
UPDATE storage.buckets
SET file_size_limit = 8388608
WHERE id = 'profile-media';
