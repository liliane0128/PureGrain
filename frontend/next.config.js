// Annotation JSDoc qui donne à l'éditeur le type attendu pour la configuration Next.js.
/** @type {import('next').NextConfig} */
// Objet de configuration lu automatiquement par Next.js au démarrage et au build.
const nextConfig = {
  // Active le mode strict de React pour détecter plus tôt les comportements problématiques en développement.
  reactStrictMode: true,

  // Configure l'optimisation des images servies par le composant next/image.
  images: {
    // Formats modernes que Next.js peut générer pour réduire le poids des images.
    formats: ['image/avif', 'image/webp'],
    // Largeurs utilisées pour générer les variantes responsive des grandes images.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Largeurs utilisées pour générer les variantes de petites images ou icônes.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // false signifie que Next.js optimise les images au lieu de les servir telles quelles.
    unoptimized: false,
  },

  // Fonction asynchrone qui déclare les en-têtes HTTP ajoutés aux réponses du site.
  async headers() {
    // Retourne la liste des règles d'en-têtes appliquées par Next.js.
    return [
      // Règle appliquée aux vidéos statiques lourdes pour éviter les rechargements répétés.
      {
        // Motif qui cible les fichiers vidéo servis depuis public/videos.
        source: '/videos/:path*',
        // Liste des en-têtes envoyés avec chaque vidéo.
        headers: [
          // Autorise le navigateur et le CDN à garder les vidéos longtemps en cache.
          {
            // Nom de l'en-tête de cache.
            key: 'Cache-Control',
            // Cache long adapté aux assets versionnés par changement de fichier.
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Règle appliquée à toutes les routes du site.
      {
        // Motif Next.js qui cible tous les chemins.
        source: '/:path*',
        // Liste des en-têtes envoyés avec chaque réponse correspondante.
        headers: [
          // Empêche certains navigateurs de deviner un type MIME différent de celui annoncé.
          {
            // Nom de l'en-tête de sécurité.
            key: 'X-Content-Type-Options',
            // Valeur qui force le respect du Content-Type déclaré.
            value: 'nosniff',
          },
          // Réduit le risque de clickjacking en limitant l'intégration dans des iframes.
          {
            // Nom de l'en-tête qui contrôle l'affichage dans une frame.
            key: 'X-Frame-Options',
            // Autorise seulement les frames venant de la même origine.
            value: 'SAMEORIGIN',
          },
          // Active le filtre XSS historique de certains anciens navigateurs.
          {
            // Nom de l'en-tête de protection XSS.
            key: 'X-XSS-Protection',
            // Valeur qui demande le blocage en cas de détection.
            value: '1; mode=block',
          },
          // Contrôle la quantité d'information envoyée dans l'en-tête Referer.
          {
            // Nom de l'en-tête de politique de referrer.
            key: 'Referrer-Policy',
            // Envoie l'origine complète sur HTTPS compatible, et réduit l'information ailleurs.
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Active la compression HTTP intégrée de Next.js pour alléger les réponses.
  compress: true,

  // La minification SWC est automatique avec Next.js 15; aucune option legacy n'est nécessaire.

  // L'internationalisation sera gérée plus tard avec des segments App Router si besoin.
};

// Exporte la configuration pour que Next.js puisse l'importer au lancement.
module.exports = nextConfig;
