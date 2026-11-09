import type { Metadata } from 'next';
import { LegalArticle } from '@/components/LegalArticle';
import { CGU_UPDATED_AT, PRIVACY_SECTIONS } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Nimba AI',
  description: 'Données collectées, cookies, destinataires, conservation et droits des utilisateurs de Nimba AI.',
};

export default function ConfidentialitePage() {
  return (
    <LegalArticle
      title="Politique de confidentialité"
      updatedAt={CGU_UPDATED_AT}
      intro="La présente politique décrit quelles données sont collectées par Nimba AI, pourquoi, combien de temps elles sont conservées et comment exercer vos droits. Elle complète les Conditions Générales d’Utilisation & de Vente."
      sections={PRIVACY_SECTIONS}
    />
  );
}
