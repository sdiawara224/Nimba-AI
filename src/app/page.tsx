import Link from 'next/link';
import { PricingCards } from '@/components/PricingCards';
import { FREE_CREDITS } from '@/lib/plans';

const STEPS = [
  {
    title: 'Décrivez votre idée',
    text: 'Un restaurant à Conakry, une pub de 15 secondes, une landing SaaS : écrivez simplement ce que vous voulez, en français.',
  },
  {
    title: 'Regardez le résultat apparaître',
    text: 'Site HTML complet ou storyboard animé 16:9 : l’aperçu live s’affiche dans un iframe isolé, sans aucune dépendance externe.',
  },
  {
    title: 'Affinez et exportez',
    text: 'Changez une couleur, un titre, un plan de montage. Chaque message itère sur le même projet, puis exportez le code.',
  },
];

const FEATURES = [
  { icon: '✦', title: 'Génération en français', text: 'Un brief en langage naturel suffit : secteur, palette et contenu sont déduits automatiquement.' },
  { icon: '◫', title: 'Aperçu live isolé', text: 'Le rendu s’ouvre dans un iframe sandboxé : le code généré ne peut pas toucher à l’application.' },
  { icon: '↻', title: 'Modifications successives', text: 'Changez la couleur, le titre, ajoutez une section : l’historique garde chaque version.' },
  { icon: '⇩', title: 'Export .html', text: 'Repartez avec un fichier unique, sans dépendance, hébergeable n’importe où.' },
  { icon: '◈', title: 'Crédits transparents', text: `${FREE_CREDITS} crédits offerts à l’inscription, 1 crédit par génération, remboursé si l’IA échoue.` },
  { icon: '⚿', title: 'Paiement sécurisé', text: 'Commande côté serveur et crédits ajoutés une seule fois, à la confirmation du webhook.' },
  { icon: '▶', title: 'Deuxième atelier : vidéo', text: 'Basculez de « Site » à « Vidéo » dans le même studio, avec le même solde de crédits et le même historique.' },
  { icon: '▤', title: 'Storyboard plan par plan', text: 'Chaque montage est découpé en plans datés : visuel, voix off, durée, transition et palette, exportables en Markdown.' },
  { icon: '⏯', title: 'Aperçu animé 16:9', text: 'Un lecteur autonome joue les scènes avec transitions, barre de progression, sous-titres et contrôles — exportable en .html.' },
];

const START_CARDS = [
  { icon: '◫', title: 'Créer une page de destination', hint: 'Créez une page d’accueil élégante en une phrase.' },
  { icon: '🛍️', title: 'Concevoir une boutique', hint: 'Une vitrine produit prête à être exportée.' },
  { icon: '🎨', title: 'Lancer un portfolio', hint: 'Présentez vos projets avec un design soigné.' },
  { icon: '▶', title: 'Monter une pub vidéo', hint: 'Storyboard et aperçu animé 16:9 jouable.' },
  { icon: '⏯', title: 'Créer un teaser produit', hint: 'Plans, voix off, transitions et durées.' },
  { icon: '🎪', title: 'Créer un site d’événement', hint: 'Programme, billetterie et appel à l’action.' },
];

const FAQ = [
  {
    q: 'Combien coûte une génération ?',
    a: 'Un crédit par génération ou modification. L’inscription offre 3 crédits, et les packs démarrent à 5 000 FCFA pour 10 crédits. Aucun abonnement.',
  },
  {
    q: 'Que se passe-t-il si la génération échoue ?',
    a: 'Le crédit est débité juste avant l’appel à l’IA, puis automatiquement remboursé si l’appel ou l’enregistrement échoue. Vous ne payez jamais pour une erreur.',
  },
  {
    q: 'Le site généré m’appartient-il ?',
    a: 'Oui. Vous pouvez exporter le code HTML à tout moment et l’héberger où vous voulez. Le document est autonome, sans CDN ni dépendance externe.',
  },
  {
    q: 'Que produit l’atelier « Vidéo » ?',
    a: 'Un storyboard structuré (plans, durées, voix off, transitions, palettes) et un aperçu animé 16:9 autonome, jouable dans le navigateur. Vous exportez le storyboard en .md et le film animé en .html. Il ne s’agit pas d’un fichier MP4 : aucun service de rendu externe n’est requis.',
  },
  {
    q: 'Les deux ateliers consomment-ils les mêmes crédits ?',
    a: 'Oui : un crédit par génération ou modification, que ce soit pour un site ou pour un montage vidéo, avec le même remboursement automatique en cas d’échec.',
  },
  {
    q: 'Puis-je payer par Mobile Money ?',
    a: 'La logique de commande et de webhook est prête ; il reste à brancher l’adaptateur de votre prestataire dans src/lib/payments.ts (Mobile Money, Wave, cartes…).',
  },
];

