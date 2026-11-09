/**
 * Contenu juridique de Nimba AI.
 * Les CGU/CGV ci-dessous sont la reproduction fidèle du texte fourni par l'éditeur
 * (dernière mise à jour : 25 septembre 2026). La politique de confidentialité
 * décrit le traitement réellement mis en œuvre par cette application.
 */

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export const CGU_UPDATED_AT = '25 septembre 2026';
export const CONTACT_EMAIL = 'optimaworksgn@gmail.com';

/** Le marqueur [[EMAIL]] est remplacé par un lien mailto à l'affichage. */
export const CGU_INTRO =
  "Les présentes Conditions Générales régissent l'utilisation de la plateforme Nimba AI, " +
  'éditée par Optima Works [[EMAIL]]. Conakry. En créant un compte, vous acceptez sans réserve ' +
  "l'intégralité de ces conditions.";

export const CGU_SECTIONS: LegalSection[] = [
  {
    id: 'objet',
    title: "1. Objet & accès au service",
    paragraphs: [
      "Nimba AI est une plateforme SaaS qui génère des angles publicitaires, scripts vidéo 9:16, copies marketing prêtes-à-coller pour Meta Ads, TikTok Ads et Google Ads, un calendrier de publication, ainsi que des prompts IA (Midjourney, DALL-E, Firefly, Arena AI) pour la création de visuels multi-formats (1:1, 9:16, 16:9), à partir des informations fournies par l'utilisateur.",
      "L'accès au service nécessite la création d'un compte avec une adresse e-mail valide. L'utilisateur est responsable de la confidentialité de ses identifiants.",
    ],
  },
  {
    id: 'credits',
    title: "2. Crédits : fonctionnement & conditions d'utilisation",
    paragraphs: [
      "La génération d'une campagne complète (5 angles marketing, scripts 9:16, copies Meta/TikTok/Google, prompts IA pour visuels 3 formats, calendrier de publication) consomme 1 crédit.",
      "L'offre Free inclut 3 crédits offerts, sans carte bancaire. Les offres Starter (20 crédits/mois) et Pro (60 crédits/mois) sont des abonnements mensuels. La Recharge rapide (5 crédits) est un achat unique, valable 12 mois.",
      "Les crédits mensuels non consommés ne sont pas reportés. Les crédits sont strictement personnels, non transférables et non échangeables contre des espèces.",
    ],
  },
  {
    id: 'abonnements',
    title: '3. Abonnements : renouvellement & résiliation',
    paragraphs: [
      "Les abonnements Starter et Pro sont renouvelés automatiquement chaque mois à la date anniversaire. L'utilisateur peut annuler à tout moment depuis son espace : l'abonnement reste actif jusqu'à la fin de la période payée.",
      "Tout mois entamé est dû. En cas d'annulation, les crédits restants restent utilisables jusqu'à expiration de la période en cours.",
    ],
  },
  {
    id: 'propriete-intellectuelle',
    title: '4. Propriété intellectuelle des rendus',
    paragraphs: [
      "L'utilisateur détient l'intégralité des droits sur les contenus générés à partir de ses propres briefs (hooks, scripts, copies), y compris pour un usage commercial au profit de ses clients.",
      "La plateforme Nimba AI, son moteur de génération, ses modèles, son design et sa marque restent la propriété exclusive de MonWe Infinity LLC. Toute reproduction, ingénierie inverse ou extraction automatisée du service est interdite.",
    ],
  },
  {
    id: 'utilisation-acceptable',
    title: '5. Utilisation acceptable',
    paragraphs: [
      "L'utilisateur s'engage à ne pas générer de contenus illicites, trompeurs, diffamatoires, contrefaisants ou contraires à l'ordre public. MonWe Infinity LLC peut suspendre tout compte en infraction, sans remboursement.",
    ],
  },
  {
    id: 'responsabilite',
    title: '6. Responsabilité & disponibilité',
    paragraphs: [
      "Le service est fourni « en l'état ». MonWe Infinity LLC s'efforce d'assurer une disponibilité maximale mais ne garantit pas l'absence d'interruptions. La responsabilité de l'éditeur est limitée aux montants versés par l'utilisateur au cours des 12 derniers mois.",
      "L'utilisateur reste seul responsable de la vérification et de l'usage des contenus générés, notamment de leur conformité publicitaire.",
    ],
  },
  {
    id: 'droit-applicable',
    title: '7. Droit applicable & juridiction',
    paragraphs: [
      "Les présentes conditions sont régies par le droit de l'État du Nouveau-Mexique, États-Unis. Tout litige relatif à l'interprétation ou à l'exécution des présentes sera soumis à la compétence exclusive des Tribunaux du Nouveau-Mexique, États-Unis (State of New Mexico, USA).",
    ],
  },
  {
    id: 'contenu-publicitaire',
    title: 'Responsabilité du contenu publicitaire',
    paragraphs: [
      "Les contenus générés sont des propositions rédactionnelles produites par une intelligence artificielle. Nimba AI n'invente pas de chiffres, d'avis clients, de garanties ni de délais : les champs à compléter apparaissent entre [crochets].",
      "L'utilisateur reste seul responsable de la vérification, de l'exactitude et de la conformité légale et publicitaire (Meta, TikTok, Google, droit de la consommation) de tout contenu qu'il diffuse. Il doit remplacer les [crochets] par des informations réelles et vérifiables.",
    ],
  },
  {
    id: 'parrainage',
    title: 'Programme de parrainage',
    paragraphs: [
      "Chaque utilisateur peut inviter des personnes via son lien personnel. Le filleul reçoit 2 crédits offerts à l'inscription. Le parrain reçoit, une seule fois par filleul, des crédits équivalents à 20 % des crédits de son premier achat réussi (minimum 3), sans limite du nombre de filleuls.",
      "Les récompenses sont exclusivement des crédits, non échangeables contre de l'argent. L'auto-parrainage, la création de faux comptes ou tout autre abus entraînent l'annulation des récompenses et la suspension possible du compte. En cas de remboursement de l'achat du filleul, la récompense correspondante peut être retirée. Nimba AI peut modifier ou suspendre le programme à tout moment.",
    ],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'responsable',
    title: '1. Responsable du traitement',
    paragraphs: [
      `Le traitement des données personnelles collectées sur Nimba AI est assuré par Optima Works, Conakry (Guinée), contact : [[EMAIL]].`,
    ],
  },
  {
    id: 'donnees',
    title: '2. Données collectées',
    paragraphs: [
      "Nous collectons uniquement les données nécessaires au service : l'adresse e-mail renseignée à l'inscription, les identifiants de session, le solde de crédits, les références de commande, ainsi que les projets que vous créez (briefs, sites HTML, storyboards, exports).",
      "Les mots de passe sont pris en charge par le service d'authentification Supabase et ne sont jamais stockés en clair dans l'application. Aucune donnée de paiement (numéro de carte, compte Mobile Money) n'est collectée par Nimba AI : elle est traitée directement par le prestataire de paiement.",
    ],
  },
  {
    id: 'finalites',
    title: '3. Finalités & base légale',
    paragraphs: [
      "Ces données sont utilisées pour : créer et authentifier votre compte, attribuer et débiter les crédits, générer et conserver vos projets, traiter les commandes, assurer la sécurité du service et répondre à vos demandes. La base légale est l'exécution du contrat conclu par l'acceptation des CGU/CGV.",
    ],
  },
  {
    id: 'cookies',
    title: '4. Cookies & stockage local',
    paragraphs: [
      "Nimba AI utilise exclusivement des cookies de session strictement nécessaires, httpOnly : nimba_session (mode démonstration), nimba_access_token et nimba_refresh_token (authentification Supabase). Ils servent uniquement à maintenir votre connexion et à protéger votre compte.",
      "Aucun cookie publicitaire, aucun traceur tiers et aucun outil de mesure d'audience ne sont déposés. L'aperçu des projets est isolé dans un iframe sandboxé qui ne peut pas accéder aux données de votre session.",
    ],
  },
  {
    id: 'destinataires',
    title: '5. Destinataires & sous-traitants',
    paragraphs: [
      "Selon la configuration, vos données peuvent être traitées par : Supabase (authentification et base de données), Anthropic (génération par IA, uniquement le brief et le contenu que vous soumettez), et le prestataire de paiement une fois l'adaptateur branché. En mode démonstration, les données restent en mémoire sur le serveur et ne sont transmises à aucun tiers.",
      "Nous ne vendons ni ne louons vos données personnelles. Aucune décision automatisée produisant un effet juridique n'est prise à votre égard.",
    ],
  },
  {
    id: 'conservation',
    title: '6. Durée de conservation',
    paragraphs: [
      "Les données du compte et les projets sont conservés tant que le compte est actif, puis supprimés sur demande ou après une période d'inactivité prolongée. Les journaux techniques et les références de commande sont conservés au maximum 12 mois, pour les besoins de sécurité et de comptabilité.",
    ],
  },
  {
    id: 'droits',
    title: '7. Vos droits',
    paragraphs: [
      "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données. Vous pouvez également demander la suppression de votre compte et de ses projets. Ces demandes s'exercent par simple e-mail à [[EMAIL]] ; une réponse est apportée dans un délai raisonnable.",
    ],
  },
  {
    id: 'securite',
    title: '8. Sécurité',
    paragraphs: [
      "Les échanges sont chiffrés (HTTPS), les accès à la base sont protégés par des politiques RLS, les clés sensibles restent côté serveur, et les opérations sur les crédits sont atomiques. Vous restez responsable de la confidentialité de vos identifiants, comme le rappellent les CGU.",
    ],
  },
  {
    id: 'modifications',
    title: '9. Modifications & contact',
    paragraphs: [
      "La présente politique peut être mise à jour pour refléter l'évolution du service ; la date de dernière mise à jour figure en tête de page. Pour toute question relative à vos données : [[EMAIL]].",
    ],
  },
];
