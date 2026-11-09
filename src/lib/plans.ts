/** Catalogue des packs de crédits. Ajustez librement prix et quantités ici. */

export type PlanId = 'decouverte' | 'createur' | 'studio';

export interface Plan {
  id: PlanId;
  name: string;
  credits: number;
  /** Montant principal, en francs guinéens (GNF). */
  priceGnf: number;
  tagline: string;
  features: string[];
  popular?: boolean;
}

/**
 * Taux INDICATIF utilisé pour convertir l'ancien catalogue FCFA en GNF / $.
 *
 *   1 $ ≈ 575 FCFA et 1 $ ≈ 8 650 GNF  →  1 FCFA ≈ 15,04 GNF
 *
 * Les montants ci-dessous sont les anciens prix (5 000 / 15 000 / 35 000 FCFA)
 * convertis puis arrondis au multiple de 5 000 GNF le plus proche. Ce n'est
 * PAS un taux bancaire : remplacer par les prix contractuels avant mise en ligne.
 */
export const GNF_PER_USD = 8650;
export const FCFA_PER_USD = 575;
export const GNF_PER_FCFA = GNF_PER_USD / FCFA_PER_USD;

/** Crédits offerts à l'inscription (trigger SQL `handle_new_user`). */
export const FREE_CREDITS = 3;

export const PLANS: Plan[] = [
  {
    id: 'decouverte',
    name: 'Découverte',
    credits: 10,
    priceGnf: 75000,
    tagline: 'Pour tester une idée et itérer tranquillement.',
    features: ['10 générations ou modifications', 'Aperçu live et export .html', 'Historique de projets', 'Aucun abonnement'],
  },
  {
    id: 'createur',
    name: 'Créateur',
    credits: 40,
    priceGnf: 225000,
    tagline: 'Le pack des projets que l’on mène jusqu’au bout.',
    features: ['40 générations ou modifications', 'Aperçu live et export .html', 'Historique illimité', 'Économisez 25 % par crédit'],
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    credits: 120,
    priceGnf: 525000,
    tagline: 'Pour les agences et les équipes qui produisent chaque jour.',
    features: ['120 générations ou modifications', 'Aperçu live et export .html', 'Historique illimité', 'Économisez 40 % par crédit'],
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

/** `75 000 GNF` — espaces insécables remplacés par des espaces simples. */
export function formatGnf(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount).replace(/\u202f/g, ' ')} GNF`;
}

/** Équivalent dollar indicatif, calculé à partir du montant GNF. */
export function formatUsd(amountGnf: number): string {
  const usd = amountGnf / GNF_PER_USD;
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd)} $`;
}

/** Affichage combiné : `75 000 GNF · 8,67 $`. */
export function formatPrice(amountGnf: number): string {
  return `${formatGnf(amountGnf)} · ${formatUsd(amountGnf)}`;
}