export default function HomePage() {
  return (
    <main>
      {/* ---------------- HERO ---------------- */}
      <section className="hero">
        <div className="container">
          <div className="gc-pill-wrap">
            <span className="gc-pill">✦ 1 crédit = 1 génération · sites · vidéos · exports</span>
          </div>
        </div>
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="badge"><span className="badge-dot" /> 2 ateliers · {FREE_CREDITS} crédits offerts à l’inscription</span>
            <h1 className="hero-title">
              Décrivez votre idée,<br />
              <span className="gradient-text">on s'occupe du reste.</span>
            </h1>
            <p className="hero-sub">
              Nimba fait deux choses : il <strong>build</strong> votre site web complet, et il <strong>monte</strong> votre vidéo sous forme de storyboard animé.
              Ajustez l’un ou l’autre à voix haute dans l’atelier, puis repartez avec le code.
            </p>
            <div className="hero-actions">
              <Link href="/studio" className="btn btn-primary btn-lg">Ouvrir l’atelier <span aria-hidden="true">→</span></Link>
              <Link href="#fonctionnement" className="btn btn-secondary btn-lg">Voir comment ça marche</Link>
            </div>
            <p className="hero-note"><strong>Sans carte bancaire</strong> · Aperçu live site & vidéo · Export .html et .md</p>
          </div>

          <div className="preview-window" aria-hidden="true">
            <div className="window-bar"><i /><i /><i /><span>nimba.app/studio</span></div>
            <div className="window-body">
              <div className="window-side">
                <span /><span className="small" /><span /><span className="small" /><span />
              </div>
              <div className="window-main">
                <div className="window-prompt"><b>Vous :</b> « Un site vitrine pour un restaurant de cuisine locale, avec une palette orangée et une section réservation »</div>
                <div className="window-site">
                  <div className="window-site-inner">
                    <div className="pill">Restaurant · Conakry</div>
                    <h4>Le goût des bons moments.</h4>
                    <p>Une carte courte, des produits choisis avec soin et une salle où l’on aime revenir.</p>
                    <span className="window-fake-btn">Réserver une table →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container gc-steps">
          <div className="gc-step"><span className="gc-step-icon">🔗</span><div><strong>1. Décrivez</strong><small>Texte, brief ou idée</small></div></div>
          <div className="gc-step"><span className="gc-step-icon">✦</span><div><strong>2. Générez</strong><small>Site HTML ou storyboard animé</small></div></div>
          <div className="gc-step"><span className="gc-step-icon">🚀</span><div><strong>3. Publiez</strong><small>Copiez, exportez, lancez</small></div></div>
        </div>
      </section>

      {/* ---------------- TRUST ---------------- */}
      <div className="trust">
        <div className="container trust-inner">
          <span>Pensé pour les créateurs francophones</span>
          <div className="trust-stats">
            <div><strong className="gradient-text">2</strong> <span className="muted">ateliers</span></div>
            <div><strong className="gradient-text">1 crédit</strong> <span className="muted">/ génération</span></div>
            <div><strong className="gradient-text">100 %</strong> <span className="muted">HTML autonome</span></div>
            <div><strong className="gradient-text">FCFA</strong> <span className="muted">prix locaux</span></div>
            <div><strong className="gradient-text">0</strong> <span className="muted">abonnement</span></div>
          </div>
        </div>
      </div>

      {/* ---------------- STEPS ---------------- */}
      <section className="section container" id="fonctionnement">
        <div className="section-head">
          <span className="eyebrow">Fonctionnement</span>
          <h2 className="section-title">Trois étapes, de l’idée au fichier.</h2>
          <p>Pas de builder compliqué, pas de bloc à empiler. Vous décrivez, Nimba construit, vous affinez.</p>
        </div>
        <div className="steps">
          {STEPS.map((step) => (
            <div className="step" key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="section container" id="fonctions" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <span className="eyebrow">L’atelier</span>
          <h2 className="section-title">Deux métiers, une seule fenêtre.</h2>
          <p>Une interface type Arena : zone de prompt, cartes de départ, historique et aperçu en direct — pour le site comme pour la vidéo.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- DEUX ATELIERS ---------------- */}
      <section className="section container" id="ateliers" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <span className="eyebrow">Les 2 ateliers</span>
          <h2 className="section-title">Le build. Et le montage.</h2>
          <p>Un seul compte, un seul solde de crédits, deux façons de donner forme à une idée.</p>
        </div>
        <div className="duo-grid">
          <article className="duo-card">
            <div className="duo-visual duo-site" aria-hidden="true">
              <div className="duo-window"><i /><i /><i /></div>
              <div className="duo-lines"><span /><span /><span /></div>
              <div className="duo-cta" />
            </div>
            <div className="duo-body">
              <span className="duo-tag">◇ Atelier 01 — Build</span>
              <h3>Un site web complet</h3>
              <p>Un document HTML autonome et responsive, avec contenu rédigé, sections, palette et design. Modifiez-le par messages successifs et exportez le <code>.html</code>.</p>
              <ul>
                <li>Secteur déduit de votre brief</li>
                <li>Aperçu desktop / mobile sandboxé</li>
                <li>Export sans CDN ni dépendance</li>
              </ul>
            </div>
          </article>
          <article className="duo-card">
            <div className="duo-visual duo-video" aria-hidden="true">
              <span className="duo-play">▶</span>
              <div className="duo-timeline"><i /><i /><i /><i /><i /></div>
              <div className="duo-progress" />
            </div>
            <div className="duo-body">
              <span className="duo-tag">▶ Atelier 02 — Montage</span>
              <h3>Une vidéo storyboardée</h3>
              <p>Un découpage plan par plan (durées, visuels, voix off, transitions, palettes) et un aperçu animé 16:9 jouable. Export <code>.md</code> et <code>.html</code>.</p>
              <ul>
                <li>3 à 8 plans, durée et rythme ajustables</li>
                <li>Lecteur avec progression et sous-titres</li>
                <li>Modifications : couleur, plans, durée, titre</li>
              </ul>
            </div>
          </article>
        </div>
      </section>

      {/* ---------------- COMMENCER (cartes type Arena) ---------------- */}
      <section className="section container" id="commencer" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <span className="eyebrow">Commencer</span>
          <h2 className="section-title">Que souhaitez-vous faire ?</h2>
          <p>Choisissez un point de départ : vous n’aurez plus qu’à préciser votre idée dans l’atelier.</p>
        </div>
        <div className="commencer-grid">
          {START_CARDS.map((card) => (
            <Link href="/studio" className="start-card" key={card.title}>
              <span className="start-icon">{card.icon}</span>
              <span><strong>{card.title}</strong><small>{card.hint}</small></span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- PRICING ---------------- */}
      <section className="section container" id="tarifs">
        <div className="section-head">
          <span className="eyebrow">Tarifs</span>
          <h2 className="section-title">Payez ce que vous créez.</h2>
          <p>Des crédits à l’unité, en FCFA, sans engagement. Un crédit = une génération ou une modification.</p>
        </div>
        <PricingCards />
        <p className="muted" style={{ fontSize: '0.82rem', marginTop: 18 }}>
          Les crédits n’expirent pas. Le paiement est validé côté serveur et les crédits ne sont ajoutés qu’une seule fois par commande.
        </p>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="section container" id="faq" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <span className="eyebrow">Questions fréquentes</span>
          <h2 className="section-title">Les réponses utiles.</h2>
        </div>
        <div className="faq">
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container" style={{ paddingBottom: 40 }}>
        <div className="cta-band">
          <span className="eyebrow" style={{ justifyContent: 'center' }}>Prêt à créer</span>
          <h2>Et si votre prochain projet commençait par une phrase ?</h2>
          <p>{FREE_CREDITS} crédits vous attendent : de quoi builder un site, monter une vidéo et exporter les deux.</p>
          <Link href="/studio" className="btn btn-primary btn-lg">Lancer mon premier projet <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>© {new Date().getFullYear()} Nimba · Atelier IA — fait pour la Guinée et au-delà.</span>
          <div className="footer-links">
            <Link href="/studio">Studio</Link>
            <Link href="/#tarifs">Tarifs</Link>
            <Link href="/cgu">Conditions d’utilisation</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/confidentialite#cookies">Cookies</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
