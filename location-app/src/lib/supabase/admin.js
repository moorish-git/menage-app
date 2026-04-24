import { createClient } from '@supabase/supabase-js';

// Client serveur avec la service role key — passe outre RLS.
// À n'utiliser que dans les routes API (webhooks notamment) pour mettre à jour
// des enregistrements au nom du système.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
