/**
 * Stockage en mémoire pour le MODE DÉMO uniquement.
 * Il reproduit les garanties du schéma Supabase : débit atomique,
 * remboursement, et confirmation de paiement idempotente (un seul crédit ajouté).
 * Les données sont perdues au redémarrage du serveur : ne jamais utiliser en prod.
 */
import { isDemoMode } from './env';
import type { ProjectKind } from './types';
import type { Storyboard } from './video';

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  credits: number;
  createdAt: string;
  /** Réservé au compte de test : donne accès au back-office /admin. */
  isAdmin?: boolean;
}

export interface DemoProject {
  id: string;
  userId: string;
  title: string;
  prompt: string;
  html: string;
  engine: string;
  kind: ProjectKind;
  storyboard: Storyboard | null;
  createdAt: string;
  updatedAt: string;
}

export interface DemoPayment {
  reference: string;
  userId: string;
  planId: string;
  credits: number;
  amountFcfa: number;
  status: 'pending' | 'paid' | 'failed';
  provider: string;
  createdAt: string;
  confirmedAt?: string;
}

interface DemoState {
  users: Map<string, DemoUser>;
  emails: Map<string, string>;
  projects: Map<string, DemoProject>;
  payments: Map<string, DemoPayment>;
  /** Jeton de session sans cookie -> userId (aperçu intégré). */
  tokens: Map<string, string>;
}

const globalRef = globalThis as typeof globalThis & { __nimbaDemoState?: DemoState };

function state(): DemoState {
  if (!globalRef.__nimbaDemoState) {
    globalRef.__nimbaDemoState = {
      users: new Map(),
      emails: new Map(),
      projects: new Map(),
      payments: new Map(),
      tokens: new Map(),
    };
  }
  // Le hot-reload conserve globalThis : un état créé par une version
  // antérieure du module peut ne pas encore posséder toutes les maps.
  const s = globalRef.__nimbaDemoState;
  s.tokens ??= new Map();
  return s;
}

