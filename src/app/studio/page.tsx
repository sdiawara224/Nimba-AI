'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/SessionContext';
import { setSessionToken } from '@/lib/client-session';
import type { ProjectKind } from '@/lib/types';
import type { Scene, Storyboard } from '@/lib/video';

interface Project {
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

interface Entry {
  role: 'you' | 'nimba';
  text: string;
}

const SITE_STARTERS = [
  { emoji: '🍽️', label: 'Site vitrine pour un restaurant de cuisine locale à Conakry', hint: 'Une vitrine chaude avec carte et réservation.', prompt: 'Crée un site vitrine pour un restaurant de cuisine locale à Conakry, avec une palette orangée, une section carte, et un appel à réserver une table.' },
  { emoji: '◈', label: 'Landing page pour une application SaaS', hint: 'Hero, fonctionnalités, tarifs et essai gratuit.', prompt: 'Crée une landing page pour une application SaaS de gestion de projets, en bleu et violet, avec des fonctionnalités, des tarifs et un essai gratuit.' },
  { emoji: '🎨', label: 'Portfolio pour une photographe', hint: 'Galerie de projets et contact, en violet et rose.', prompt: 'Crée un portfolio élégant pour une photographe indépendante nommée « Atelier Kora », en violet et rose, avec une galerie de projets et un contact.' },
  { emoji: '🛍️', label: 'Boutique en ligne de mode', hint: 'Collection, avantages et nouveautés.', prompt: 'Crée une page pour une boutique en ligne de vêtements et accessoires, en vert, avec une collection, des avantages et un appel à découvrir les nouveautés.' },
  { emoji: '🎪', label: 'Page pour un festival de musique', hint: 'Programme, billetterie et artistes.', prompt: 'Crée une page pour un festival de musique de trois jours, en rose et jaune, avec le programme, la billetterie et des artistes.' },
  { emoji: '🏢', label: 'Site pour une agence de conseil', hint: 'Services, méthode et contact, sobre et bleu.', prompt: 'Crée un site corporate pour une agence de conseil en stratégie digitale, sobre et bleu, avec services, méthode et formulaire de contact.' },
];

const VIDEO_STARTERS = [
  { emoji: '▶', label: 'Pub de 15 secondes pour un restaurant', hint: '5 plans, palette orangée, voix off gourmande.', prompt: 'Crée une publicité vidéo de 15 secondes en 5 scènes pour le restaurant « Maison Savane », en orange, avec des plans de plats et une voix off gourmande.' },
  { emoji: '🛍️', label: 'Teaser produit pour une boutique (bleu)', hint: '4 plans dynamiques, gros plans sur les matières.', prompt: 'Monte un teaser de 12 secondes pour une boutique de mode en bleu, 4 scènes, rythme dynamique, gros plans sur les matières.' },
  { emoji: '◈', label: 'Lancement d’une app SaaS (6 plans, 20 s)', hint: 'Interface, bénéfices et carton final.', prompt: 'Crée une vidéo de lancement de 20 secondes en 6 scènes pour une application SaaS, en violet, avec interface, bénéfices et carton final.' },
  { emoji: '🎪', label: 'Aftermovie de festival en rose', hint: '6 plans énergiques, foule et scène.', prompt: 'Monte un aftermovie de festival de 25 secondes en rose et jaune, 6 plans, montage énergique, foule et scène.' },
  { emoji: '🎨', label: 'Film de marque pour un studio créatif', hint: '5 plans calmes, voix off poétique.', prompt: 'Crée un film de marque calme de 18 secondes pour un studio créatif, 5 scènes, transitions douces, voix off poétique.' },
  { emoji: '🌍', label: 'Présentation d’un lieu en 30 secondes', hint: '6 plans, paysages et lumière naturelle.', prompt: 'Crée une vidéo de 30 secondes en 6 scènes pour présenter un lieu de voyage, en turquoise, avec paysages et lumière naturelle.' },
];

const SITE_EDITS = [
  'Passe la palette en vert et ajoute une section témoignages',
  'Change le titre principal en « Votre idée, notre métier »',
  'Ajoute une section tarifs avec trois formules',
  'Passe le site en thème clair',
];

const VIDEO_EDITS = [
  'Passe la palette en bleu et rends le montage plus dynamique',
  'Ajoute une scène « Témoignage client »',
  'Passe la durée totale à 30 secondes',
  'Supprime la dernière scène',
  'Change le titre en « Notre histoire »',
  'Rends le montage plus calme',
];

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 42) || 'projet'
  );
}

