import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/env';
import { getSession, type Session } from '@/lib/session';
import { adminClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    revenueFcfa: number;
  };
}

function forbidden() {
  return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });
}

/**
 * Vue d'ensemble du back-office. Toutes les écritures passent par la clé
 * service_role, mais l'accès est contrôlé CÔTÉ SERVEUR par session.isAdmin,
 * issu de app_metadata (Supabase) ou du compte de test (démo). Un client
 * ne peut donc pas s'auto-déclarer administrateur.
 */
async function buildOverview(session: Session): Promise<Overview> {
  if (session.mode === 'demo') {
    const { listDemoUsers, countDemoProjects, listDemoPayments } = await import('@/lib/store');
    const users: AdminUser[] = listDemoUsers().map((u) => ({
      id: u.id,
      email: u.email,
      credits: u.credits,
      projects: countDemoProjects(u.id),
      createdAt: u.createdAt,
      isAdmin: u.isAdmin === true,
    }));
    const payments = listDemoPayments();
    const paid = payments.filter((p) => p.status === 'paid');
    return {
      mode: 'demo',
      users,
      stats: {
        users: users.length,
        projects: users.reduce((n, u) => n + u.projects, 0),
        credits: users.reduce((n, u) => n + u.credits, 0),
        paidPayments: paid.length,
        revenueFcfa: paid.reduce((n, p) => n + p.amountFcfa, 0),
      },
    };
  }

  const admin = adminClient();
  if (!admin) throw new Error('Client Supabase indisponible.');
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, credits, created_at');
  if (error) throw new Error(error.message);

  const { data: projectRows } = await admin.from('projects').select('user_id');
  const { data: paymentRows } = await admin.from('payments').select('status, amount_fcfa');
  const counts = new Map<string, number>();
  for (const row of projectRows ?? []) {
    const key = String(row.user_id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const users: AdminUser[] = (profiles ?? []).map((p) => ({
    id: String(p.id),
    email: String(p.email ?? ''),
    credits: Number(p.credits ?? 0),
    projects: counts.get(String(p.id)) ?? 0,
    createdAt: String(p.created_at ?? ''),
    isAdmin: String(p.id) === session.userId,
  }));
  const paid = (paymentRows ?? []).filter((p) => p.status === 'paid');

  return {
    mode: 'supabase',
    users,
    stats: {
      users: users.length,
      projects: users.reduce((n, u) => n + u.projects, 0),
      credits: users.reduce((n, u) => n + u.credits, 0),
      paidPayments: paid.length,
      revenueFcfa: paid.reduce((n, p) => n + Number(p.amount_fcfa ?? 0), 0),
    },
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Connectez-vous.' }, { status: 401 });
  if (!session.isAdmin) return forbidden();
  try {
    return NextResponse.json(await buildOverview(session), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    return NextResponse.json({ error: `Vue admin indisponible : ${message}` }, { status: 502 });
  }
}

/** Octroi manuel de crédits (1 à 100), journalisé et atomique en base. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Connectez-vous.' }, { status: 401 });
  if (!session.isAdmin) return forbidden();

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    userId?: string;
    amount?: number;
  };
  if (body.action !== 'grant_credits') {
    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
  }
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const amount = Number(body.amount);
  if (!userId || !Number.isInteger(amount) || amount < 1 || amount > 100) {
    return NextResponse.json({ error: 'Montant invalide (1 à 100 crédits).' }, { status: 400 });
  }

  if (session.mode === 'demo') {
    const { grantDemoCredits } = await import('@/lib/store');
    if (!grantDemoCredits(userId, amount)) {
      return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const admin = adminClient();
  if (!admin) return NextResponse.json({ error: 'Supabase indisponible.' }, { status: 500 });
  const { data, error } = await admin.rpc('grant_credits', {
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  if (data === null || data === undefined) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, credits: data });
}
