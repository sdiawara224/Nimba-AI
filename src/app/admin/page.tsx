'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/SessionContext';
import { setSessionToken } from '@/lib/client-session';

interface AdminUser {
  id: string;
  email: string;
  credits: number;
  projects: number;
  createdAt: string;
  isAdmin: boolean;
}

interface Overview {
  mode: 'demo' | 'supabase';
  users: AdminUser[];
  stats: {
    users: number;
    projects: number;
    credits: number;
    paidPayments: number;
    revenueGnf: number;
    revenueUsd: number;
  };
}

function Gate({ title, children, action, error }: { title: string; children: React.ReactNode; action?: React.ReactNode; error?: string | null }) {
  return (
    <main className="gate-shell">
      <div className="gate-card">
        <span className="badge"><span className="badge-dot" /> Espace administration</span>
        <h1 style={{ marginTop: 18 }}>{title}</h1>
        <p className="muted">{children}</p>
        <div className="hero-actions" style={{ justifyContent: 'center', marginTop: 24 }}>
          <Link href="/login?next=%2Fadmin" className="btn btn-primary">Se connecter</Link>
          <Link href="/studio" className="btn btn-secondary">Retour au studio</Link>
        </div>
        {error && <div className="alert alert-error" style={{ marginTop: 18 }}>{error}</div>}
        {action && <div style={{ marginTop: 16 }}>{action}</div>}
      </div>
    </main>
  );
}

export default function AdminPage() {
  const { session, mode, loading, refresh } = useApp();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/admin', { cache: 'no-store' });
      const payload = (await response.json()) as Overview & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Impossible de charger les données.');
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les données.');
    }
  }, []);

  useEffect(() => {
    if (!loading && session?.isAdmin) void load();
  }, [loading, session?.isAdmin, load]);

  async function grant(userId: string, email: string) {
    setBusy(userId);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'grant_credits', userId, amount: 10 }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Octroi impossible.');
      setNotice(`+10 crédits ajoutés à ${email}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Octroi impossible.');
    } finally {
      setBusy(null);
    }
  }

  const testLoginButton = mode === 'demo' ? (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => void quickAdminLogin()}>
        ⚙ Connexion compte de test admin
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.open('/admin', '_blank', 'noopener,noreferrer')}>
        ↗ Nouvel onglet
      </button>
    </div>
  ) : null;

  async function quickAdminLogin() {
    setError(null);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'test-admin' }),
      });
      const data = (await response.json()) as { error?: string; sessionToken?: string };
      if (!response.ok) throw new Error(data.error ?? 'Connexion de test impossible.');
      setSessionToken(data.sessionToken);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion de test impossible.');
    }
  }

  if (loading) return <Gate title="Chargement…">Vérification de votre session en cours.</Gate>;
  if (!session) return <Gate title="Connexion requise" action={testLoginButton} error={error}>Connectez-vous avec le compte administrateur pour ouvrir le back-office.</Gate>;
  if (!session.isAdmin) {
    return (
      <Gate title="Accès refusé">
        Ce compte n’a pas le rôle administrateur. Le back-office est réservé au compte de test admin.
      </Gate>
    );
  }

  const stats = data?.stats;
  return (
    <main className="admin-shell">
      <div className="container admin-wrap">
        <div className="admin-head">
          <div>
            <span className="badge"><span className="badge-dot" /> ADMIN · {data?.mode ?? '…'}</span>
            <h1>Administration</h1>
            <p className="muted">
              Connecté en tant que <strong>{session.email}</strong> · vue globale des comptes, crédits et projets.
            </p>
          </div>
          <div className="admin-head-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void load()}>↻ Actualiser</button>
            <Link href="/studio" className="btn btn-primary btn-sm">Ouvrir le studio</Link>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {notice && <div className="alert alert-ok">{notice}</div>}

        <div className="admin-stats">
          <div className="admin-stat"><span>Comptes</span><strong>{stats?.users ?? '—'}</strong></div>
          <div className="admin-stat"><span>Projets</span><strong>{stats?.projects ?? '—'}</strong></div>
          <div className="admin-stat"><span>Crédits en circulation</span><strong>{stats?.credits ?? '—'}</strong></div>
          <div className="admin-stat"><span>Paiements confirmés</span><strong>{stats?.paidPayments ?? '—'}</strong></div>
          <div className="admin-stat"><span>Total simulé</span><strong>{(stats?.revenueGnf ?? 0).toLocaleString('fr-FR')} GNF · {(stats?.revenueUsd ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</strong></div>
        </div>

        <div className="admin-table-wrap">
          <div className="admin-table-title">
            <h2>Comptes utilisateurs</h2>
            <span className="muted">Le bouton « +10 » crédite le compte et écrit une ligne dans le journal.</span>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>E-mail</th><th>Crédits</th><th>Projets</th><th>Inscrit le</th><th>Rôle</th><th>Action</th></tr>
            </thead>
            <tbody>
              {(data?.users ?? []).map((u) => (
                <tr key={u.id}>
                  <td className="admin-email">{u.email}</td>
                  <td><strong>✦ {u.credits}</strong></td>
                  <td>{u.projects}</td>
                  <td className="muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '—'}</td>
                  <td>{u.isAdmin ? <span className="admin-role">admin</span> : <span className="muted">utilisateur</span>}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy === u.id}
                      onClick={() => void grant(u.id, u.email)}
                    >
                      {busy === u.id ? '…' : '+10 crédits'}
                    </button>
                  </td>
                </tr>
              ))}
              {!data && !error && <tr><td colSpan={6} className="muted">Chargement des comptes…</td></tr>}
              {data && data.users.length === 0 && <tr><td colSpan={6} className="muted">Aucun compte.</td></tr>}
            </tbody>
          </table>
        </div>

        <p className="admin-note">
          Cet espace utilise la clé <code>service_role</code> côté serveur pour lire au-delà de la RLS, uniquement après
          vérification du rôle <code>nimba_admin</code>. Les utilisateurs normaux reçoivent <strong>403</strong> sur
          <code> /api/admin</code>. En production, le rôle vient de <code>app_metadata</code>, non modifiable par l’utilisateur.
        </p>
      </div>
    </main>
  );
}
