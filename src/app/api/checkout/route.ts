import { NextResponse } from 'next/server';
import { appUrl } from '@/lib/env';
import { GNF_PER_USD, getPlan } from '@/lib/plans';
import {
  PaymentNotConfiguredError,
  createPayment,
  getPaymentProvider,
} from '@/lib/payments';
import { createPendingPayment, getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Connectez-vous pour acheter des crédits.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { planId?: string };
  const plan = getPlan(body.planId ?? '');
  if (!plan) return NextResponse.json({ error: 'Formule inconnue.' }, { status: 400 });

  let provider;
  try {
    provider = getPaymentProvider();
  } catch (error) {
    if (error instanceof PaymentNotConfiguredError) {
      return NextResponse.json({ error: error.message, code: 'PAYMENT_NOT_CONFIGURED' }, { status: 501 });
    }
    throw error;
  }

  const reference = `nimba_${crypto.randomUUID().replace(/-/g, '')}`;
  try {
    await createPendingPayment({
      reference,
      session,
      planId: plan.id,
      credits: plan.credits,
      amountGnf: plan.priceGnf,
      provider: provider.name,
    });
    const intent = await createPayment({
      reference,
      userId: session.userId,
      planId: plan.id,
      credits: plan.credits,
      amountGnf: plan.priceGnf,
      returnUrl: `${appUrl()}/studio?paiement=retour`,
    });
    return NextResponse.json({
      intent,
      plan: {
        name: plan.name,
        credits: plan.credits,
        priceGnf: plan.priceGnf,
        priceUsd: Math.round((plan.priceGnf / GNF_PER_USD) * 100) / 100,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ error: `Commande impossible : ${message}` }, { status: 502 });
  }
}
