/**
 * Génération du site.
 * - Avec ANTHROPIC_API_KEY : appel à l'API Anthropic (document HTML complet).
 * - Sans clé (mode démo) : générateur local déterministe, aucun appel réseau.
 * Un échec de l'API Anthropic est propagé pour que /api/generate rembourse le crédit.
 */
import { hasAiConfig } from './env';

export interface GenerationRequest {
  prompt: string;
  previousHtml?: string | null;
  mode: 'create' | 'edit';
}

export interface GenerationResult {
  html: string;
  title: string;
  summary: string;
  engine: 'anthropic' | 'atelier-local';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function titleFromHtml(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeEntities(match?.[1] ?? '').replace(/\s+/g, ' ').trim();
  return title ? truncate(title, 70) : fallback;
}

const SYSTEM_PROMPT = [
  'Tu es un générateur de sites web expert, intégré au produit Nimba Atelier.',
  'Tu produis UN SEUL document HTML complet, autonome et prêt à être ouvert dans un iframe.',
  'Règles impératives :',
  '- Réponds uniquement avec le code HTML brut, sans markdown, sans balises ``` et sans explication.',
  '- Document complet : <!DOCTYPE html>, <html lang="fr">, <head> avec <meta charset>, <meta name="viewport"> et <title>, <body>.',
  '- Tout le CSS est inline dans une balise <style>. JavaScript facultatif, inline, sans dépendance.',
  '- Aucune ressource externe (pas de CDN, pas de polices distantes, pas d\'images distantes) : utilise des dégradés CSS, des formes et du SVG inline.',
  '- Design moderne, soigné, responsive, accessible, avec une hiérarchie claire, des boutons, des sections et un pied de page.',
  '- Contenu rédigé en français, concret et crédible pour le secteur demandé. Jamais de Lorem ipsum ni de texte de remplissage.',
  '- Ne mentionne jamais l\'IA, la génération ou Nimba dans le contenu du site.',
].join('\n');

async function callAnthropic(request: GenerationRequest): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-5';
  const maxTokens = Number(process.env.ANTHROPIC_MAX_TOKENS) || 8000;

  const userContent =
    request.mode === 'edit' && request.previousHtml
      ? [
          'Voici le HTML actuel du site :',
          '<current_html>',
          request.previousHtml,
          '</current_html>',
          '',
          'Modification demandée par l\'utilisateur : ' + request.prompt,
          '',
          'Applique UNIQUEMENT cette modification (ou les ajustements strictement nécessaires), conserve le reste du design, et renvoie le document HTML complet mis à jour.',
        ].join('\n')
      : [
          'Crée un site web complet à partir de ce brief :',
          '"' + request.prompt + '"',
          '',
          'Choisis le secteur, le nom de marque, la palette et les sections les plus pertinents. Renvoie le document HTML complet.',
        ].join('\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Anthropic a répondu ${response.status} : ${truncate(detail, 300)}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  let html = (payload.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n')
    .trim();

  const fenced = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) html = fenced[1].trim();

  if (!/<!doctype html>/i.test(html) && !/<html[\s>]/i.test(html)) {
    throw new Error("La réponse de l'IA ne contient pas un document HTML complet.");
  }
  return html;
}

/* ------------------------------------------------------------------ */
/* Générateur local (mode démo / sans clé IA)                          */
/* ------------------------------------------------------------------ */

interface Theme {
  key: string;
  brand: string;
  sector: string;
  eyebrow: string;
  headline: string;
  sub: string;
  accent: string;
  accent2: string;
  features: Array<{ icon: string; title: string; text: string }>;
  cards: Array<{ tag: string; title: string; text: string }>;
  cta: { title: string; text: string };
}

