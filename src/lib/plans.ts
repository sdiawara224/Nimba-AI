/** Catalogue des packs de crédits. Ajustez librement prix et quantités ici. */

export type PlanId = 'decouverte' | 'createur' | 'studio';

export interface Plan {
  id: PlanId;
  name: string;
  credits: number;
  priceFcfa: number;
  tagline: string;
  features: string[];
  popular?: boolean;
}

/** Crédits offerts à l'inscription (trigger SQL `handle_new_user`). */
export const FREE_CREDITS = 3;

export const PLANS: Plan[] = [
  {
    id: 'decouverte',
    name: 'Découverte',
    credits: 10,
    priceFcfa: 5000,
    tagline: 'Pour tester une idée et itérer tranquillement.',
    features: ['10 générations ou modifications', 'Aperçu live et export .html', 'Historique de projets', 'Aucun abonnement'],
  },
  {
    id: 'createur',
    name: 'Créateur',
    credits: 40,
    priceFcfa: 15000,
    tagline: 'Le pack des projets que l’on mène jusqu’au bout.',
    features: ['40 générations ou modifications', 'Aperçu live et export .html', 'Historique illimité', 'Économisez 25 % par crédit'],
    popular: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    credits: 120,
    priceFcfa: 35000,
    tagline: 'Pour les agences et les équipes qui produisent chaque jour.',
    features: ['120 générations ou modifications', 'Aperçu live et export .html', 'Historique illimité', 'Économisez 40 % par crédit'],
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((plan) => plan.id === id);
}

export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount).replace(/\u202f/g, ' ')} FCFA`;
}
