/**
 * Types TypeScript pour l'application
 * Définit les interfaces et types utilisés dans le projet
 */

// Interface pour un utilisateur
export interface User {
  // Identifiant unique de l'utilisateur
  id: string;
  // Nom complet de l'utilisateur
  name: string;
  // Adresse email de l'utilisateur
  email: string;
}

// Interface pour un élément de navigation
export interface NavItem {
  // Texte affiché dans le menu
  label: string;
  // URL de destination du lien
  href: string;
}
