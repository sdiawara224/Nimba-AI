/**
 * Second atelier : montage vidéo.
 *
 * Un prompt produit un storyboard structuré (scènes, durées, voix off,
 * transitions, palettes) puis un APERÇU ANIMÉ autonome : un document HTML
 * 16:9 avec lecteur, barre de progression et sous-titres, sans aucune
 * ressource externe. Il est jouable dans l'iframe sandboxé et exportable.
 *
 * Avec ANTHROPIC_API_KEY, le storyboard est rédigé par l'IA ; sinon un
 * générateur local déterministe prend le relais. Le rendu HTML, lui, est
 * toujours produit localement pour rester reproductible et sûr.
 */
import { hasAiConfig } from './env';

export interface Scene {
  id: number;
  title: string;
  duration: number;
  visual: string;
  voiceOver: string;
  transition: 'fade' | 'slide' | 'zoom';
  palette: [string, string];
}

export interface Storyboard {
  title: string;
  style: string;
  soundtrack: string;
  scenes: Scene[];
}

export interface VideoGenerationResult {
  html: string;
  storyboard: Storyboard;
  title: string;
  summary: string;
  engine: 'anthropic' | 'atelier-local';
}

export function totalDuration(storyboard: Storyboard): number {
  return storyboard.scenes.reduce((sum, scene) => sum + scene.duration, 0);
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

function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;
}

/** Valide et normalise un storyboard (source IA, JSONB ou édition locale). */
export function normalizeStoryboard(raw: unknown): Storyboard | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const rawScenes = Array.isArray(source.scenes) ? source.scenes : [];
  if (rawScenes.length === 0) return null;

  const scenes: Scene[] = rawScenes.slice(0, 12).map((item, index) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const palette = Array.isArray(row.palette) ? row.palette : [];
    const transition = row.transition;
    return {
      id: index + 1,
      title: truncate(String(row.title ?? `Plan ${index + 1}`), 80),
      duration: Math.min(30, Math.max(1, Math.round(Number(row.duration) || 3))),
      visual: truncate(String(row.visual ?? 'Plan large, lumière douce.'), 180),
      voiceOver: truncate(String(row.voiceOver ?? String(row.title ?? '')), 220),
      transition: transition === 'slide' || transition === 'zoom' ? transition : 'fade',
      palette: [safeColor(palette[0], '#8b7bff'), safeColor(palette[1], '#46d6b0')],
    };
  });

  return {
    title: truncate(String(source.title ?? 'Film de marque'), 80),
    style: truncate(String(source.style ?? 'Moderne, lumineux, rythmé'), 120),
    soundtrack: truncate(String(source.soundtrack ?? 'Instrumental discret, montée progressive'), 120),
    scenes,
  };
}

/* ------------------------------------------------------------------ */
/* Storyboard local                                                    */
/* ------------------------------------------------------------------ */

interface VideoTheme {
  brand: string;
  sector: string;
  tagline: string;
  accent: string;
  accent2: string;
  visual: string;
}

const COLORS: Array<{ test: RegExp; a: string; b: string }> = [
  { test: /bleu|blue|azur/i, a: '#3b82f6', b: '#22d3ee' },
  { test: /rouge|red|bordeaux/i, a: '#ef4444', b: '#fb7185' },
  { test: /vert|green|émeraude/i, a: '#22c55e', b: '#84cc16' },
  { test: /orange|corail/i, a: '#f97316', b: '#fbbf24' },
  { test: /violet|pourpre|purple/i, a: '#8b5cf6', b: '#c084fc' },
  { test: /rose|pink|fuchsia/i, a: '#ec4899', b: '#fbbf24' },
  { test: /jaune|dor[eé]|gold/i, a: '#eab308', b: '#f97316' },
  { test: /turquoise|cyan/i, a: '#14b8a6', b: '#22d3ee' },
];

