'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from './SessionContext';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, mode, loading, logout } = useApp();

  // Le studio et la simulation de paiement ont leurs propres barres plein écran.
  if (pathname?.startsWith('/studio') || pathname?.startsWith('/checkout/')) return null;

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo" aria-label="Nimba, accueil">
          <span className="logo-mark">✦</span>
          Nimba <span className="logo-sub">/ Studio</span>
        </Link>
        <nav className="nav-links">
          <Link href="/">Accueil</Link>
          <Link href="/studio">Studio</Link>
          <Link href="/#ateliers">Les 2 ateliers</Link>
          <Link href="/#tarifs">Tarifs</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>
        <div className="header-actions">
          <div className="lang-toggle" aria-label="Langue de l’interface">
            <button type="button" className="active" aria-pressed="true">🇫🇷 FR</button>
            <button type="button" disabled title="Version anglaise à venir" aria-disabled="true">🇬🇧 EN</button>
          </div>
          {mode === 'demo' && !loading && <span className="mode-pill">démo</span>}
          {session ? (
            <>
              {session.isAdmin && <Link href="/admin" className="admin-link" title="Back-office administrateur">⚙ Admin</Link>}
              <Link href="/#tarifs" className="credits-pill" title="Recharger mes crédits">
                ✦ {session.credits} · freemium
              </Link>
              <Link href="/#tarifs" className="btn btn-primary btn-sm recharge-btn">↑ Recharger</Link>
              <div className="workspace-chip">
                <span className="avatar">{session.email.charAt(0).toUpperCase()}</span>
                <span className="workspace-label">{session.email.split('@')[0]}</span>
                <button
                  type="button"
                  title="Se déconnecter"
                  onClick={async () => {
                    await logout();
                    router.push('/');
                  }}
                >
                  ⏻
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Connexion</Link>
              <Link href="/login?next=%2Fstudio" className="btn btn-primary btn-sm">Commencer</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