const THEMES: Theme[] = [
  {
    key: 'restaurant',
    brand: 'Maison Savane',
    sector: 'Restaurant & gastronomie',
    eyebrow: 'Cuisine de saison · Conakry',
    headline: 'Le goût des bons moments, à chaque table.',
    sub: 'Une carte courte, des produits choisis avec soin et une salle où l’on aime revenir.',
    accent: '#f4a340',
    accent2: '#ef6a4c',
    features: [
      { icon: 'M4 12h16M12 4v16', title: 'Produits frais', text: 'Un approvisionnement local, chaque semaine, au rythme des saisons.' },
      { icon: 'M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z', title: 'Carte signature', text: 'Des recettes simples, généreuses, pensées pour être partagées.' },
      { icon: 'M3 12h18M12 3a9 9 0 100 18 9 9 0 000-18z', title: 'Tous les jours', text: 'Déjeuner et dîner, du mardi au dimanche, sans interruption.' },
    ],
    cards: [
      { tag: 'Entrées', title: 'Les débuts', text: 'Fraîcheur, herbes et petites surprises pour ouvrir l’appétit.' },
      { tag: 'Plats', title: 'La carte', text: 'Grillades, plats mijotés et végétariens de caractère.' },
      { tag: 'Desserts', title: 'La douceur', text: 'Une fin de repas soignée, toujours faite maison.' },
    ],
    cta: { title: 'Réservez votre table', text: 'Un dîner, un anniversaire, un simple plaisir : on s’occupe du reste.' },
  },
  {
    key: 'portfolio',
    brand: 'Atelier Kora',
    sector: 'Portfolio créatif',
    eyebrow: 'Design · Image · Direction artistique',
    headline: 'Des idées qui prennent forme, et qui restent.',
    sub: 'Un studio indépendant pour les marques qui veulent une identité claire et singulière.',
    accent: '#a78bfa',
    accent2: '#f472b6',
    features: [
      { icon: 'M12 3l9 9-9 9-9-9z', title: 'Identité', text: 'Des systèmes visuels cohérents, du logo au moindre détail.' },
      { icon: 'M4 6h16v12H4z', title: 'Direction artistique', text: 'Une ligne esthétique tenue sur tous vos supports.' },
      { icon: 'M3 12h18M12 3v18', title: 'Sur mesure', text: 'Chaque projet part d’une vraie conversation, pas d’un modèle.' },
    ],
    cards: [
      { tag: 'Projet 01', title: 'Identité de marque', text: 'Un univers graphique complet pour une maison de création.' },
      { tag: 'Projet 02', title: 'Campagne', text: 'Série d’images et de supports pour un lancement produit.' },
      { tag: 'Projet 03', title: 'Éditorial', text: 'Mise en page et direction photo pour un magazine indépendant.' },
    ],
    cta: { title: 'Parlons de votre projet', text: 'Un brief, un café, et une première piste dès la première semaine.' },
  },
  {
    key: 'boutique',
    brand: 'Boutique Sofa',
    sector: 'Boutique & e-commerce',
    eyebrow: 'Sélection · Livraison partout',
    headline: 'De belles choses, choisies pour durer.',
    sub: 'Une sélection resserrée d’objets, de textiles et d’accessoires faits avec attention.',
    accent: '#34d399',
    accent2: '#22d3ee',
    features: [
      { icon: 'M3 8h18l-1 12H4zM8 8V6a4 4 0 018 0v2', title: 'Sélection', text: 'Peu de pièces, mais les bonnes, testées et approuvées.' },
      { icon: 'M3 12h18M12 3v18', title: 'Livraison', text: 'Expédition suivie et soignée sous 48 heures ouvrées.' },
      { icon: 'M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z', title: 'Qualité', text: 'Retours faciles et service client qui répond vraiment.' },
    ],
    cards: [
      { tag: 'Nouveau', title: 'Collection Saison', text: 'Matières naturelles et teintes douces pour la maison.' },
      { tag: 'Best-seller', title: 'Les essentiels', text: 'Les pièces que nos clientes rachètent pour offrir.' },
      { tag: 'Édition limitée', title: 'Collaborations', text: 'Des séries courtes avec des artisanes et artisans.' },
    ],
    cta: { title: 'Découvrez la collection', text: 'Recevez aussi les nouveautés en avant-première, sans bruit inutile.' },
  },
  {
    key: 'saas',
    brand: 'Nimba Cloud',
    sector: 'SaaS & application',
    eyebrow: 'Productivité · Automatisation',
    headline: 'Moins d’outils. Beaucoup plus de temps.',
    sub: 'Une plateforme unique pour organiser le travail, suivre les projets et avancer plus vite.',
    accent: '#818cf8',
    accent2: '#22d3ee',
    features: [
      { icon: 'M4 6h16v12H4zM4 10h16', title: 'Tout au même endroit', text: 'Projets, tâches et discussions dans un espace enfin lisible.' },
      { icon: 'M13 3L5 14h6l-1 7 8-11h-6z', title: 'Automatisations', text: 'Les tâches répétitives disparaissent, sans une ligne de code.' },
      { icon: 'M3 18l5-6 4 3 5-8 4 4', title: 'Pilotage clair', text: 'Des indicateurs compréhensibles, mis à jour en temps réel.' },
    ],
    cards: [
      { tag: 'Équipes', title: 'Collaboration', text: 'Rôles, commentaires et historique pour travailler sereinement.' },
      { tag: 'Sécurité', title: 'Données protégées', text: 'Chiffrement, sauvegardes et contrôle des accès inclus.' },
      { tag: 'Intégrations', title: 'Vos outils', text: 'Connectez vos services habituels en quelques clics.' },
    ],
    cta: { title: 'Commencez gratuitement', text: 'Aucune carte bancaire. Votre premier espace est prêt en une minute.' },
  },
  {
    key: 'agence',
    brand: 'Agence Djoliba',
    sector: 'Agence & conseil',
    eyebrow: 'Stratégie · Digital · Croissance',
    headline: 'Des stratégies qui se voient dans les résultats.',
    sub: 'Nous accompagnons les entreprises qui veulent transformer une ambition en trajectoire.',
    accent: '#60a5fa',
    accent2: '#a78bfa',
    features: [
      { icon: 'M3 18l5-6 4 3 5-8 4 4', title: 'Stratégie', text: 'Des priorités claires, chiffrées et tenues dans la durée.' },
      { icon: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2', title: 'Exécution', text: 'Une équipe qui livre, avec des points de suivi hebdomadaires.' },
      { icon: 'M4 12h16M12 4v16', title: 'Mesure', text: 'Chaque action est reliée à un indicateur que vous comprenez.' },
    ],
    cards: [
      { tag: 'Étude', title: 'Diagnostic', text: 'Comprendre le marché, l’offre et les vrais freins à la croissance.' },
      { tag: 'Build', title: 'Déploiement', text: 'Site, contenu, acquisition : un plan exécuté de bout en bout.' },
      { tag: 'Scale', title: 'Optimisation', text: 'Amélioration continue à partir des données réelles.' },
    ],
    cta: { title: 'Planifions un échange', text: 'Trente minutes pour cadrer votre enjeu, sans engagement.' },
  },
  {
    key: 'evenement',
    brand: 'Festival Niani',
    sector: 'Événement & communauté',
    eyebrow: 'Trois jours · Une ville · Mille rencontres',
    headline: 'Un rendez-vous qui donne envie d’être là.',
    sub: 'Concerts, ateliers et rencontres réunis dans un programme pensé pour toutes et tous.',
    accent: '#fb7185',
    accent2: '#fbbf24',
    features: [
      { icon: 'M12 3v18M3 12h18', title: 'Programme', text: 'Trois scènes, des ateliers et des temps de discussion.' },
      { icon: 'M4 6h16v12H4z', title: 'Billetterie', text: 'Pass journée ou festival complet, en quelques secondes.' },
      { icon: 'M12 3l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z', title: 'Expérience', text: 'Un site pensé pour flâner, découvrir et se retrouver.' },
    ],
    cards: [
      { tag: 'Jour 1', title: 'Ouverture', text: 'Scène principale, artistes invités et première soirée.' },
      { tag: 'Jour 2', title: 'Ateliers', text: 'Masterclasses, tables rondes et rencontres avec le public.' },
      { tag: 'Jour 3', title: 'Finale', text: 'Grande scène et clôture collective jusqu’au bout de la nuit.' },
    ],
    cta: { title: 'Prenez votre pass', text: 'Les places partent vite : réservez la vôtre dès aujourd’hui.' },
  },
];

const COLOR_WORDS: Array<{ test: RegExp; color: string; soft: string }> = [
  { test: /bleu|blue|azur/i, color: '#3b82f6', soft: '#60a5fa' },
  { test: /rouge|red|bordeaux/i, color: '#ef4444', soft: '#fb7185' },
  { test: /vert|green|émeraude/i, color: '#22c55e', soft: '#4ade80' },
  { test: /orange|corail/i, color: '#f97316', soft: '#fb923c' },
  { test: /violet|pourpre|purple/i, color: '#8b5cf6', soft: '#a78bfa' },
  { test: /rose|pink|fuchsia/i, color: '#ec4899', soft: '#f472b6' },
  { test: /jaune|dor[eé]|gold|yellow/i, color: '#eab308', soft: '#facc15' },
  { test: /turquoise|cyan/i, color: '#14b8a6', soft: '#2dd4bf' },
];

function inferTheme(prompt: string): Theme {
  const p = prompt.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/restaurant|caf[eé]|cuisine|menu|pizza|boulangerie|bar |gastronom|food/i, 'restaurant'],
    [/portfolio|photographe|designer|cr[eé]atif|artiste|studio cr[eé]atif|agence cr[eé]ative/i, 'portfolio'],
    [/boutique|e-?commerce|shop|mode|v[eê]tement|produits|vente en ligne|marketplace/i, 'boutique'],
    [/saas|application|app |dashboard|startup|logiciel|plateforme|outil en ligne|crm/i, 'saas'],
    [/agence|conseil|consulting|entreprise|b2b|cabinet|corporate/i, 'agence'],
    [/[eé]v[eé]nement|festival|conf[eé]rence|concert|salon|webinaire/i, 'evenement'],
  ];
  const key = rules.find(([re]) => re.test(p))?.[1] ?? 'saas';
  const base = THEMES.find((t) => t.key === key) ?? THEMES[3];

  const quoted = prompt.match(/["«]([^"»]{2,40})["»]/);
  const named = prompt.match(/(?:nomm[eé]|appel[eé]|marque\s*:|s'appelle)\s+([A-Za-zÀ-ÿ0-9'’\- ]{2,30})/i);
  const brand = quoted?.[1]?.trim() || named?.[1]?.trim().split(/\s+pour\s+/)[0]?.trim() || base.brand;

  const color = COLOR_WORDS.find((c) => c.test.test(prompt));
  return {
    ...base,
    brand: truncate(brand, 34),
    accent: color?.color ?? base.accent,
    accent2: color?.soft ?? base.accent2,
  };
}