function now(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

export function getDemoUser(userId: string): DemoUser | null {
  return state().users.get(userId) ?? null;
}

export function findDemoUserByEmail(email: string): DemoUser | null {
  const s = state();
  const userId = s.emails.get(email);
  return userId ? s.users.get(userId) ?? null : null;
}

export function createDemoUser(email: string, password: string, credits = 3): DemoUser {
  const s = state();
  const existing = findDemoUserByEmail(email);
  if (existing) return existing;
  const user: DemoUser = { id: id('usr'), email, password, credits, createdAt: now() };
  s.users.set(user.id, user);
  s.emails.set(email, user.id);
  return user;
}

/**
 * Compte de test « admin » du mode démo, créé au premier appel.
 *
 * Les identifiants viennent de NIMBA_TEST_ADMIN_EMAIL / NIMBA_TEST_ADMIN_PASSWORD
 * (`.env.development.local`, ignoré par Git). Rien n'est créé si ces variables
 * sont absentes ou si NIMBA_MODE=production : aucun compte de test n'existe
 * jamais dans la base Supabase via ce mécanisme.
 *
 * « Admin » = solde élevé pour parcourir toutes les fonctionnalités ; il ne
 * donne AUCUN droit sur les autres comptes (RLS et historique inchangés).
 */
const TEST_ADMIN_CREDITS = 999;
let testAccountSeeded = false;

export function ensureDemoTestAccount(): void {
  if (testAccountSeeded || !isDemoMode()) return;
  testAccountSeeded = true;
  const email = (process.env.NIMBA_TEST_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.NIMBA_TEST_ADMIN_PASSWORD ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) return;
  const user = createDemoUser(email, password, TEST_ADMIN_CREDITS);
  user.isAdmin = true;
}

/** Liste des comptes démo pour le back-office admin (jamais exposée en production). */
export function listDemoUsers(): DemoUser[] {
  return [...state().users.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Paiements démo pour les statistiques du back-office. */
export function listDemoPayments(): DemoPayment[] {
  return [...state().payments.values()];
}

/** Nombre de projets d'un utilisateur démo. */
export function countDemoProjects(userId: string): number {
  return listDemoProjects(userId).length;
}

/** Octroi de crédits par un administrateur (mode démo uniquement). */
export function grantDemoCredits(userId: string, amount: number): boolean {
  const user = state().users.get(userId);
  if (!user) return false;
  user.credits += amount;
  return true;
}

/** Débit atomique : renvoie false si le solde est insuffisant. */
export function consumeDemoCredit(userId: string): boolean {
  const user = state().users.get(userId);
  if (!user || user.credits < 1) return false;
  user.credits -= 1;
  return true;
}

export function refundDemoCredit(userId: string): void {
  const user = state().users.get(userId);
  if (user) user.credits += 1;
}

export function addDemoCredits(userId: string, amount: number): void {
  const user = state().users.get(userId);
  if (user) user.credits += amount;
}

export function listDemoProjects(userId: string): DemoProject[] {
  return [...state().projects.values()]
    .filter((project) => project.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDemoProject(userId: string, projectId: string): DemoProject | null {
  const project = state().projects.get(projectId);
  return project && project.userId === userId ? project : null;
}

export function createDemoProject(input: {
  userId: string;
  title: string;
  prompt: string;
  html: string;
  engine: string;
  kind: ProjectKind;
  storyboard: Storyboard | null;
}): DemoProject {
  const project: DemoProject = {
    id: id('prj'),
    userId: input.userId,
    title: input.title,
    prompt: input.prompt,
    html: input.html,
    engine: input.engine,
    kind: input.kind,
    storyboard: input.storyboard,
    createdAt: now(),
    updatedAt: now(),
  };
  state().projects.set(project.id, project);
  return project;
}

export function updateDemoProject(
  userId: string,
  projectId: string,
  patch: Partial<Pick<DemoProject, 'html' | 'title' | 'prompt' | 'engine' | 'storyboard'>>,
): DemoProject | null {
  const project = getDemoProject(userId, projectId);
  if (!project) return null;
  Object.assign(project, patch, { updatedAt: now() });
  return project;
}

export function createDemoPayment(input: {
  reference: string;
  userId: string;
  planId: string;
  credits: number;
  amountFcfa: number;
  provider: string;
}): DemoPayment {
  const payment: DemoPayment = { ...input, status: 'pending', createdAt: now() };
  state().payments.set(payment.reference, payment);
  return payment;
}

export function getDemoPayment(reference: string): DemoPayment | null {
  return state().payments.get(reference) ?? null;
}

/** Idempotent : un webhook rejoué ne crédite jamais deux fois. */
export function confirmDemoPayment(reference: string): { applied: boolean; payment: DemoPayment | null } {
  const payment = state().payments.get(reference);
  if (!payment) return { applied: false, payment: null };
  if (payment.status === 'paid') return { applied: false, payment };
  if (payment.status !== 'pending') return { applied: false, payment };
  payment.status = 'paid';
  payment.confirmedAt = now();
  addDemoCredits(payment.userId, payment.credits);
  return { applied: true, payment };
}


// ---------------------------------------------------------------------
// Session sans cookie : quand un navigateur bloque les cookies tiers dans
// l'aperçu intégré, le serveur renvoie un jeton aléatoire que le client
// renvoie dans l'en-tête Authorization. Équivalent à un cookie de session,
// mais stocké côté client (mémoire + localStorage best-effort).
// ---------------------------------------------------------------------
export function createDemoSessionToken(userId: string): string {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  state().tokens.set(token, userId);
  return token;
}

export function getDemoUserByToken(token: string): DemoUser | null {
  const userId = state().tokens.get(token);
  return userId ? state().users.get(userId) ?? null : null;
}

export function revokeDemoSessionToken(token: string): void {
  state().tokens.delete(token);
}
