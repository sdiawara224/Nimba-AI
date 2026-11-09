import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/env';
import {
  ACCESS_COOKIE,
  DEMO_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
  getSession,
  readSessionToken,
} from '@/lib/session';
import {
  createDemoSessionToken,
  createDemoUser,
  ensureDemoTestAccount,
  findDemoUserByEmail,
  revokeDemoSessionToken,
} from '@/lib/store';
import { adminClient, userClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    email?: string;
    password?: string;
  };
  const action = body.action ?? 'signin';
  const store = await cookies();
  // Attributs de cookies adaptés au contexte (iframe HTTPS cross-site ou non).
  const options = await cookieOptions();
  // Amorce le compte de test démo avant toute recherche par e-mail.
  ensureDemoTestAccount();

  if (action === 'logout') {
    // En production, révoque aussi la session côté Supabase (pas seulement
    // le cookie) : les refresh tokens volés ne peuvent plus être rejoués.
    if (!isDemoMode()) {
      const token = store.get(ACCESS_COOKIE)?.value;
      if (token) {
        const admin = adminClient();
        if (admin) await admin.auth.admin.signOut(token, 'global').catch(() => undefined);
      }
    }
    // Réécriture explicite avec les MÊMES attributs que la pose du cookie
    // (httpOnly, sameSite, secure, path) + maxAge 0 : certains clients
    // conservent un cookie httpOnly si l'expiration n'a pas ces attributs.
    const expired = { ...options, maxAge: 0 };
    for (const name of [DEMO_COOKIE, ACCESS_COOKIE, REFRESH_COOKIE]) {
      store.set(name, '', expired);
    }
    // Révoque aussi le jeton sans cookie pour que la déconnexion soit réelle.
    const token = await readSessionToken();
    if (token) revokeDemoSessionToken(token);
    return NextResponse.json({ ok: true });
  }

  // Raccourci de test : mêmes identifiants que le formulaire, mais lus côté
  // serveur pour ne jamais exposer le mot de passe au bundle client.
  if (action === 'test-admin') {
    if (!isDemoMode()) return bad('Le compte de test est désactivé en production.', 403);
    ensureDemoTestAccount();
    const email = (process.env.NIMBA_TEST_ADMIN_EMAIL ?? '').trim().toLowerCase();
    const password = process.env.NIMBA_TEST_ADMIN_PASSWORD ?? '';
    const user = email && password ? findDemoUserByEmail(email) : null;
    if (!user || user.password !== password) return bad('Compte de test non configuré.', 404);
    store.set(DEMO_COOKIE, user.id, options);
    return NextResponse.json({
      ok: true,
      user: { email: user.email, credits: user.credits },
      sessionToken: createDemoSessionToken(user.id),
    });
  }

  if (action === 'demo') {
    if (!isDemoMode()) return bad('Le compte de démonstration est désactivé en production.', 403);
    const email = `demo-${crypto.randomUUID().slice(0, 8)}@nimba.local`;
    const user = createDemoUser(email, 'demo-only');
    store.set(DEMO_COOKIE, user.id, options);
    return NextResponse.json({
      ok: true,
      user: { email: user.email, credits: user.credits },
      sessionToken: createDemoSessionToken(user.id),
    });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Adresse e-mail invalide.');
  if (password.length < 6) return bad('Le mot de passe doit contenir au moins 6 caractères.');

  if (isDemoMode()) {
    const existing = findDemoUserByEmail(email);
    if (action === 'signup') {
      if (existing) return bad('Ce compte existe déjà. Connectez-vous plutôt.', 409);
      const user = createDemoUser(email, password);
      store.set(DEMO_COOKIE, user.id, options);
      return NextResponse.json({
        ok: true,
        user: { email, credits: user.credits },
        sessionToken: createDemoSessionToken(user.id),
      });
    }
    if (!existing) return bad('Compte introuvable. Créez un compte pour recevoir 3 crédits offerts.', 404);
    // Même en démo, le mot de passe doit être vérifié : sinon n'importe qui
    // pourrait se connecter au compte de test en connaissant seulement l'e-mail.
    if (existing.password !== password) return bad('Mot de passe incorrect.', 401);
    store.set(DEMO_COOKIE, existing.id, options);
    return NextResponse.json({
      ok: true,
      user: { email, credits: existing.credits },
      sessionToken: createDemoSessionToken(existing.id),
    });
  }

  const supabase = userClient();
  if (!supabase) return bad('Supabase est mal configuré côté serveur.', 500);

  if (action === 'signup') {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return bad(error.message, 400);
    if (!data.session) {
      return NextResponse.json({
        ok: true,
        confirmationRequired: true,
        message: 'Vérifiez votre boîte mail pour confirmer votre compte (3 crédits vous attendent).',
      });
    }
    store.set(ACCESS_COOKIE, data.session.access_token, options);
    store.set(REFRESH_COOKIE, data.session.refresh_token, options);
    return NextResponse.json({ ok: true, user: { email } });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) return bad(error?.message ?? 'Identifiants incorrects.', 401);
  store.set(ACCESS_COOKIE, data.session.access_token, options);
  store.set(REFRESH_COOKIE, data.session.refresh_token, options);
  return NextResponse.json({ ok: true, user: { email } });
}

export async function GET() {
  const session = await getSession();
  return NextResponse.json({ session }, { headers: { 'cache-control': 'no-store' } });
}
