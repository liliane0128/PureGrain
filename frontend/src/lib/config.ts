/**
 * Configuration globale du site
 * Contient les informations de base et les liens externes
 */

// Configuration principale du site
export const siteConfig = {
  // Nom du site affiché dans le titre
  name: 'Pure Graine',
  // Description courte pour SEO
  description: 'Détection rapide de la zéaralénone dans les céréales',
  // URL de base du site
  url: 'https://puregraine.bio',
  // Image pour les réseaux sociaux
  ogImage: 'https://puregraine.bio/og-image.png',
  // Liens vers les réseaux sociaux
  links: {
    // URL du compte Twitter/X associé au projet.
    twitter: 'https://twitter.com/puregraine',
    // URL du dépôt GitHub associé au projet.
    github: 'https://github.com/Biozinga/youthforbioeconomy-2026',
    // URL de la page LinkedIn associée au projet.
    linkedin: 'https://linkedin.com/company/puregraine',
  },
};

// Navigation principale du site
export const navigation = [
  // Lien vers le haut de la page d'accueil.
  { label: 'Accueil', href: '#top' },
  // Lien vers la section présentant les pistes scientifiques.
  { label: 'Science', href: '#benefits' },
  // Lien vers la section expliquant le signal fluorescent.
  { label: 'Détection', href: '#conversion' },
];
