import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { CONTACT_EMAIL, type LegalSection } from '@/lib/legal';

function Paragraph({ text }: { text: string }) {
  const parts = text.split('[[EMAIL]]');
  if (parts.length === 1) return <p>{text}</p>;
  return (
    <p>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <a className="legal-link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          )}
        </Fragment>
      ))}
    </p>
  );
}

export function LegalArticle({
  title,
  updatedAt,
  intro,
  sections,
  children,
}: {
  title: string;
  updatedAt: string;
  intro?: string;
  sections: LegalSection[];
  children?: ReactNode;
}) {
  return (
    <main className="legal-shell">
      <div className="container legal-inner">
        <Link href="/" className="legal-back">← Retour à l’accueil</Link>

        <header className="legal-header">
          <span className="eyebrow">Nimba AI · Informations légales</span>
          <h1>{title}</h1>
          <p className="legal-updated">Dernière mise à jour : {updatedAt}</p>
          {intro && <div className="legal-intro"><Paragraph text={intro} /></div>}
        </header>

        <div className="legal-grid">
          <aside className="legal-toc">
            <p className="sidebar-block-title">Sommaire</p>
            <ol>
              {sections.map((section) => (
                <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
              ))}
            </ol>
            <div className="legal-contact">
              <span>Une question ?</span>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </div>
          </aside>

          <article className="legal-content">
            {sections.map((section) => (
              <section id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph, index) => (
                  <Paragraph key={index} text={paragraph} />
                ))}
              </section>
            ))}
            {children}
          </article>
        </div>

        <footer className="legal-footer">
          <span>© {new Date().getFullYear()} Nimba AI · Optima Works, Conakry.</span>
          <div className="footer-links">
            <Link href="/cgu">CGU / CGV</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/confidentialite#cookies">Cookies</Link>
            <Link href="/">Accueil</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