function durationText(scenes: Scene[]): string {
  return `${scenes.reduce((sum, scene) => sum + scene.duration, 0)} s`;
}

function storyboardMarkdown(sb: Storyboard, brief: string): string {
  const lines = [
    `# ${sb.title}`,
    '',
    `- **Style** : ${sb.style}`,
    `- **Ambiance sonore** : ${sb.soundtrack}`,
    `- **Durée totale** : ${durationText(sb.scenes)} · ${sb.scenes.length} plans · 16:9`,
    `- **Brief** : ${brief}`,
    '',
    '| # | Plan | Durée | Transition | Visuel | Voix off |',
    '| --- | --- | --- | --- | --- | --- |',
    ...sb.scenes.map(
      (scene) =>
        `| ${scene.id} | ${scene.title.replace(/\|/g, '/')} | ${scene.duration} s | ${scene.transition} | ${scene.visual.replace(/\|/g, '/')} | ${scene.voiceOver.replace(/\|/g, '/')} |`,
    ),
    '',
    '_Storyboard Nimba Atelier — l’aperçu animé correspondant est exportable en HTML autonome._',
  ];
  return lines.join('\n');
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StudioPage() {
  const router = useRouter();
  const { session, mode, aiEnabled, loading: sessionLoading, refresh } = useApp();

  const [kind, setKind] = useState<ProjectKind>('site');
  const kindRef = useRef<ProjectKind>('site');
  const [projects, setProjects] = useState<Project[]>([]);
  const [current, setCurrent] = useState<Project | null>(null);
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [tab, setTab] = useState<'preview' | 'code' | 'storyboard'>('preview');
  const [frameKey, setFrameKey] = useState(0);
  const [gateBusy, setGateBusy] = useState(false);
  const loadedFor = useRef<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { projects?: Project[] };
      const list = data.projects ?? [];
      setProjects(list);
      setCurrent((previous) => {
        if (previous) return previous;
        const first = list.find((project) => project.kind === kindRef.current) ?? null;
        if (first) {
          setHistory([
            {
              role: 'nimba',
              text: `Projet « ${first.title} » rechargé depuis votre historique. Continuez à le modifier.`,
            },
          ]);
        }
        return first;
      });
    } catch {
      // Historique indisponible : l'atelier reste utilisable.
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paiement') === 'ok') {
      setNotice('Paiement confirmé : vos crédits ont été ajoutés. Bonne création !');
      void refresh();
    }
  }, [refresh]);

  useEffect(() => {
    if (!session) {
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === session.userId) return;
    loadedFor.current = session.userId;
    void loadProjects();
  }, [session, loadProjects]);

  function switchKind(next: ProjectKind) {
    if (next === kind) return;
    kindRef.current = next;
    setKind(next);
    const first = projects.find((project) => project.kind === next) ?? null;
    setCurrent(first);
    setHistory(
      first
        ? [{ role: 'nimba', text: `${next === 'video' ? 'Storyboard' : 'Projet'} « ${first.title} » chargé. Décrivez la suite.` }]
        : [],
    );
    setPrompt('');
    setError(null);
    setNotice(null);
    setTab('preview');
    setFrameKey((key) => key + 1);
  }

  const generate = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || busy) return;
      if (clean.length < 5) {
        setError('Décrivez votre idée un peu plus précisément (5 caractères minimum).');
        return;
      }
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ prompt: clean, projectId: current?.id ?? null, kind: kindRef.current }),
        });
        const data = (await response.json()) as {
          project?: Project;
          summary?: string;
          engine?: string;
          error?: string;
        };
        if (!response.ok || !data.project) {
          setError(data.error ?? 'La génération a échoué.');
        } else {
          const project = data.project;
          setCurrent(project);
          setProjects((previous) => [project, ...previous.filter((p) => p.id !== project.id)]);
          setHistory((previous) => [
            ...previous,
            { role: 'you', text: clean },
            {
              role: 'nimba',
              text: `${data.summary ?? 'Projet mis à jour.'} · moteur ${data.engine === 'anthropic' ? 'Anthropic' : 'local'}${current?.id ? ' · modification' : ' · nouvelle création'}`,
            },
          ]);
          setPrompt('');
          setTab('preview');
          setFrameKey((key) => key + 1);
        }
        await refresh();
      } catch {
        setError('Impossible de joindre le serveur. Réessayez.');
      } finally {
        setBusy(false);
      }
    },
    [busy, current?.id, refresh],
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void generate(prompt);
  }

  function onPromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void generate(prompt);
    }
  }

  async function openProject(project: Project) {
    if (project.id === current?.id) return;
    if (project.kind !== kindRef.current) {
      kindRef.current = project.kind;
      setKind(project.kind);
    }
    try {
      const response = await fetch(`/api/projects?id=${encodeURIComponent(project.id)}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as { project?: Project };
      if (!data.project) return;
      setCurrent(data.project);
      setHistory([
        {
          role: 'nimba',
          text: `${data.project.kind === 'video' ? 'Storyboard' : 'Projet'} « ${data.project.title} » chargé. Décrivez la modification souhaitée.`,
        },
      ]);
      setFrameKey((key) => key + 1);
      setTab('preview');
      setError(null);
    } catch {
      setError('Impossible de charger ce projet.');
    }
  }

  function newProject() {
    setCurrent(null);
    setHistory([]);
    setPrompt('');
    setError(null);
    setNotice(null);
  }

  function exportHtml() {
    if (!current?.html) return;
    download(`nimba-${slugify(current.title)}.html`, current.html, 'text/html;charset=utf-8');
    setNotice(kind === 'video' ? 'Aperçu animé .html exporté.' : 'Fichier .html exporté.');
  }

  function exportStoryboard() {
    if (!current?.storyboard) return;
    download(
      `nimba-storyboard-${slugify(current.title)}.md`,
      storyboardMarkdown(current.storyboard, current.prompt),
      'text/markdown;charset=utf-8',
    );
    setNotice('Storyboard .md exporté.');
  }

  function openInNewTab() {
    if (!current?.html) return;
    const blob = new Blob([current.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function copyCode() {
    if (!current?.html) return;
    try {
      await navigator.clipboard.writeText(current.html);
      setNotice('Code HTML copié dans le presse-papiers.');
    } catch {
      setError('Copie impossible dans ce navigateur. Utilisez l’export .html.');
    }
  }

  async function startAs(action: 'demo' | 'test-admin') {
    setGateBusy(true);
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
      // Le cookie peut être refusé par le navigateur (cookies tiers bloqués
      // dans un aperçu intégré). On le détecte au lieu de boucler sur la garde.
      const probe = await fetch('/api/session', { cache: 'no-store' });
      const state = (await probe.json()) as { session?: unknown };
      if (!state.session) {
        setError(
          'Connexion créée, mais votre navigateur n’a pas conservé la session (cookies tiers bloqués dans l’aperçu intégré). Ouvrez l’atelier dans un nouvel onglet puis reconnectez-vous.',
        );
      }
    } catch {
      setError('Impossible de joindre le serveur.');
    } finally {
      setGateBusy(false);
    }
  }

  const visibleProjects = projects.filter((project) => project.kind === kind);
  const starters = kind === 'video' ? VIDEO_STARTERS : SITE_STARTERS;
  const edits = kind === 'video' ? VIDEO_EDITS : SITE_EDITS;
  const isVideo = kind === 'video';
  const storyboard = current?.storyboard ?? null;

  if (sessionLoading) {
    return (
      <main className="gate-shell">
        <div className="loading-card"><div className="spinner" style={{ margin: '0 auto 14px' }} /><p>Chargement de l’atelier…</p></div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="gate-shell">
        <div className="gate-card">
          <span className="badge"><span className="badge-dot" /> 2 ateliers · 3 crédits offerts</span>
          <h1>Votre atelier vous attend.</h1>
          <p>Générez un site web ou montez une vidéo : décrivez, regardez l’aperçu live, affinez, exportez.</p>
          {error && <div className="alert alert-error">{error}</div>}
          {error?.includes('cookies tiers') && (
            <button type="button" className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: 14 }} onClick={() => window.open('/studio', '_blank', 'noopener,noreferrer')}>
              ↗ Ouvrir l’atelier dans un nouvel onglet
            </button>
          )}
          {mode === 'demo' ? (
            <>
              <button type="button" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={gateBusy} onClick={() => void startAs('demo')}>
                {gateBusy ? 'Connexion…' : 'Essayer gratuitement (mode démo)'}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" style={{ width: '100%', marginTop: 10 }} disabled={gateBusy} onClick={() => void startAs('test-admin')}>
                ⚙ Connexion compte de test admin (999 crédits)
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => router.push('/login?next=%2Fstudio')}>
              Créer mon compte
            </button>
          )}
          <p style={{ margin: '18px 0 0', fontSize: '0.84rem' }}>
            <Link href="/login?next=%2Fstudio" className="muted">J’ai déjà un compte →</Link>
            {' · '}
            <Link href="/admin" className="muted">Admin</Link>
            {' · '}
            <Link href="/" className="muted">Accueil</Link>
          </p>
          <p style={{ margin: '12px 0 0', fontSize: '0.74rem', color: 'var(--muted-2)' }}>
            Si la session ne reste pas active dans l’aperçu intégré,{' '}
            <a href="/studio" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-2)' }}>ouvrez l’atelier dans un nouvel onglet</a>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="studio-shell">
      <div className="studio-topbar">
        <div className="topbar-left">
          <Link href="/" className="logo"><span className="logo-mark">N</span> Nimba <span className="logo-sub">/ Atelier</span></Link>
          <div className="segmented mode-switch" aria-label="Choisir un atelier">
            <button type="button" className={!isVideo ? 'active' : ''} onClick={() => switchKind('site')}>◇ Site</button>
            <button type="button" className={isVideo ? 'active' : ''} onClick={() => switchKind('video')}>▶ Vidéo</button>
          </div>
          <span className="topbar-title">— <span>{current ? current.title : isVideo ? 'Nouveau montage' : 'Nouveau projet'}</span></span>
        </div>
        <div className="topbar-right">
          {mode === 'demo' && <span className="mode-pill">mode démo · {aiEnabled ? 'IA Anthropic' : 'générateur local'}</span>}
          {session.isAdmin && <Link href="/admin" className="admin-link">⚙ Admin</Link>}
          <button type="button" className="btn btn-secondary btn-sm" onClick={newProject}>+ Nouveau</button>
          <Link href="/#tarifs" className="credits-pill">✦ {session.credits} crédit{session.credits > 1 ? 's' : ''}</Link>
        </div>
      </div>

      <div className="studio-body">
        <aside className="studio-sidebar">
          <div>
            <p className="sidebar-block-title">Votre solde</p>
            <div className="credits-box">
              <div className="count">{session.credits} <small>crédits</small></div>
              <p>1 crédit par génération ou modification, pour les deux ateliers. Remboursé en cas d’échec.</p>
              <Link href="/#tarifs" className="btn btn-secondary btn-sm">Recharger</Link>
            </div>
          </div>

          <div>
            <p className="sidebar-block-title">{isVideo ? 'Montages' : 'Projets'} ({visibleProjects.length})</p>
            {visibleProjects.length === 0 ? (
              <p className="empty-list">
                {isVideo
                  ? 'Aucun montage pour l’instant. Choisissez une carte de départ ou décrivez votre vidéo.'
                  : 'Aucun projet pour l’instant. Choisissez une carte de départ ou décrivez votre idée.'}
              </p>
            ) : (
              <div className="project-list">
                {visibleProjects.map((project) => (
                  <button
                    type="button"
                    key={project.id}
                    className={`project-item${current?.id === project.id ? ' active' : ''}`}
                    onClick={() => void openProject(project)}
                    title={project.title}
                  >
                    <span className="dot" /><span className="name">{isVideo ? '▶ ' : '◇ '}{project.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-foot">
            {mode === 'demo'
              ? 'Mode démo : données en mémoire, paiement simulé.'
              : 'Projets synchronisés avec votre compte Supabase.'}
          </div>
        </aside>

        <div className="studio-main">
          {/* ------------ Composer ------------ */}
          <section className="composer">
            {error && <div className="alert alert-error">{error}</div>}
            {notice && <div className="alert alert-ok">{notice}</div>}

            <div>
              <h2>{current ? (isVideo ? 'Modifier ce montage' : 'Modifier ce site') : isVideo ? 'Décrivez votre vidéo' : 'Décrivez votre site'}</h2>
              <p className="hint">
                {current
                  ? isVideo
                    ? 'Changez la palette, le rythme, la durée, ajoutez ou retirez un plan. Le storyboard et l’aperçu animé sont régénérés ensemble.'
                    : 'Dites ce que vous voulez changer : couleurs, titre, nouvelle section… Chaque message crée une nouvelle version.'
                  : isVideo
                    ? 'Un sujet, une durée, une ambiance : Nimba découpe le film en plans et l’anime dans l’aperçu.'
                    : 'Un secteur, une ambiance, quelques détails : Nimba s’occupe du reste.'}
              </p>
            </div>

            <form className="prompt-box" onSubmit={onSubmit}>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={onPromptKeyDown}
                placeholder={
                  current
                    ? isVideo
                      ? 'Ex. : passe la palette en bleu et ajoute une scène de témoignage…'
                      : 'Ex. : passe la palette en vert et ajoute une section témoignages…'
                    : isVideo
                      ? 'Ex. : une pub de 15 secondes en 5 plans pour un restaurant…'
                      : 'Ex. : un site vitrine pour un restaurant de cuisine locale à Conakry…'
                }
                maxLength={4000}
                disabled={busy}
                aria-label={isVideo ? 'Description de la vidéo' : 'Description du site'}
              />
              <div className="prompt-actions">
                <span className="cost-note">⌘ / Ctrl + Entrée · 1 crédit</span>
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || prompt.trim().length < 5}>
                  {busy ? <><span className="spinner" /> Génération…</> : current ? 'Appliquer →' : isVideo ? 'Monter →' : 'Générer →'}
                </button>
              </div>
            </form>

            {current && (
              <div>
                <p className="sidebar-block-title">Modifications rapides</p>
                <div className="starter-grid">
                  {edits.map((edit) => (
                    <button type="button" key={edit} className="starter-card" disabled={busy} onClick={() => { setPrompt(edit); void generate(edit); }}>
                      <span className="start-icon">↻</span><span><strong>{edit}</strong></span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="sidebar-block-title">{current ? 'Autres idées de départ' : 'Commencer'}</p>
              <div className="starter-grid">
                {starters.map((starter) => (
                  <button
                    type="button"
                    key={starter.label}
                    className="starter-card"
                    disabled={busy}
                    onClick={() => { setPrompt(starter.prompt); void generate(starter.prompt); }}
                  >
                    <span className="start-icon">{starter.emoji}</span>
                    <span><strong>{starter.label}</strong><small>{starter.hint}</small></span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="sidebar-block-title">Historique</p>
              {history.length === 0 ? (
                <p className="empty-list">Les étapes de votre projet apparaîtront ici.</p>
              ) : (
                <div className="history-list">
                  {history.map((entry, index) => (
                    <div className="history-item" key={`${index}-${entry.text.slice(0, 12)}`}>
                      <div className="who">{entry.role === 'you' ? 'Vous' : 'Nimba'}</div>
                      <p>{entry.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ------------ Preview / Storyboard ------------ */}
          <section className="preview-panel">
            <div className="preview-toolbar">
              <div className="left">
                <div className="segmented">
                  <button type="button" className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>Aperçu</button>
                  {isVideo && (
                    <button type="button" className={tab === 'storyboard' ? 'active' : ''} onClick={() => setTab('storyboard')}>Storyboard</button>
                  )}
                  <button type="button" className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>Code</button>
                </div>
                {tab === 'preview' && !isVideo && (
                  <div className="segmented">
                    <button type="button" className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}>▣ Desktop</button>
                    <button type="button" className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}>▯ Mobile</button>
                  </div>
                )}
                {tab === 'preview' && isVideo && <span className="video-format-pill">▶ 16:9 · {storyboard ? durationText(storyboard.scenes) : '—'}</span>}
              </div>
              <div className="right">
                <button type="button" className="icon-btn" title="Rafraîchir l’aperçu" onClick={() => setFrameKey((key) => key + 1)} disabled={!current}>↻</button>
                <button type="button" className="icon-btn" title="Ouvrir dans un nouvel onglet" onClick={openInNewTab} disabled={!current}>↗</button>
                <button type="button" className="icon-btn" title="Copier le code HTML" onClick={() => void copyCode()} disabled={!current}>⧉</button>
                {isVideo && storyboard && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={exportStoryboard}>⇩ .md</button>
                )}
                <button type="button" className="btn btn-primary btn-sm" onClick={exportHtml} disabled={!current}>⇩ Exporter .html</button>
              </div>
            </div>

            <div className="preview-stage" style={{ position: 'relative' }}>
              {busy && (
                <div className="loading-overlay">
                  <div className="loading-card">
                    <div className="spinner" />
                    <p>{isVideo ? 'Découpage et animation de votre vidéo…' : aiEnabled ? 'L’IA compose votre site…' : 'Composition de votre site…'}</p>
                    <p style={{ marginTop: 4, fontSize: '0.76rem' }}>1 crédit débité, remboursé en cas d’échec</p>
                  </div>
                </div>
              )}
              {!current ? (
                <div className="preview-empty">
                  <div className="preview-empty-inner">
                    <div className="preview-empty-icon">{isVideo ? '▶' : '◫'}</div>
                    <h3>{isVideo ? 'Votre film apparaîtra ici' : 'Votre aperçu apparaîtra ici'}</h3>
                    <p>
                      {isVideo
                        ? 'Décrivez votre vidéo : vous obtiendrez un storyboard plan par plan et un aperçu animé 16:9 jouable, exportable en HTML.'
                        : 'Choisissez une carte de départ ou écrivez votre idée. Le rendu est isolé dans un iframe sandboxé, prêt à être exporté.'}
                    </p>
                  </div>
                </div>
              ) : tab === 'storyboard' && storyboard ? (
                <div className="storyboard-panel">
                  <div className="sb-head">
                    <div>
                      <span className="eyebrow">Storyboard</span>
                      <h2>{storyboard.title}</h2>
                      <p>{storyboard.style}</p>
                    </div>
                    <div className="sb-stats">
                      <span><strong>{storyboard.scenes.length}</strong> plans</span>
                      <span><strong>{durationText(storyboard.scenes)}</strong> durée</span>
                      <span><strong>16:9</strong> format</span>
                    </div>
                  </div>
                  <p className="sb-sound">♪ {storyboard.soundtrack}</p>
                  <div className="sb-scenes">
                    {storyboard.scenes.map((scene) => (
                      <article className="sb-scene" key={scene.id}>
                        <div className="sb-scene-top">
                          <span className="sb-num">{String(scene.id).padStart(2, '0')}</span>
                          <span className="sb-dur">{scene.duration} s · {scene.transition}</span>
                        </div>
                        <h3>{scene.title}</h3>
                        <p className="sb-visual">{scene.visual}</p>
                        <blockquote>« {scene.voiceOver} »</blockquote>
                        <div className="sb-palette">
                          <i style={{ background: scene.palette[0] }} />
                          <i style={{ background: scene.palette[1] }} />
                          <span>{scene.palette.join(' / ')}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : tab === 'code' ? (
                <pre className="code-view">{current.html}</pre>
              ) : (
                <div className={`iframe-wrap${!isVideo && device === 'mobile' ? ' mobile' : ''}${isVideo ? ' video' : ''}`}>
                  <iframe
                    key={`${current.id}-${current.updatedAt}-${frameKey}`}
                    title={`Aperçu de ${current.title}`}
                    srcDoc={current.html}
                    sandbox="allow-scripts allow-forms allow-popups allow-modals"
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
