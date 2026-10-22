DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'releases-content') THEN
    RAISE EXCEPTION 'Expected legacy releases-content bucket was not found';
  END IF;

  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'releases-content') THEN
    RAISE EXCEPTION 'Refusing to change releases-content visibility because the bucket contains objects';
  END IF;

  UPDATE storage.buckets
  SET public = false,
      file_size_limit = 52428800,
      allowed_mime_types = ARRAY[
        'application/json',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'audio/flac',
        'audio/mpeg',
        'audio/mp4',
        'audio/wav'
      ]::text[]
  WHERE id = 'releases-content';
END;
$migration$;
