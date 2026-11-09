/**
 * Adaptateur de paiement.
 *
 * >>> À IMPLÉMENTER AVANT LA MISE EN LIGNE <<<
 * Renseignez `registerPaymentProvider()` avec votre prestataire
 * (Mobile Money, Orange Money, Wave, FedaPay, CinetPay, Stripe, cartes…).
 * Tant qu'aucun adaptateur n'est branché, l'achat renvoie une erreur
 * explicite (HTTP 501) au lieu de créditer gratuitement.
 *
 * En mode démo, un fournisseur de simulation est utilisé automatiquement
 * pour permettre de tester tout le flux (checkout -> webhook -> crédits).
 */
import { isDemoMode } from './env';
import { getDemoPayment } from './store';

export interface CreatePaymentInput {
  /** Référence générée par nos soins : sert de clé d'idempotence. */
  reference: string;
  userId: string;
  planId: string;
  credits: number;
  amountGnf: number;
  returnUrl: string;
}

export interface PaymentIntent {
  provider: string;
  reference: string;
  status: 'pending' | 'requires_action';
  /** URL vers laquelle rediriger le client (page du prestataire). */
  checkoutUrl?: string;
  demo?: boolean;
  message?: string;
}

export interface VerifiedPayment {
  reference: string;
  userId: string;
  planId: string;
  credits: number;
  amountGnf: number;
  status: 'paid';
}

export interface PaymentProvider {
  name: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentIntent>;
  /** Doit vérifier la signature du prestataire et lever une erreur si elle est invalide. */
  verifyWebhook(request: Request): Promise<VerifiedPayment>;
}

export class PaymentNotConfiguredError extends Error {
  constructor() {
    super(
      "Paiement non disponible : aucun adaptateur n'est configuré. " +
        'Implémentez createPayment et verifyWebhook dans src/lib/payments.ts ' +
        'avec votre prestataire (Mobile Money / cartes) avant la mise en ligne.',
    );
    this.name = 'PaymentNotConfiguredError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let registeredProvider: PaymentProvider | null = null;

/** À appeler au démarrage de votre intégration (ex. depuis un module serveur). */
export function registerPaymentProvider(provider: PaymentProvider): void {
  registeredProvider = provider;
}

const demoProvider: PaymentProvider = {
  name: 'demo-simulation',
  async createPayment(input) {
    const params = new URLSearchParams({
      ref: input.reference,
      plan: input.planId,
      credits: String(input.credits),
      amount: String(input.amountGnf),
    });
    return {
      provider: this.name,
      reference: input.reference,
      status: 'requires_action',
      demo: true,
      checkoutUrl: `/checkout/simulate?${params.toString()}`,
      message: 'Paiement simulé — aucun débit réel.',
    };
  },
  async verifyWebhook(request) {
    const body = (await request.json().catch(() => null)) as
      | { reference?: string; event?: string }
      | null;
    if (!body?.reference || body.event !== 'payment.succeeded') {
      throw new Error('Charge utile de webhook invalide.');
    }
    const payment = getDemoPayment(body.reference);
    if (!payment) throw new Error('Référence de paiement inconnue.');
    return {
      reference: payment.reference,
      userId: payment.userId,
      planId: payment.planId,
      credits: payment.credits,
      amountGnf: Number(payment.amountGnf ?? 0),
      status: 'paid',
    };
  },
};

export function getPaymentProvider(): PaymentProvider {
  if (registeredProvider) return registeredProvider;
  if (isDemoMode()) return demoProvider;
  throw new PaymentNotConfiguredError();
}

export function isPaymentConfigured(): boolean {
  return registeredProvider !== null || isDemoMode();
}

export async function createPayment(input: CreatePaymentInput): Promise<PaymentIntent> {
  return getPaymentProvider().createPayment(input);
}

export async function verifyWebhook(request: Request): Promise<VerifiedPayment> {
  return getPaymentProvider().verifyWebhook(request);
}
