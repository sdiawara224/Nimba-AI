import { NextResponse } from 'next/server';
import { hasAiConfig, isDemoMode, supabaseConfigErrors } from '@/lib/env';
import { isPaymentConfigured } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Diagnostic de configuration, sans aucune valeur secrète.
 * À appeler après déploiement pour vérifier que l'app est bien en mode
 * production et que toutes les variables Supabase sont présentes.
 */
export async function GET() {
  const demo = isDemoMode();
  const errors = supabaseConfigErrors();
  const healthy = demo || errors.length === 0;
  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'misconfigured',
      mode: demo ? 'demo' : 'production',
      supabase: { configured: errors.length === 0, missing: demo ? [] : errors },
      anthropic: { enabled: hasAiConfig() },
      payments: { configured: isPaymentConfigured(), adapterRequired: !demo },
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