function localHtml(prompt: string, theme: Theme): string {
  const brief = escapeHtml(truncate(prompt, 220));
  const brand = escapeHtml(theme.brand);
  const features = theme.features
    .map(
      (f) =>
        '<article class="feature"><span class="feature-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' +
        f.icon +
        '"/></svg></span><h3>' +
        escapeHtml(f.title) +
        '</h3><p>' +
        escapeHtml(f.text) +
        '</p></article>',
    )
    .join('');
  const cards = theme.cards
    .map(
      (c, i) =>
        '<article class="card"><div class="card-art art-' +
        ((i % 3) + 1) +
        '"><span>' +
        escapeHtml(c.tag) +
        '</span></div><div class="card-body"><h3>' +
        escapeHtml(c.title) +
        '</h3><p>' +
        escapeHtml(c.text) +
        '</p><a href="#contact" class="card-link">En savoir plus <span aria-hidden="true">→</span></a></div></article>',
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${brand} — ${escapeHtml(theme.sector)}</title>
<style>
  :root { --accent: ${theme.accent}; --accent-2: ${theme.accent2}; --bg: #0b0d13; --panel: #131722; --text: #f7f8fc; --muted: #a5abc0; --line: rgba(255,255,255,.09); }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }
  .wrap { width: min(1120px, 92%); margin: 0 auto; }
  header { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(14px); background: rgba(11,13,19,.8); border-bottom: 1px solid var(--line); }
  .nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; gap: 20px; }
  .logo { font-weight: 800; letter-spacing: -.03em; font-size: 1.15rem; display: flex; align-items: center; gap: 10px; }
  .logo-mark { width: 30px; height: 30px; border-radius: 9px; background: linear-gradient(135deg, var(--accent), var(--accent-2)); display: inline-block; }
  .nav-links { display: flex; gap: 26px; font-size: .9rem; color: var(--muted); }
  .nav-links a:hover { color: var(--text); }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 22px; border-radius: 999px; font-weight: 650; font-size: .92rem; border: 1px solid transparent; cursor: pointer; transition: transform .2s, box-shadow .2s, background .2s; }
  .btn:hover { transform: translateY(-2px); }
  .btn-primary { background: linear-gradient(120deg, var(--accent), var(--accent-2)); color: #0b0d13; box-shadow: 0 10px 30px color-mix(in srgb, var(--accent) 30%, transparent); }
  .btn-ghost { border-color: var(--line); color: var(--text); background: rgba(255,255,255,.03); }
  .btn-sm { padding: 9px 18px; font-size: .86rem; }
  .hero { position: relative; overflow: hidden; padding: 92px 0 80px; }
  .hero::before { content: ""; position: absolute; width: 560px; height: 560px; top: -240px; right: -140px; background: radial-gradient(circle, color-mix(in srgb, var(--accent) 38%, transparent), transparent 68%); filter: blur(20px); }
  .hero::after { content: ""; position: absolute; width: 420px; height: 420px; bottom: -220px; left: -120px; background: radial-gradient(circle, color-mix(in srgb, var(--accent-2) 26%, transparent), transparent 70%); }
  .hero-grid { position: relative; display: grid; grid-template-columns: 1.05fr .95fr; gap: 56px; align-items: center; }
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: .78rem; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); font-weight: 700; margin-bottom: 22px; }
  .eyebrow::before { content: ""; width: 22px; height: 2px; background: var(--accent); }
  h1 { font-size: clamp(2.5rem, 5.4vw, 4.2rem); line-height: 1.06; letter-spacing: -.045em; margin: 0 0 22px; font-weight: 800; }
  .grad { background: linear-gradient(100deg, var(--accent), var(--accent-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .hero p.lead { font-size: 1.12rem; color: var(--muted); max-width: 520px; margin: 0 0 30px; }
  .brief { font-size: .82rem; color: #7f879e; border-left: 2px solid var(--line); padding-left: 14px; margin: 26px 0 0; max-width: 500px; }
  .actions { display: flex; gap: 12px; flex-wrap: wrap; }
  .visual { position: relative; border-radius: 24px; border: 1px solid var(--line); background: linear-gradient(160deg, #171b28, #0e111a); padding: 18px; box-shadow: 0 30px 90px rgba(0,0,0,.55); transform: rotate(1.5deg); }
  .visual-bar { display: flex; gap: 6px; margin-bottom: 16px; }
  .visual-bar i { width: 9px; height: 9px; border-radius: 50%; background: #3a4054; }
  .visual-bar i:first-child { background: var(--accent); }
  .visual-block { border-radius: 14px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 30%, #12151f), color-mix(in srgb, var(--accent-2) 18%, #12151f)); height: 210px; display: flex; align-items: flex-end; padding: 22px; font-size: 1.4rem; font-weight: 750; letter-spacing: -.02em; }
  .visual-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
  .visual-row span { height: 46px; border-radius: 10px; background: rgba(255,255,255,.055); border: 1px solid var(--line); }
  .stats { display: flex; gap: 42px; flex-wrap: wrap; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 26px 0; }
  .stat strong { display: block; font-size: 1.7rem; letter-spacing: -.04em; background: linear-gradient(100deg, var(--accent), var(--accent-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .stat span { font-size: .83rem; color: var(--muted); }
  section { padding: 84px 0; }
  .section-head { max-width: 620px; margin-bottom: 46px; }
  .section-head .kicker { color: var(--accent); font-weight: 700; font-size: .8rem; letter-spacing: .14em; text-transform: uppercase; }
  h2 { font-size: clamp(1.9rem, 3.6vw, 2.8rem); letter-spacing: -.04em; line-height: 1.15; margin: 12px 0 14px; }
  .section-head p { color: var(--muted); margin: 0; }
  .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .feature { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 28px; }
  .feature-icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); margin-bottom: 20px; }
  .feature-icon svg { width: 22px; height: 22px; }
  .feature h3, .card h3 { font-size: 1.06rem; margin: 0 0 8px; letter-spacing: -.02em; }
  .feature p, .card p { color: var(--muted); font-size: .92rem; margin: 0; }
  .showcase { background: linear-gradient(180deg, transparent, rgba(255,255,255,.02), transparent); }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .card { border: 1px solid var(--line); border-radius: 18px; overflow: hidden; background: var(--panel); transition: transform .25s; }
  .card:hover { transform: translateY(-5px); }
  .card-art { height: 158px; padding: 16px; display: flex; align-items: flex-start; }
  .card-art span { font-size: .74rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; background: rgba(0,0,0,.35); color: #fff; padding: 6px 12px; border-radius: 999px; }
  .art-1 { background: linear-gradient(140deg, var(--accent), #1a1f2e); }
  .art-2 { background: linear-gradient(140deg, var(--accent-2), #151a27); }
  .art-3 { background: linear-gradient(140deg, #2a3044, var(--accent)); }
  .card-body { padding: 22px; }
  .card-link { display: inline-block; margin-top: 16px; color: var(--accent); font-size: .88rem; font-weight: 650; }
  .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
  .quote { border-left: 3px solid var(--accent); padding: 10px 0 10px 24px; font-size: 1.15rem; color: var(--text); }
  .quote small { display: block; margin-top: 14px; color: var(--muted); font-size: .85rem; }
  .cta { border-radius: 26px; padding: 56px 44px; text-align: center; border: 1px solid var(--line); background: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%), var(--panel); }
  .cta h2 { margin-bottom: 12px; }
  .cta p { color: var(--muted); max-width: 520px; margin: 0 auto 26px; }
  .extra { padding: 64px 0; border-top: 1px solid var(--line); }
  .extra-inner { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 34px; }
  footer { border-top: 1px solid var(--line); padding: 34px 0; color: var(--muted); font-size: .86rem; }
  .footer-inner { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
  @media (max-width: 860px) {
    .nav-links { display: none; }
    .hero-grid, .about-grid { grid-template-columns: 1fr; gap: 34px; }
    .features, .cards { grid-template-columns: 1fr; }
    .hero { padding: 62px 0 56px; }
    section { padding: 58px 0; }
    .visual { transform: none; }
  }
</style>
</head>
<body>
<header><div class="wrap nav">
  <a class="logo" href="#top"><span class="logo-mark"></span>${brand}</a>
  <nav class="nav-links"><a href="#services">Services</a><a href="#realisations">Réalisations</a><a href="#apropos">À propos</a><a href="#contact">Contact</a></nav>
  <a href="#contact" class="btn btn-primary btn-sm">Nous contacter</a>
</div></header>

<main id="top">
  <div class="hero"><div class="wrap hero-grid">
    <div>
      <span class="eyebrow">${escapeHtml(theme.eyebrow)}</span>
      <h1 id="hero-title">${escapeHtml(theme.headline.split(' ').slice(0, -2).join(' '))} <span class="grad">${escapeHtml(theme.headline.split(' ').slice(-2).join(' '))}</span></h1>
      <p class="lead">${escapeHtml(theme.sub)}</p>
      <div class="actions"><a href="#contact" class="btn btn-primary">Découvrir <span aria-hidden="true">→</span></a><a href="#services" class="btn btn-ghost">En savoir plus</a></div>
      <p class="brief">Brief du projet : « ${brief} »</p>
    </div>
    <div class="visual" aria-hidden="true">
      <div class="visual-bar"><i></i><i></i><i></i></div>
      <div class="visual-block">${brand}</div>
      <div class="visual-row"><span></span><span></span><span></span></div>
    </div>
  </div></div>

  <div class="wrap"><div class="stats">
    <div class="stat"><strong>+120</strong><span>projets menés</span></div>
    <div class="stat"><strong>98 %</strong><span>clients satisfaits</span></div>
    <div class="stat"><strong>7 j/7</strong><span>à votre écoute</span></div>
    <div class="stat"><strong>100 %</strong><span>sur mesure</span></div>
  </div></div>

  <section id="services"><div class="wrap">
    <div class="section-head"><span class="kicker">Notre approche</span><h2>Tout ce qu'il faut, rien de superflu.</h2><p>Des prestations claires, pensées pour durer et faciles à faire évoluer.</p></div>
    <div class="features">${features}</div>
  </div></section>

  <section id="realisations" class="showcase"><div class="wrap">
    <div class="section-head"><span class="kicker">Sélection</span><h2>Quelques réalisations.</h2><p>Un aperçu de ce que nous aimons construire, secteur par secteur.</p></div>
    <div class="cards">${cards}</div>
  </div></section>

  <section id="apropos"><div class="wrap about-grid">
    <div><div class="section-head" style="margin:0"><span class="kicker">À propos</span><h2>Une équipe, une exigence.</h2><p>Nous croyons aux projets bien faits, aux relations durables et aux détails qui changent tout.</p></div></div>
    <div class="quote">« La simplicité demande du travail. C'est précisément celui que nous aimons faire. »<small>— L'équipe ${brand}</small></div>
  </div></section>

  <section id="contact"><div class="wrap"><div class="cta">
    <h2>${escapeHtml(theme.cta.title)}</h2>
    <p>${escapeHtml(theme.cta.text)}</p>
    <a href="mailto:bonjour@exemple.com" class="btn btn-primary">Écrivez-nous <span aria-hidden="true">→</span></a>
  </div></div></section>
</main>

<footer id="footer"><div class="wrap footer-inner">
  <span>© <span id="year">2026</span> ${brand}. Tous droits réservés.</span>
  <span>${escapeHtml(theme.sector)} · Conakry</span>
</div></footer>
<script>
  var y = document.getElementById('year');
  if (y) { y.textContent = String(new Date().getFullYear()); }
</script>
</body>
</html>`;
}

/** Applique les modifications les plus courantes au HTML local. */
function applyLocalEdits(html: string, instruction: string): string {
  let result = html;
  let changed = false;

  const color = COLOR_WORDS.find((c) => c.test.test(instruction));
  if (color) {
    const before = result;
    result = result.replace(/(--accent:\s*)#[0-9a-fA-F]{3,8}/, '$1' + color.color);
    result = result.replace(/(--accent-2:\s*)#[0-9a-fA-F]{3,8}/, '$1' + color.soft);
    changed = changed || result !== before;
  }

  if (/\b(?:clair|light|blanc|white)\b/i.test(instruction)) {
    const before = result;
    result = result
      .replace(/(--bg:\s*)#[0-9a-fA-F]{3,8}/, '$1#f6f7fb')
      .replace(/(--panel:\s*)#[0-9a-fA-F]{3,8}/, '$1#ffffff')
      .replace(/(--text:\s*)#[0-9a-fA-F]{3,8}/, '$1#141824')
      .replace(/(--muted:\s*)#[0-9a-fA-F]{3,8}/, '$1#596079')
      .replace(/(--line:\s*)rgba\(255,255,255,\.09\)/, '$1rgba(15,20,40,.10)');
    changed = changed || result !== before;
  } else if (/\b(?:sombre|dark|noir|black)\b/i.test(instruction)) {
    const before = result;
    result = result
      .replace(/(--bg:\s*)#[0-9a-fA-F]{3,8}/, '$1#0b0d13')
      .replace(/(--panel:\s*)#[0-9a-fA-F]{3,8}/, '$1#131722')
      .replace(/(--text:\s*)#[0-9a-fA-F]{3,8}/, '$1#f7f8fc')
      .replace(/(--muted:\s*)#[0-9a-fA-F]{3,8}/, '$1#a5abc0');
    changed = changed || result !== before;
  }

  const quoted = instruction.match(/["«]([^"»]{2,80})["»]/)?.[1]?.trim();
  if (/\b(?:titre|headline|h1)\b/i.test(instruction) && quoted) {
    const before = result;
    result = result.replace(/(<h1[^>]*>)[\s\S]*?(<\/h1>)/i, '$1' + escapeHtml(quoted) + '$2');
    changed = changed || result !== before;
  }

  const wantsSection = /ajout|ajoute|ajouter|section|bloc|t[eé]moignage|contact|tarif|newsletter|faq|galerie/i.test(instruction);
  if (wantsSection) {
    const heading = quoted || truncate(instruction.replace(/^(?:ajoute|ajouter|ajout|cr[eé]e|cr[eé]er)\s+(?:une\s+)?(?:section|bloc)\s*/i, ''), 70);
    const block =
      '<section class="extra" id="nouvelle-section"><div class="wrap"><div class="extra-inner">' +
      '<span class="kicker" style="color:var(--accent);font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:.8rem">Nouveauté</span>' +
      '<h2>' + escapeHtml(heading || 'Nouvelle section') + '</h2>' +
      '<p style="color:var(--muted);max-width:640px;margin:0">' + escapeHtml(truncate(instruction, 200)) + '</p>' +
      '</div></div></section>';
    if (result.includes('<footer')) {
      result = result.replace('<footer', block + '\n<footer');
      changed = true;
    }
  }

  if (!changed) {
    const note =
      '<section class="extra"><div class="wrap"><div class="extra-inner"><h2>Dernière modification</h2>' +
      '<p style="color:var(--muted);margin:0">' + escapeHtml(truncate(instruction, 200)) + '</p></div></div></section>';
    result = result.includes('<footer') ? result.replace('<footer', note + '\n<footer') : result + note;
  }

  return result;
}

export async function generateSite(request: GenerationRequest): Promise<GenerationResult> {
  const prompt = truncate(request.prompt, 2000);
  const fallbackTitle = truncate(prompt.replace(/^(?:cr[eé]e|cr[eé]er|fais|faire|g[eé]n[eè]re|un site|une page)\s*/i, ''), 60) || 'Mon projet Nimba';

  if (hasAiConfig()) {
    const html = await callAnthropic({ ...request, prompt });
    return {
      html,
      title: titleFromHtml(html, fallbackTitle),
      summary:
        request.mode === 'edit'
          ? 'Modification appliquée par l’IA à votre site.'
          : 'Site généré par l’IA à partir de votre brief.',
      engine: 'anthropic',
    };
  }

  if (request.mode === 'edit' && request.previousHtml) {
    const html = applyLocalEdits(request.previousHtml, prompt);
    return {
      html,
      title: titleFromHtml(html, fallbackTitle),
      summary: 'Modification appliquée à votre site (générateur local).',
      engine: 'atelier-local',
    };
  }

  const theme = inferTheme(prompt);
  const html = localHtml(prompt, theme);
  return {
    html,
    title: titleFromHtml(html, fallbackTitle),
    summary: `Site « ${theme.brand} » créé pour le secteur ${theme.sector.toLowerCase()}.`,
    engine: 'atelier-local',
  };
}
