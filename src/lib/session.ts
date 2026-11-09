import { cookies, headers } from 'next/headers';
import { isDemoMode } from './env';
import { getDemoUser } from './store';
import { adminClient, userClient } from './supabase';
import type { ProjectKind } from './types';
import type { Storyboard } from './video';
import { normalizeStoryboard } from './video';

export const DEMO_COOKIE = 'nimba_session';
export const ACCESS_COOKIE = 'nimba_access_token';
export const REFRESH_COOKIE = 'nimba_refresh_token';

export type AppMode = 'demo' | 'supabase';

export interface Session {
  userId: string;
  email: string;
  credits: number;
  mode: AppMode;
  /** Vrai uniquement pour le compte de test admin (jamais auto-attribuable). */
  isAdmin: boolean;
}

export interface NimbaCookieOptions {
  httpOnly: boolean;
  sameSite: 'lax' | 'none';
  secure: boolean;
  path: string;
  maxAge: number;
  partitioned?: boolean;
}

/**
 * L'aperçu Arena est affiché dans une iframe **cross-site** en HTTPS.
 * Avec SameSite=Lax, le navigateur refuse de renvoyer le cookie sur les
 * fetch() émis depuis cette iframe : /api/auth répond 200, mais /api/session
 * reste anonyme et l'utilisateur reste bloqué sur la page de garde du studio.
 *
 * Sur ce contexte on utilise SameSite=None + Secure + Partitioned (CHIPS),
 * seul couple accepté par Chrome pour un cookie tiers. En local et en
 * production top-level, on garde Lax (plus sûr contre les requêtes cross-site).
 */
