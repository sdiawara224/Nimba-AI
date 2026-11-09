'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatFcfa, getPlan } from '@/lib/plans';

export default function SimulateCheckoutPage() {
  const router = useRouter();
  const [params, setParams] = useState<{ ref: string; plan: string; credits: number; amount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setParams({
      ref: search.get('ref') ?? '',
      plan: search.get('plan') ?? '',
      credits: Number(search.get('credits') ?? 0),
      amount: Number(search.get('amount') ?? 0),
    });
  }, []);

  const plan = params ? getPlan(params.plan) : undefined;

  async function confirm() {
    if (!params?.ref) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'payment.succeeded', reference: params.ref }),
      });
      const data = (await response.json()) as { error?: string; applied?: boolean };
      if (!response.ok) {
        setError(data.error ?? 'Le paiement n’a pas pu être confirmé.');
        return;
      }
      router.push('/studio?paiement=ok');
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="checkout-shell">
      <div className="checkout-card">
        <span className="badge"><span className="badge-dot" /> Paiement simulé</span>
        <h1 style={{ marginTop: 18 }}>Confirmation de commande</h1>
        <p>
          Vous êtes en <strong>mode démo</strong> : aucun débit réel. Cette étape reproduit exactement le webhook d’un prestataire, y compris son idempotence.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="checkout-row"><span>Formule</span><strong>{plan?.name ?? params?.plan ?? '—'}</strong></div>
        <div className="checkout-row"><span>Crédits ajoutés</span><strong>✦ {params?.credits ?? 0}</strong></div>
        <div className="checkout-row"><span>Référence</span><code style={{ fontSize: '0.76rem' }}>{params?.ref?.slice(0, 24) ?? '—'}…</code></div>
        <div className="checkout-row"><span>Moyen de paiement</span><strong>Simulation démo</strong></div>

        <div className="checkout-total"><span>Total</span><span>{formatFcfa(params?.amount ?? 0)}</span></div>

        <div className="checkout-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => router.push('/#tarifs')}>Annuler</button>
          <button type="button" className="btn btn-primary" disabled={busy || !params?.ref} onClick={() => void confirm()}>
            {busy ? 'Confirmation…' : 'Confirmer le paiement'}
          </button>
        </div>
        <p style={{ textAlign: 'center', margin: '22px 0 0', fontSize: '0.8rem' }}>
          <Link href="/studio" className="muted">Retour à l’atelier</Link>
        </p>
      </div>
    </main>
  );
}
