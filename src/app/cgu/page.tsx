import type { Metadata } from 'next';
import { LegalArticle } from '@/components/LegalArticle';
import { CGU_INTRO, CGU_SECTIONS, CGU_UPDATED_AT } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Conditions Générales d’Utilisation & de Vente — Nimba AI',
  description: `Conditions générales d'utilisation et de vente de la plateforme Nimba AI. Dernière mise à jour : ${CGU_UPDATED_AT}.`,
};

export default function CguPage() {
  return (
    <LegalArticle
      title="Conditions Générales d’Utilisation & de Vente"
      updatedAt={CGU_UPDATED_AT}
      intro={CGU_INTRO}
      sections={CGU_SECTIONS}
    />
  );
}