const SECTORS: Array<{ test: RegExp; label: string; tagline: string; visual: string }> = [
  { test: /restaurant|caf[eé]|cuisine|menu|food|gastronom/i, label: 'Restaurant', tagline: 'une cuisine généreuse et des produits choisis', visual: 'plats, tables dressées et lumière chaude' },
  { test: /boutique|mode|v[eê]tement|e-?commerce|shop|produit/i, label: 'Boutique', tagline: 'une sélection de pièces qui durent', visual: 'matières, détails de fabrication et packshots' },
  { test: /saas|application|app|startup|logiciel|plateforme|dashboard/i, label: 'Application', tagline: 'une façon plus simple de travailler', visual: 'interfaces, tableaux de bord et gestes fluides' },
  { test: /festival|[eé]v[eé]nement|concert|conf[eé]rence|soir[eé]e/i, label: 'Événement', tagline: 'trois jours qui donnent envie d’être là', visual: 'scène, foule, lumières et affiches' },
  { test: /portfolio|photographe|cr[eé]atif|artiste|design/i, label: 'Studio créatif', tagline: 'des idées qui prennent forme', visual: 'tirages, carnets et plans de travail' },
  { test: /immobilier|hôtel|voyage|tourisme|destination/i, label: 'Lieu & voyage', tagline: 'un endroit où l’on se projette', visual: 'architectures, paysages et lumière naturelle' },
];

