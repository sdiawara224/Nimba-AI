'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/SessionContext';
import { setSessionToken } from '@/lib/client-session';
import { FREE_CREDITS } from '@/lib/plans';

export default function LoginPage() {
  const router = useRouter();
  const { session, mode, loading, refresh } = useApp();
  const [tab, setTab] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [next, setNext] = useState('/studio');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('next');
    if (target && target.startsWith('/')) setNext(target);
  }, []);

  useEffect(() => {
    if (!loading && session) router.replace(next);
  }, [loading, session, next, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: tab, email, password }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string; confirmationRequired?: boolean; sessionToken?: string };
      if (!response.ok) {
        setError(data.error ?? 'Une erreur est survenue.');
        return;
      }
      if (data.confirmationRequired) {
        setNotice(data.message ?? 'Vérifiez votre boîte mail.');
        setTab('signin');
        return;
      }
      setSessionToken(data.sessionToken);
      await refresh();
      const probe = await fetch('/api/session', { cache: 'no-store' });
      const state = (await probe.json()) as { session?: unknown };
      if (!state.session) {
        setError('Session non conservée : votre navigateur bloque probablement les cookies tiers. Ouvrez l’aperçu dans un nouvel onglet puis reconnectez-vous.');
        return;
      }
      router.push(next);
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setBusy(false);
    }
  }

  async function startAs(action: 'demo' | 'test-admin') {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string; sessionToken?: string };
      if (!response.ok) {
        setError(data.error ?? 'Impossible de créer la session de test.');
        return;
      }
      setSessionToken(data.sessionToken);
      await refresh();
      // Détecte un cookie refusé (aperçu intégré / cookies tiers bloqués)
      // plutôt que de renvoyer silencieusement l'utilisateur sur la garde.
      const probe = await fetch('/api/session', { cache: 'no-store' });
      const state = (await probe.json()) as { session?: unknown };
      if (!state.session) {
        setError('Session non conservée : votre navigateur bloque probablement les cookies tiers. Ouvrez l’aperçu dans un nouvel onglet puis reconnectez-vous.');
        return;
      }
      router.push(next);
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <span className="badge"><span className="badge-dot" /> {FREE_CREDITS} crédits offerts</span>
        <h1 style={{ marginTop: 18 }}>Bienvenue dans l’atelier.</h1>
        <p>Créez un compte pour générer votre premier site, l’affiner et l’exporter.</p>

        <div className="auth-tabs">
          <button type="button" className={tab === 'signup' ? 'active' : ''} onClick={() => { setTab('signup'); setError(null); }}>Inscription</button>
          <button type="button" className={tab === 'signin' ? 'active' : ''} onClick={() => { setTab('signin'); setError(null); }}>Connexion</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {error?.includes('cookies tiers') && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', marginBottom: 14 }}
            onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
          >
            ↗ Ouvrir l’aperçu dans un nouvel onglet
          </button>
        )}
        {notice && <div className="alert alert-ok">{notice}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" className="input" type="email" autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Mot de passe</label>
            <input id="password" className="input" type="password" autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} placeholder="6 caractères minimum" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Un instant…' : tab === 'signup' ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        {mode === 'demo' && (
          <>
            <div className="divider">ou</div>
            <button type="button" className="btn btn-secondary" style={{ width: '100%', marginBottom: 10 }} disabled={busy} onClick={() => void startAs('test-admin')}>
              Connexion compte de test (999 crédits)
            </button>
            <button type="button" className="btn btn-secondary" style={{ width: '100%' }} disabled={busy} onClick={() => void startAs('demo')}>
              Essayer sans compte (démo)
            </button>
            <div className="demo-banner">
              Mode démo : comptes et crédits en mémoire, paiement simulé, aucune donnée réelle. Les identifiants du compte de test sont documentés dans le README et dans <code>TEST_ACCESS.local.md</code>.
            </div>
          </>
        )}

        <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: '0.75rem', color: 'var(--muted-2)' }}>
          En créant un compte, vous acceptez les{' '}
          <Link href="/cgu" style={{ color: 'var(--accent-2)' }}>CGU / CGV</Link>{' '}
          et la{' '}
          <Link href="/confidentialite" style={{ color: 'var(--accent-2)' }}>politique de confidentialité</Link>.
        </p>
        <p style={{ textAlign: 'center', margin: '12px 0 0', fontSize: '0.8rem' }}>
          <Link href="/" className="muted">← Retour à l’accueil</Link>
        </p>
      </div>
    </main>
  );
}
