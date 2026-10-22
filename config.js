/* Supabase connection. Values come from Supabase -> Project Settings -> API. The anon key is public by design; RLS protects the data. */
window.IMPOSED_CONFIG = {
  SUPABASE_URL: "https://zoezvthpzbeeklfjwhko.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZXp2dGhwemJlZWtsZmp3aGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTE5MzEsImV4cCI6MjEwNjk4NzkzMX0.PahlxOofyEtFy0p4sT7O9cFEg4OL4Su72YQOT_fyMGE",
  // Public Cloudflare Turnstile site key. The matching secret belongs in Supabase Auth settings.
  TURNSTILE_SITE_KEY: "0x4AAAAAAFW6HJPKXJiFJIHu",
  // Optional public Botpress webchat configuration URL. Keep blank until Webchat is published.
  // Only the generated HTTPS files.bpcontent.cloud script URL is accepted by the loader.
  BOTPRESS_WEBCHAT_SCRIPT_URL: ""
};
