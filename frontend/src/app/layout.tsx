// Import du type Metadata fourni par Next.js pour typer les métadonnées de la page.
import type { Metadata } from 'next';
// Import du fichier de styles globaux appliqué à toute l'application.
import './globals.css';

/**
 * Métadonnées globales du site pour SEO
 * Définit le titre, la description et les tags OpenGraph
 */
export const metadata: Metadata = {
  // Titre affiché dans l'onglet du navigateur et utilisé par les moteurs de recherche.
  title: 'Pure Graine - Détection ZEN dans les céréales',
  // Description SEO courte du site.
  description:
    'Projet iGEM Sorbonne Université dédié à la détection rapide de la zéaralénone par aptamère, toehold switch fluorescent et LAMP Fusarium.',
  // Mots-clés associés au sujet du site.
  keywords: [
    // Mot-clé lié à la toxine cible.
    'zéaralénone',
    // Mot-clé lié au nom court de la mycotoxine.
    'ZEN',
    // Mot-clé lié au mécanisme de détection principal.
    'aptamère toehold switch',
    // Mot-clé lié à la source biologique ciblée.
    'Fusarium céréales',
  ],
  // Métadonnées utilisées lors du partage du site sur les réseaux sociaux.
  openGraph: {
    // Titre OpenGraph affiché dans les aperçus de partage.
    title: 'Pure Graine - Détection ZEN dans les céréales',
    // Description OpenGraph affichée dans les aperçus de partage.
    description:
      'Identifier rapidement la zéaralénone ou sa source grâce à un système aptamère Z0/Z1, un toehold switch fluorescent et une piste LAMP ciblant Fusarium.',
    // Type de contenu OpenGraph: ici un site web.
    type: 'website',
  },
  // Indications données aux robots d'indexation.
  robots: {
    // Autorise l'indexation de la page.
    index: true,
    // Autorise les robots à suivre les liens de la page.
    follow: true,
  },
};

/**
 * Configuration du viewport pour responsive design
 */
export const viewport = {
  // Indique que la largeur logique doit suivre la largeur de l'appareil.
  width: 'device-width',
  // Définit le zoom initial à 100%.
  initialScale: 1,
  // Autorise l'utilisateur à zoomer jusqu'à 500%.
  maximumScale: 5,
};

/**
 * Layout racine de l'application
 * Enveloppe tous les contenus avec la structure HTML de base
 * @param children - Contenu des pages
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Retourne la structure HTML commune à toutes les pages de l'application.
  return (
    // Définit la langue principale du document pour l'accessibilité et le SEO.
    <html lang="fr" className="preload-scroll-lock" suppressHydrationWarning>
      {/* En-tête technique du document HTML. */}
      <head>
        {/* Encodage UTF-8 pour les caractères spéciaux */}
        <meta charSet="utf-8" />
        {/* Configuration du viewport pour mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Masque brièvement le body pendant le verrouillage initial du scroll pour éviter tout flash de position restaurée. */}
        <style>{`
          html.preload-scroll-lock body {
            visibility: hidden;
          }
        `}</style>
        {/* Coupe la restauration automatique du scroll avant l'hydratation React pour éviter un flash en bas de page. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if ('scrollRestoration' in window.history) {
                  window.history.scrollRestoration = 'manual';
                }

                if (window.location.hash) {
                  window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }

                window.scrollTo(0, 0);

                var revealAtTop = function () {
                  window.scrollTo(0, 0);
                  document.documentElement.classList.remove('preload-scroll-lock');
                };

                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', function () {
                    requestAnimationFrame(revealAtTop);
                  }, { once: true });
                } else {
                  requestAnimationFrame(revealAtTop);
                }
              })();
            `,
          }}
        />
      </head>
      {/* Body contenant le contenu de la page */}
      {/* children représente la page active injectée par le routeur App Router de Next.js. */}
      <body>{children}</body>
    </html>
  );
}
