'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLANS, formatFcfa, type Plan } from '@/lib/plans';
import { useApp } from './SessionContext';

interface Intent {
  checkoutUrl?: string;
  provider?: string;
  demo?: boolean;
  message?: string;
}

export function PricingCards() {
  const router = useRouter();
  const { session, refresh } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(plan: Plan) {
    setError(null);
    if (!session) {
      router.push('/login?next=%2Fstudio');
      return;
    }
    setBusy(plan.id);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = (await response.json()) as { intent?: Intent; error?: string };
      if (!response.ok || !data.intent) {
        setError(data.error ?? 'La commande a échoué.');
        return;
      }
      const url = data.intent.checkoutUrl;
      if (!url) {
        setError('Le prestataire n’a pas renvoyé d’URL de paiement.');
        return;
      }
      if (/^https?:\/\//i.test(url)) window.location.href = url;
      else router.push(url);
      await refresh();
    } catch {
      setError('Impossible de joindre le serveur. Réessayez.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="pricing-grid">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`plan-card${plan.popular ? ' popular' : ''}`}>
            {plan.popular && <span className="plan-tag">Le plus choisi</span>}
            <h3 className="plan-name">{plan.name}</h3>
            <p className="plan-tagline">{plan.tagline}</p>
            <div className="plan-price">
              {formatFcfa(plan.priceFcfa)} <small>/ paiement unique</small>
            </div>
            <div className="plan-credits">✦ {plan.credits} crédits · sans abonnement</div>
            <ul className="plan-features">
              {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
            <button
              type="button"
              className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
              disabled={busy !== null}
              onClick={() => void buy(plan)}
            >
              {busy === plan.id ? 'Redirection…' : `Acheter ${plan.credits} crédits`}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="alert alert-error" style={{ marginTop: 20 }}>{error}</p>}
    </>
  );
}
