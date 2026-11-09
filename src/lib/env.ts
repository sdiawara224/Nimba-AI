/**
 * Configuration serveur. Toutes les clés secrètes restent côté serveur
 * (elles ne sont jamais importées depuis un composant client).
 */

export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
}

export function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
}

export function supabaseServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
}

export function hasSupabaseConfig(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey() && supabaseServiceKey());
}

export function hasAiConfig(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/**
 * Mode démo : explicite ou automatique quand Supabase n'est pas configuré.
 * En production (NIMBA_MODE=production), AUCUN repli silencieux vers le
 * stockage en mémoire n'est autorisé, même si une clé vient à manquer :
 * l'application échoue alors de façon visible au lieu de perdre les comptes.
 */
export function isDemoMode(): boolean {
  const forced = process.env.NIMBA_MODE?.trim().toLowerCase();
  if (forced === 'production') return false;
  if (forced === 'demo') return true;
  return !hasSupabaseConfig();
}

/** Variables Supabase manquantes (utilisé par /api/health). */
export function supabaseConfigErrors(): string[] {
  const errors: string[] = [];
  if (!supabaseUrl()) errors.push('NEXT_PUBLIC_SUPABASE_URL absente');
  if (!supabaseAnonKey()) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY absente');
  if (!supabaseServiceKey()) errors.push('SUPABASE_SERVICE_ROLE_KEY absente');
  return errors;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
}
