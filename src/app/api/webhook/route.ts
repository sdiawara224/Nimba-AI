import { NextResponse } from 'next/server';
import { PaymentNotConfiguredError, verifyWebhook } from '@/lib/payments';
import { confirmPayment } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Point d'entrée du prestataire de paiement. Aucune session utilisateur ici :
 * la confiance vient de la signature vérifiée par l'adaptateur.
 * `confirmPayment` est idempotent : un webhook rejoué n'ajoute jamais deux fois les crédits.
 */
export async function POST(request: Request) {
  try {
    const payment = await verifyWebhook(request);
    if (payment.status !== 'paid') {
      return NextResponse.json({ received: true, applied: false });
    }
    const applied = await confirmPayment(payment);
    return NextResponse.json({ received: true, applied, reference: payment.reference });
  } catch (error) {
    if (error instanceof PaymentNotConfiguredError) {
      return NextResponse.json({ error: error.message, code: 'PAYMENT_NOT_CONFIGURED' }, { status: 501 });
    }
    const message = error instanceof Error ? error.message : 'Webhook invalide.';
    console.error('[webhook] rejeté :', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