export async function cookieOptions(): Promise<NimbaCookieOptions> {
  const h = await headers();
  const host = (h.get('x-forwarded-host') ?? h.get('host') ?? '').toLowerCase();
  const origin = (h.get('origin') ?? '').toLowerCase();
  const proto = (h.get('x-forwarded-proto') ?? '').split(',')[0].trim().toLowerCase();
  const forwarded = `${host} ${origin}`;
  const previewHost = forwarded.includes('.e2b.app') || forwarded.includes('.vercel.app');
  const https = proto === 'https' || previewHost || process.env.NODE_ENV === 'production';
  const embedded = previewHost || process.env.NIMBA_COOKIE_PARTITIONED === '1';

  if (https && embedded) {
    return {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      partitioned: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    };
  }
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: https,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function getCookie(name: string): Promise<string | null> {
  const store = await cookies();
  return store.get(name)?.value ?? null;
}

/**
 * Jeton de session sans cookie, envoyé par le client dans Authorization
 * (ou x-nimba-session). Utilisé uniquement en mode démo, quand l'aperçu est
 * intégré en iframe et que le navigateur bloque les cookies tiers.
 */
export async function readSessionToken(): Promise<string | null> {
  const h = await headers();
  const auth = h.get('authorization') ?? '';
  if (auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    return token || null;
  }
  return h.get('x-nimba-session')?.trim() || null;
}

/**
 * Renouvelle la session Supabase avec le refresh token (rotation activée)
 * et persiste la nouvelle paire de tokens dans les cookies httpOnly.
 * Retourne le nouvel access token, ou null si le refresh est impossible.
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const client = userClient();
  if (!client) return null;
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) return null;
  try {
    const store = await cookies();
    const options = await cookieOptions();
    store.set(ACCESS_COOKIE, data.session.access_token, options);
    store.set(REFRESH_COOKIE, data.session.refresh_token, options);
  } catch {
    // Contexte en lecture seule (server component) : les cookies seront
    // rafraîchis au prochain appel effectué depuis une route API.
  }
  return data.session.access_token;
}

export async function getSession(): Promise<Session | null> {
  if (isDemoMode()) {
    const userId = await getCookie(DEMO_COOKIE);
    let user = userId ? getDemoUser(userId) : null;
    if (!user) {
      // Repli sans cookie : jeton renvoyé en en-tête par le client.
      const token = await readSessionToken();
      if (token) {
        const { getDemoUserByToken } = await import('./store');
        user = getDemoUserByToken(token);
      }
    }
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email,
      credits: user.credits,
      mode: 'demo',
      isAdmin: user.isAdmin === true,
    };
  }

  const token = await getCookie(ACCESS_COOKIE);
  if (!token) return null;
  const admin = adminClient();
  if (!admin) return null;
  let result = await admin.auth.getUser(token);

  // JWT expiré (durée de vie 3600 s) : renouvellement transparent via le
  // refresh token, indispensable avec la rotation activée côté Supabase.
  if ((result.error || !result.data.user) && (await getCookie(REFRESH_COOKIE))) {
    const refreshToken = (await getCookie(REFRESH_COOKIE))!;
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) result = await admin.auth.getUser(newToken);
  }
  if (result.error || !result.data.user) return null;
  const userId = result.data.user.id;
  const email = result.data.user.email ?? '';
  // Le rôle vient de app_metadata (raw_app_meta_data), non modifiable par
  // l'utilisateur : seules les clés service_role peuvent l'écrire.
  const appMetadata = (result.data.user.app_metadata ?? {}) as Record<string, unknown>;
  const isAdmin = appMetadata.nimba_admin === true;

  const { data: profile } = await admin
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .maybeSingle();

  return {
    userId,
    email,
    credits: typeof profile?.credits === 'number' ? profile.credits : 0,
    mode: 'supabase',
    isAdmin,
  };
}

/** Débit atomique d'un crédit (false = solde insuffisant). */
export async function consumeCredit(session: Session): Promise<boolean> {
  if (session.mode === 'demo') {
    const { consumeDemoCredit } = await import('./store');
    return consumeDemoCredit(session.userId);
  }
  const admin = adminClient();
  if (!admin) return false;
  const { data, error } = await admin.rpc('consume_credit', { p_user_id: session.userId });
  return !error && data !== null && data !== false;
}

/** Remboursement si l'appel à l'IA échoue. */
export async function refundCredit(session: Session): Promise<void> {
  if (session.mode === 'demo') {
    const { refundDemoCredit } = await import('./store');
    refundDemoCredit(session.userId);
    return;
  }
  const admin = adminClient();
  if (!admin) return;
  await admin.rpc('refund_credit', {
    p_user_id: session.userId,
    p_reason: 'generation_failed',
  });
}

export interface StoredProject {
  id: string;
  title: string;
  prompt: string;
  html: string;
  engine: string;
  kind: ProjectKind;
  storyboard: Storyboard | null;
  createdAt: string;
  updatedAt: string;
}

const PROJECT_FIELDS = 'id, title, prompt, html, engine, kind, storyboard, created_at, updated_at';

function mapRow(input: unknown): StoredProject {
  const row = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    title: String(row.title ?? 'Projet'),
    prompt: String(row.prompt ?? ''),
    html: String(row.html ?? ''),
    engine: String(row.engine ?? 'atelier-local'),
    kind: row.kind === 'video' ? 'video' : 'site',
    storyboard: normalizeStoryboard(row.storyboard),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function listProjects(session: Session): Promise<StoredProject[]> {
  if (session.mode === 'demo') {
    const { listDemoProjects } = await import('./store');
    return listDemoProjects(session.userId).map(mapRow);
  }
  const admin = adminClient();
  if (!admin) return [];
  const { data } = await admin
    .from('projects')
    .select(PROJECT_FIELDS)
    .eq('user_id', session.userId)
    .order('updated_at', { ascending: false });
  return (data ?? []).map((row: Record<string, unknown>) => mapRow(row));
}

export async function getProject(session: Session, projectId: string): Promise<StoredProject | null> {
  if (session.mode === 'demo') {
    const { getDemoProject } = await import('./store');
    const project = getDemoProject(session.userId, projectId);
    return project ? mapRow(project) : null;
  }
  const admin = adminClient();
  if (!admin) return null;
  const { data } = await admin
    .from('projects')
    .select(PROJECT_FIELDS)
    .eq('id', projectId)
    .eq('user_id', session.userId)
    .maybeSingle();
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function saveProject(
  session: Session,
  input: {
    projectId?: string | null;
    title: string;
    prompt: string;
    html: string;
    engine: string;
    kind: ProjectKind;
    storyboard?: Storyboard | null;
  },
): Promise<StoredProject | null> {
  const storyboard = input.storyboard ?? null;

  if (session.mode === 'demo') {
    const { createDemoProject, updateDemoProject } = await import('./store');
    const existing = input.projectId
      ? updateDemoProject(session.userId, input.projectId, {
          html: input.html,
          title: input.title,
          engine: input.engine,
          storyboard,
        })
      : null;
    const project =
      existing ??
      createDemoProject({
        userId: session.userId,
        title: input.title,
        prompt: input.prompt,
        html: input.html,
        engine: input.engine,
        kind: input.kind,
        storyboard,
      });
    return mapRow(project);
  }

  const admin = adminClient();
  if (!admin) return null;
  const payload = {
    html: input.html,
    title: input.title,
    engine: input.engine,
    storyboard,
    updated_at: new Date().toISOString(),
  };

  if (input.projectId) {
    const { data } = await admin
      .from('projects')
      .update(payload)
      .eq('id', input.projectId)
      .eq('user_id', session.userId)
      .select(PROJECT_FIELDS)
      .maybeSingle();
    if (data) return mapRow(data as Record<string, unknown>);
  }

  const { data } = await admin
    .from('projects')
    .insert({
      user_id: session.userId,
      title: input.title,
      prompt: input.prompt,
      html: input.html,
      engine: input.engine,
      kind: input.kind,
      storyboard,
    })
    .select(PROJECT_FIELDS)
    .single();
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function createPendingPayment(input: {
  reference: string;
  session: Session;
  planId: string;
  credits: number;
  amountFcfa: number;
  provider: string;
}): Promise<void> {
  if (input.session.mode === 'demo') {
    const { createDemoPayment } = await import('./store');
    createDemoPayment({
      reference: input.reference,
      userId: input.session.userId,
      planId: input.planId,
      credits: input.credits,
      amountFcfa: input.amountFcfa,
      provider: input.provider,
    });
    return;
  }
  const admin = adminClient();
  if (!admin) throw new Error('Client Supabase indisponible.');
  const { error } = await admin.from('payments').insert({
    reference: input.reference,
    user_id: input.session.userId,
    plan_id: input.planId,
    credits: input.credits,
    amount_fcfa: input.amountFcfa,
    status: 'pending',
    provider: input.provider,
  });
  if (error) throw new Error(error.message);
}

/** Confirmation idempotente : plusieurs webhooks = un seul ajout de crédits. */
export async function confirmPayment(payment: {
  reference: string;
  userId: string;
  credits: number;
  amountFcfa: number;
}): Promise<boolean> {
  if (isDemoMode()) {
    const { confirmDemoPayment } = await import('./store');
    return confirmDemoPayment(payment.reference).applied;
  }
  const admin = adminClient();
  if (!admin) return false;
  const { data, error } = await admin.rpc('confirm_payment', {
    p_reference: payment.reference,
    p_user_id: payment.userId,
    p_credits: payment.credits,
    p_amount_fcfa: payment.amountFcfa,
  });
  return !error && data === true;
}
