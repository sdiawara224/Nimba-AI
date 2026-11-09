import { NextResponse } from 'next/server';
import { hasAiConfig, isDemoMode } from '@/lib/env';
import { isPaymentConfigured } from '@/lib/payments';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  return NextResponse.json(
    {
      session,
      mode: isDemoMode() ? 'demo' : 'supabase',
      aiEnabled: hasAiConfig(),
      paymentsConfigured: isPaymentConfigured(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
