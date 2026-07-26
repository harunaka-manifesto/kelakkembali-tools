/* Kelak Kembali — connection settings.

   Fill these in from your Supabase project: Dashboard -> Project Settings ->
   API. See "Setting up the database" in the README for the full walkthrough.

   Both values are safe to commit. The anon key is a public identifier, not a
   secret: every table is behind row-level security that grants nothing to
   anonymous callers, so the key alone opens nothing. The shared password is
   what actually unlocks the data, and that is never stored here.

   SHARED_EMAIL is the single account everyone signs in as. It only has to be a
   well-formed address that you own in the Supabase auth table — no mail is
   ever sent to it. */

window.KK_CONFIG = {
  SUPABASE_URL: 'https://lgockcjjfkvuihhofyxi.supabase.co/rest/v1/',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnb2NrY2pqZmt2dWloaG9meXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjc4NjQsImV4cCI6MjEwMDY0Mzg2NH0.FspFFmiNq0WBEto-TiQCQtU2A3TTkgHQxG3LcH5nSzA',
  SHARED_EMAIL: 'harunakamanifesto@gmail.com'
};
