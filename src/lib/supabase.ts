import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseServiceKey, supabaseUrl } from './env';

/**
 * Client « service role » : contourne RLS, uniquement côté serveur.
 * Utilisé pour les opérations atomiques sur les crédits (RPC SQL).
 */
export function adminClient(): SupabaseClient | null {
  if (!supabaseUrl() || !supabaseServiceKey()) return null;
  return createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client avec le JWT de l'utilisateur : respecte les politiques RLS. */
export function userClient(accessToken?: string): SupabaseClient | null {
  if (!supabaseUrl() || !supabaseAnonKey()) return null;
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
