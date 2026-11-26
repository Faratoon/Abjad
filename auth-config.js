/* Supabase project for ABJAD email accounts.
 * Fill both values from Supabase → Project Settings → API.
 * The anon key is public by design (row access is enforced by RLS).
 * While this is null, the app runs profile-passphrase mode only. */
globalThis.ABJAD_AUTH = null;
/* Example:
globalThis.ABJAD_AUTH = {
  url: "https://YOURPROJECT.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
*/
