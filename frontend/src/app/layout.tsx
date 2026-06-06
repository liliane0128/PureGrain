import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pure Graine - Détection ZEN dans les céréales',
  description:
    'Projet du Hackathon #YouthForBioeconomy dédié à la détection rapide de la zéaralénone par aptamère, toehold switch fluorescent et LAMP Fusarium.',
  keywords: ['zéaralénone', 'ZEN', 'aptamère toehold switch', 'Fusarium céréales'],
  openGraph: {
    title: 'Pure Graine - Détection ZEN dans les céréales',
    description:
      'Identifier rapidement la zéaralénone ou sa source grâce à un système aptamère Z0/Z1, un toehold switch fluorescent et une piste LAMP ciblant Fusarium.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="preload-scroll-lock" suppressHydrationWarning>
      <head>
        {/* Masque brièvement le body pendant le verrouillage initial du scroll pour éviter un flash de position restaurée. */}
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
      <body>{children}</body>
    </html>
  );
}