function inferVideoTheme(prompt: string): VideoTheme {
  const sector = SECTORS.find((s) => s.test.test(prompt)) ?? {
    label: 'Marque',
    tagline: 'une idée simple, portée avec soin',
    visual: 'formes, matières et lumière douce',
  };
  const quoted = prompt.match(/["«]([^"»]{2,40})["»]/)?.[1]?.trim();
  const color = COLORS.find((c) => c.test.test(prompt));
  const defaultBrand: Record<string, string> = {
    Restaurant: 'Maison Savane',
    Boutique: 'Boutique Sofa',
    Application: 'Nimba Cloud',
    'Événement': 'Festival Niani',
    'Studio créatif': 'Atelier Kora',
    'Lieu & voyage': 'Escales',
  };
  return {
    brand: truncate(quoted || defaultBrand[sector.label] || 'Votre marque', 34),
    sector: sector.label,
    tagline: sector.tagline,
    visual: sector.visual,
    accent: color?.a ?? '#8b7bff',
    accent2: color?.b ?? '#46d6b0',
  };
}

function buildLocalStoryboard(prompt: string): Storyboard {
  const theme = inferVideoTheme(prompt);
  const requestedScenes = Number(prompt.match(/(\d{1,2})\s*(?:sc[eè]nes?|plans?|s[eé]quences?)/i)?.[1] ?? 0);
  const requestedDuration = Number(prompt.match(/(\d{1,3})\s*(?:secondes?|sec\b|\bs\b)/i)?.[1] ?? 0);
  const sceneCount = requestedScenes ? Math.min(8, Math.max(3, requestedScenes)) : 5;
  const duration = requestedDuration ? Math.min(60, Math.max(6, requestedDuration)) : 15;
  const base = Math.max(2, Math.floor(duration / sceneCount));
  let remainder = Math.max(sceneCount * 2, duration) - base * sceneCount;

  const copy: Array<{ title: string; visual: string; voiceOver: string; transition: Scene['transition'] }> = [
    { title: theme.brand, visual: `Ouverture : ${theme.visual}, logo qui apparaît en fondu.`, voiceOver: `Découvrez ${theme.brand}, ${theme.tagline}.`, transition: 'fade' },
    { title: 'Le point de départ', visual: `Plan rapproché sur ${theme.visual}, mouvement lent.`, voiceOver: 'On part toujours d’une envie simple : faire les choses bien.', transition: 'slide' },
    { title: 'Ce qui change', visual: 'Alternance de plans courts, rythme qui s’accélère.', voiceOver: `Ici, tout est pensé pour ${theme.tagline}.`, transition: 'zoom' },
    { title: 'Les détails', visual: `Gros plans sur ${theme.visual}, lumière naturelle.`, voiceOver: 'Chaque détail compte, du premier au dernier regard.', transition: 'fade' },
    { title: 'La preuve', visual: 'Chiffres et témoignages en surimpression, fond net.', voiceOver: 'Une expérience que l’on recommande, et à laquelle on revient.', transition: 'slide' },
    { title: 'Le moment', visual: 'Plan large, respiration, musique qui monte.', voiceOver: 'Un instant qui donne envie de s’arrêter.', transition: 'zoom' },
    { title: 'Ensemble', visual: 'Portraits, regards caméra, mouvement d’ensemble.', voiceOver: 'Une équipe, une exigence, et beaucoup d’attention.', transition: 'fade' },
    { title: 'À vous de jouer', visual: `Carton final sur fond dégradé, logo ${theme.brand}.`, voiceOver: `${theme.brand} — à découvrir dès aujourd’hui.`, transition: 'fade' },
  ];

  const scenes: Scene[] = Array.from({ length: sceneCount }, (_, index) => {
    const item = copy[index % copy.length];
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    const shift = index % 4;
    return {
      id: index + 1,
      title: item.title,
      duration: base + extra,
      visual: item.visual,
      voiceOver: item.voiceOver,
      transition: item.transition,
      palette: shift === 0
        ? [theme.accent, theme.accent2]
        : shift === 1
          ? [theme.accent2, theme.accent]
          : shift === 2
            ? ['#1b2030', theme.accent]
            : [theme.accent, '#1b2030'],
    };
  });

  return {
    title: `${theme.brand} — Film de marque`,
    style: `Moderne et rythmé, identité ${theme.sector.toLowerCase()}, transitions douces.`,
    soundtrack: 'Instrumental discret, montée progressive sur les deux derniers plans.',
    scenes,
  };
}

/** Modifications courantes d'un storyboard existant. */
export function applyStoryboardEdits(source: Storyboard, instruction: string): Storyboard {
  const sb: Storyboard = JSON.parse(JSON.stringify(source)) as Storyboard;
  let changed = false;
  const quoted = instruction.match(/["«]([^"»]{2,80})["»]/)?.[1]?.trim();

  // 1. Style et couleur
  const color = COLORS.find((c) => c.test.test(instruction));
  if (color) {
    sb.scenes.forEach((scene) => { scene.palette = [color.a, color.b]; });
    sb.style = `Palette ${instruction.match(color.test)?.[0] ?? 'revisitée'}, transitions douces.`;
    changed = true;
  }

  // 2. Durée cible : appliquée EN DERNIER, après les ajouts/retraits de plans.
  const requested = Number(instruction.match(/(\d{1,3})\s*(?:secondes?|sec\b)/i)?.[1] ?? 0);
  const durationTarget = requested >= 6 && requested <= 90 ? requested : 0;
  if (durationTarget) changed = true;

  // 3. Titre et voix off
  if (/\b(?:titre|nom du film|intitul[eé])\b/i.test(instruction) && quoted) {
    sb.title = quoted;
    changed = true;
  }
  if (/\b(?:voix off|sous-titres?|texte)\b/i.test(instruction) && quoted) {
    sb.scenes.forEach((scene) => { scene.voiceOver = quoted; });
    changed = true;
  }

  // 4. Structure : retrait puis ajout de plans
  const sceneNumber = Number(instruction.match(/sc[eè]ne\s*(\d{1,2})/i)?.[1] ?? 0);
  if (/\b(?:supprime|retire|enl[eè]ve)\b/i.test(instruction) && sb.scenes.length > 2) {
    const index = sceneNumber ? sceneNumber - 1 : sb.scenes.length - 1;
    if (index >= 0 && index < sb.scenes.length) {
      sb.scenes.splice(index, 1);
      changed = true;
    }
  }

  const wantsScene = /ajout|ajoute|ajouter|nouvelle? sc[eè]ne|nouveau plan|ins[eé]re/i.test(instruction);
  if (wantsScene && sb.scenes.length < 12) {
    const last = sb.scenes[sb.scenes.length - 1];
    const rawLabel = instruction
      .match(/ajout(?:e|er)?\s+(?:une\s+)?(?:sc[eè]ne|plan)\s+(?:de\s+|sur\s+|pour\s+)?["«]?([^"».,]{2,60})["»]?/i)?.[1]
      ?.trim() ?? '';
    // « … et passe la durée à 30 s » ne doit pas faire partie du titre du plan.
    const sceneLabel = rawLabel.split(/\s+(?:et|puis|avec|mais|qui|pour|en)\s+/i)[0]?.trim() ?? '';
    sb.scenes.push({
      id: sb.scenes.length + 1,
      title: quoted || truncate(sceneLabel || instruction, 60) || 'Nouveau plan',
      duration: 3,
      visual: truncate(instruction, 160),
      voiceOver: quoted || truncate(instruction, 180),
      transition: 'fade',
      palette: last?.palette ?? ['#8b7bff', '#46d6b0'],
    });
    changed = true;
  }

  // 5. Rythme
  if (/\b(?:lent|calme|douce?ment|pos[eé])\b/i.test(instruction)) {
    sb.scenes.forEach((scene) => { scene.transition = 'fade'; scene.duration = Math.min(30, scene.duration + 1); });
    sb.soundtrack = 'Ambiance calme et instrumentale, peu de percussions.';
    changed = true;
  } else if (/\b(?:rapide|dynamique|rythm[eé]|punchy|[eé]nergique)\b/i.test(instruction)) {
    sb.scenes.forEach((scene) => { scene.transition = 'zoom'; scene.duration = Math.max(2, scene.duration - 1); });
    sb.soundtrack = 'Rythme soutenu, percussions et montée finale.';
    changed = true;
  }

  if (!changed) {
    sb.scenes.push({
      id: sb.scenes.length + 1,
      title: truncate(instruction, 60),
      duration: 3,
      visual: truncate(instruction, 160),
      voiceOver: truncate(instruction, 180),
      transition: 'fade',
      palette: sb.scenes[0]?.palette ?? ['#8b7bff', '#46d6b0'],
    });
  }

  // 6. Durée exacte, répartie sur le nombre final de plans.
  if (durationTarget) {
    const count = sb.scenes.length;
    const base = Math.max(2, Math.floor(durationTarget / count));
    const remainder = Math.max(0, durationTarget - base * count);
    sb.scenes.forEach((scene, index) => {
      scene.duration = Math.min(30, base + (index < remainder ? 1 : 0));
    });
  }

  sb.scenes.forEach((scene, index) => { scene.id = index + 1; });
  return sb;
}

/* ------------------------------------------------------------------ */
/* Storyboard rédigé par l'IA                                          */
/* ------------------------------------------------------------------ */

const AI_SYSTEM = [
  'Tu es un réalisateur et monteur publicitaire francophone intégré à Nimba Atelier.',
  'Tu réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans ``` et sans commentaire.',
  'Schéma : {"title": string, "style": string, "soundtrack": string, "scenes": [{"title": string, "duration": number, "visual": string, "voiceOver": string, "transition": "fade"|"slide"|"zoom", "palette": ["#rrggbb", "#rrggbb"]}]}.',
  'Règles : 3 à 8 scènes, durée de 2 à 8 secondes par scène, texte en français, concret et crédible, voix off courte (une phrase), description visuelle précise, palettes hexadécimales valides.',
  'Respecte la durée totale et le nombre de scènes demandés s’ils sont précisés. Pas de Lorem ipsum, pas de mention de l’IA.',
].join('\n');

async function aiStoryboard(prompt: string, previous: Storyboard | null): Promise<Storyboard> {
  const apiKey = process.env.ANTHROPIC_API_KEY!.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-5';
  const maxTokens = Math.min(Number(process.env.ANTHROPIC_MAX_TOKENS) || 8000, 8000);

  const userContent = previous
    ? [
        'Voici le storyboard actuel :',
        JSON.stringify(previous),
        '',
        'Modification demandée : ' + prompt,
        '',
        'Applique uniquement cette modification et renvoie le storyboard JSON complet mis à jour.',
      ].join('\n')
    : ['Crée un storyboard de vidéo à partir de ce brief :', '"' + prompt + '"', '', 'Renvoie le storyboard JSON complet.'].join('\n');

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
      system: AI_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Anthropic a répondu ${response.status} : ${truncate(detail, 200)}`);
  }
  const payload = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (payload.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n')
    .trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('La réponse de l’IA ne contient pas de storyboard JSON.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error('Le storyboard renvoyé par l’IA est invalide.');
  }
  const normalized = normalizeStoryboard(parsed);
  if (!normalized) throw new Error('Le storyboard renvoyé par l’IA est vide.');
  return normalized;
}

/* ------------------------------------------------------------------ */
/* Rendu : lecteur animé autonome                                      */
/* ------------------------------------------------------------------ */

function sceneMarkup(scene: Scene, index: number, total: number, brand: string): string {
  const [c1, c2] = scene.palette;
  return (
    '<div class="scene" data-index="' + index + '" data-motion="' + scene.transition + '" style="--c1:' + c1 + ';--c2:' + c2 + '">' +
      '<div class="orb orb-a"></div><div class="orb orb-b"></div>' +
      '<div class="grain"></div>' +
      '<div class="scene-top"><span class="brand">' + escapeHtml(brand) + '</span><span class="counter">' +
        String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0') +
      '</span></div>' +
      '<div class="scene-content">' +
        '<div class="kicker">' + escapeHtml(scene.visual.split(',')[0]) + '</div>' +
        '<h2>' + escapeHtml(scene.title) + '</h2>' +
        '<div class="bar"></div>' +
      '</div>' +
      '<div class="caption"><span class="cc">VOIX OFF</span><p>' + escapeHtml(scene.voiceOver) + '</p></div>' +
    '</div>'
  );
}

export function renderVideoHtml(sb: Storyboard, brief: string): string {
  const brand = escapeHtml(truncate(sb.title.split('—')[0]?.trim() || sb.title, 34));
  const scenesHtml = sb.scenes.map((scene, index) => sceneMarkup(scene, index, sb.scenes.length, brand)).join('');
  const chips = sb.scenes
    .map(
      (scene, index) =>
        '<button class="chip" data-go="' + index + '" type="button"><span>' +
        String(index + 1).padStart(2, '0') + '</span>' + escapeHtml(scene.title) +
        '<em>' + scene.duration + 's</em></button>',
    )
    .join('');
  const durations = JSON.stringify(sb.scenes.map((scene) => scene.duration)).replace(/</g, '\\u003c');
  const total = totalDuration(sb);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(sb.title)} — Storyboard animé</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #07080c; color: #fff; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .player { width: min(1100px, 100%); margin: 0 auto; padding: 18px; }
  .stage { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden; background: #10131e; border: 1px solid rgba(255,255,255,.12); box-shadow: 0 30px 80px rgba(0,0,0,.55); }
  .scene { position: absolute; inset: 0; opacity: 0; visibility: hidden; transition: opacity .85s ease, transform .85s ease, visibility .85s; transform: scale(1.04); background: radial-gradient(circle at 24% 22%, var(--c1), transparent 58%), radial-gradient(circle at 82% 78%, var(--c2), transparent 55%), linear-gradient(135deg, #121728, #080a11); }
  .scene[data-motion="slide"] { transform: translateX(38px); }
  .scene[data-motion="zoom"] { transform: scale(1.18); }
  .scene.active { opacity: 1; visibility: visible; transform: none; z-index: 2; }
  .orb { position: absolute; border-radius: 50%; filter: blur(4px); opacity: .5; }
  .orb-a { width: 42%; height: 70%; top: -24%; right: 6%; border: 1px solid rgba(255,255,255,.28); background: radial-gradient(circle, rgba(255,255,255,.12), transparent 70%); animation: float 9s ease-in-out infinite alternate; }
  .orb-b { width: 28%; height: 46%; bottom: -18%; left: 8%; border: 1px solid rgba(255,255,255,.2); background: radial-gradient(circle, rgba(255,255,255,.1), transparent 70%); animation: float 12s ease-in-out infinite alternate-reverse; }
  @keyframes float { from { transform: translateY(-12px) rotate(-4deg); } to { transform: translateY(16px) rotate(6deg); } }
  .grain { position: absolute; inset: 0; opacity: .5; background-image: radial-gradient(rgba(255,255,255,.14) 1px, transparent 1px); background-size: 26px 26px; mask-image: linear-gradient(120deg, transparent, #000 60%, transparent); }
  .scene-top { position: absolute; top: 5%; left: 5%; right: 5%; display: flex; justify-content: space-between; align-items: center; font-size: clamp(.6rem, 1.3vw, .8rem); letter-spacing: .16em; text-transform: uppercase; font-weight: 700; }
  .brand { background: rgba(0,0,0,.28); padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.22); }
  .counter { opacity: .8; }
  .scene-content { position: absolute; left: 6%; right: 6%; top: 30%; }
  .kicker { font-size: clamp(.6rem, 1.4vw, .88rem); letter-spacing: .18em; text-transform: uppercase; opacity: .8; margin-bottom: 10px; }
  h2 { margin: 0; font-size: clamp(1.6rem, 6.2vw, 5rem); line-height: 1.02; letter-spacing: -.055em; font-weight: 820; text-shadow: 0 6px 40px rgba(0,0,0,.35); }
  .bar { width: clamp(40px, 8vw, 90px); height: 4px; border-radius: 4px; margin-top: 18px; background: #fff; opacity: .9; }
  .caption { position: absolute; bottom: 8%; left: 6%; right: 6%; display: flex; align-items: flex-start; gap: 14px; }
  .caption .cc { font-size: clamp(.55rem, 1.1vw, .68rem); letter-spacing: .16em; font-weight: 800; opacity: .75; border: 1px solid rgba(255,255,255,.4); padding: 4px 8px; border-radius: 5px; white-space: nowrap; margin-top: 3px; }
  .caption p { margin: 0; font-size: clamp(.78rem, 2vw, 1.25rem); font-weight: 550; line-height: 1.4; max-width: 82%; text-shadow: 0 2px 18px rgba(0,0,0,.55); }
  .progress { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: rgba(255,255,255,.22); z-index: 5; }
  .progress i { display: block; height: 100%; width: 0%; background: #fff; }
  .controls { display: flex; align-items: center; gap: 10px; padding: 14px 4px 10px; flex-wrap: wrap; }
  .controls button { border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); color: #fff; border-radius: 9px; padding: 8px 13px; font-size: .8rem; font-weight: 650; }
  .controls button:hover { background: rgba(255,255,255,.14); }
  .controls .time { margin-left: auto; font-size: .8rem; color: rgba(255,255,255,.7); font-variant-numeric: tabular-nums; }
  .chips { display: flex; gap: 7px; overflow-x: auto; padding: 2px 2px 10px; }
  .chip { flex: 1 0 auto; min-width: 110px; display: flex; align-items: center; gap: 8px; text-align: left; border: 1px solid rgba(255,255,255,.1); border-radius: 9px; padding: 9px 11px; background: rgba(255,255,255,.035); color: rgba(255,255,255,.65); font-size: .76rem; }
  .chip span { font-weight: 800; opacity: .6; }
  .chip em { margin-left: auto; font-style: normal; opacity: .55; }
  .chip.active { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.38); color: #fff; }
  .meta { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 6px 4px 0; font-size: .72rem; color: rgba(255,255,255,.45); }
  @media (max-width: 620px) { .player { padding: 8px; } .caption { bottom: 6%; } .chip { min-width: 90px; } }
</style>
</head>
<body>
<div class="player">
  <div class="stage" id="stage">
    ${scenesHtml}
    <div class="progress"><i id="progress"></i></div>
  </div>
  <div class="controls">
    <button type="button" id="play">❚❚ Pause</button>
    <button type="button" id="prev">← Plan</button>
    <button type="button" id="next">Plan →</button>
    <button type="button" id="restart">↻ Rejouer</button>
    <span class="time" id="time">00:00 / ${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}</span>
  </div>
  <div class="chips" id="chips">${chips}</div>
  <div class="meta"><span>${escapeHtml(sb.style)}</span><span>${escapeHtml(sb.soundtrack)}</span></div>
  <div class="meta" style="margin-top:4px"><span>Brief : ${escapeHtml(truncate(brief, 180))}</span><span>Aperçu animé autonome · Nimba Atelier</span></div>
</div>
<script>
(function () {
  var durations = ${durations};
  var total = durations.reduce(function (a, b) { return a + b; }, 0);
  var starts = [];
  var acc = 0;
  for (var i = 0; i < durations.length; i++) { starts.push(acc); acc += durations[i]; }
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var progress = document.getElementById('progress');
  var time = document.getElementById('time');
  var playBtn = document.getElementById('play');
  var t = 0;
  var playing = true;
  var current = -1;
  var timer = null;

  scenes.forEach(function (scene, i) {
    var motion = scene.getAttribute('data-motion');
    if (!motion) { scene.setAttribute('data-motion', 'fade'); }
  });

  function fmt(seconds) {
    var s = Math.max(0, Math.floor(seconds));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function render() {
    var index = 0;
    for (var i = 0; i < starts.length; i++) { if (t >= starts[i]) index = i; }
    if (index !== current) {
      current = index;
      scenes.forEach(function (scene, i) { scene.classList.toggle('active', i === index); });
      chips.forEach(function (chip, i) { chip.classList.toggle('active', i === index); });
      var active = chips[index];
      if (active && active.scrollIntoView) { active.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    }
    progress.style.width = (Math.min(100, (t / total) * 100)) + '%';
    time.textContent = fmt(t) + ' / ' + fmt(total);
    if (t >= total) {
      playing = false;
      playBtn.textContent = '▶ Rejouer';
      stopTimer();
    }
  }

  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function startTimer() {
    stopTimer();
    timer = setInterval(function () { t += 0.1; render(); }, 100);
  }
  function toggle() {
    if (t >= total) { t = 0; }
    playing = !playing;
    playBtn.textContent = playing ? '❚❚ Pause' : '▶ Lecture';
    if (playing) startTimer(); else stopTimer();
    render();
  }
  function goTo(index) {
    if (index < 0 || index >= starts.length) return;
    t = starts[index];
    playing = true;
    playBtn.textContent = '❚❚ Pause';
    startTimer();
    render();
  }

  playBtn.addEventListener('click', toggle);
  document.getElementById('prev').addEventListener('click', function () { goTo(Math.max(0, current - 1)); });
  document.getElementById('next').addEventListener('click', function () { goTo(Math.min(starts.length - 1, current + 1)); });
  document.getElementById('restart').addEventListener('click', function () { goTo(0); });
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () { goTo(Number(chip.getAttribute('data-go'))); });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === ' ') { event.preventDefault(); toggle(); }
    if (event.key === 'ArrowRight') goTo(Math.min(starts.length - 1, current + 1));
    if (event.key === 'ArrowLeft') goTo(Math.max(0, current - 1));
  });

  t = 0;
  render();
  startTimer();
})();
</script>
</body>
</html>`;
}

export function storyboardToMarkdown(sb: Storyboard, brief: string): string {
  const lines = [
    `# ${sb.title}`,
    '',
    `- **Style** : ${sb.style}`,
    `- **Ambiance sonore** : ${sb.soundtrack}`,
    `- **Durée totale** : ${totalDuration(sb)} s`,
    `- **Format** : 16:9 · ${sb.scenes.length} plans`,
    `- **Brief** : ${brief}`,
    '',
    '| # | Plan | Durée | Transition | Visuel | Voix off |',
    '| --- | --- | --- | --- | --- | --- |',
    ...sb.scenes.map(
      (scene) =>
        `| ${scene.id} | ${scene.title.replace(/\|/g, '/')} | ${scene.duration} s | ${scene.transition} | ${scene.visual.replace(/\|/g, '/')} | ${scene.voiceOver.replace(/\|/g, '/')} |`,
    ),
    '',
    '## Plan par plan',
    '',
    ...sb.scenes.flatMap((scene) => [
      `### ${String(scene.id).padStart(2, '0')} — ${scene.title} (${scene.duration} s)`,
      '',
      `- **Visuel** : ${scene.visual}`,
      `- **Voix off** : « ${scene.voiceOver} »`,
      `- **Transition** : ${scene.transition} · **Palette** : ${scene.palette.join(' / ')}`,
      '',
    ]),
    '---',
    '',
    '_Storyboard généré par Nimba Atelier. L’aperçu animé correspondant est exportable en HTML autonome._',
  ];
  return lines.join('\n');
}

export async function generateVideo(request: {
  prompt: string;
  previousStoryboard: Storyboard | null;
}): Promise<VideoGenerationResult> {
  const prompt = truncate(request.prompt, 2000);
  let storyboard: Storyboard;
  let engine: VideoGenerationResult['engine'];

  if (hasAiConfig()) {
    // Un échec ici est propagé : /api/generate rembourse le crédit.
    storyboard = await aiStoryboard(prompt, request.previousStoryboard);
    engine = 'anthropic';
  } else if (request.previousStoryboard) {
    storyboard = applyStoryboardEdits(request.previousStoryboard, prompt);
    engine = 'atelier-local';
  } else {
    storyboard = buildLocalStoryboard(prompt);
    engine = 'atelier-local';
  }

  return {
    html: renderVideoHtml(storyboard, prompt),
    storyboard,
    title: storyboard.title,
    summary: request.previousStoryboard
      ? `Storyboard modifié : ${storyboard.scenes.length} plans, ${totalDuration(storyboard)} s.`
      : `Storyboard créé : ${storyboard.scenes.length} plans, ${totalDuration(storyboard)} s, avec aperçu animé.`,
    engine,
  };
}
