'use client';

/**
 * Session sans cookie pour les aperçus intégrés.
 *
 * Certains navigateurs bloquent TOUS les cookies tiers, y compris les cookies
 * `Partitioned` (CHIPS). Le serveur renvoie alors un `sessionToken` aléatoire
 * à la connexion ; on le conserve ici et on l'ajoute en en-tête sur chaque
 * appel `/api/*`. Le token est l'équivalent d'un cookie de session : il ne
 * donne accès qu'au compte démo auquel il a été attribué, et il est révoqué
 * à la déconnexion.
 *
 * Priorité : mémoire JS (fonctionne même si tout stockage est bloqué), puis
 * localStorage en best-effort pour survivre à un rechargement de page.
 */

const STORAGE_KEY = 'nimba_session_token';
let memoryToken: string | null = null;

export function setSessionToken(token?: string | null): void {
  memoryToken = token ?? null;
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage tiers bloqué : le jeton reste disponible en mémoire.
  }
}

export function getSessionToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === 'undefined') return null;
  try {
    memoryToken = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible : pas de persistance, la session reste en mémoire.
  }
  return memoryToken;
}

/**
 * Installe un pont sur `fetch` pour les seules URL relatives `/api/*` en
 * chaîne de caractères. Les requêtes internes du routeur Next.js (objets
 * Request) ne sont pas touchées. Retourne une fonction de nettoyage.
 */
export function installApiSessionBridge(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const original = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      const token = getSessionToken();
      if (token) {
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return original(input, { ...init, headers });
      }
    }
    return original(input, init);
  };

  return () => {
    window.fetch = original;
  };
}
