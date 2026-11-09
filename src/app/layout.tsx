import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Header } from '@/components/Header';
import { SessionProvider } from '@/components/SessionContext';

export const metadata: Metadata = {
  title: 'Nimba — Atelier IA : sites et vidéos en une phrase',
  description:
    'Décrivez votre projet en français : Nimba builde un site complet ou monte une vidéo storyboardée, vous l’affinez dans l’aperçu live et exportez le code. 3 crédits offerts à l’inscription.',
  openGraph: {
    title: 'Nimba — Atelier IA',
    description: 'D’une idée à un site web ou à un montage vidéo, en quelques secondes.',
    type: 'website',
    locale: 'fr_FR',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SessionProvider>
          <Header />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
