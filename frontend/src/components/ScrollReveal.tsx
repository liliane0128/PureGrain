// Directive Next.js: ce composant observe les éléments dans le navigateur.
'use client';

// Import du hook d'effet pour installer l'observer au montage.
import { useEffect } from 'react';

// Sélecteur des textes éditoriaux à faire apparaître doucement au scroll.
const REVEAL_SELECTOR = [
  '.features-copy h2',
  '.features-copy p',
  '.bio-conversion-copy h2',
  '.bio-conversion-copy p',
  '.molecules-header h2',
  '.molecules-header p',
].join(', ');

// Composant invisible qui ajoute les classes d'apparition aux titres et sous-titres.
export function ScrollReveal() {
  // Installe l'observation des éléments éditoriaux après le rendu client.
  useEffect(() => {
    // Récupère les éléments existants dans la page.
    const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));

    // Ajoute l'état initial à tous les éléments ciblés.
    elements.forEach((element, index) => {
      element.classList.add('scroll-reveal');
      element.style.setProperty('--scroll-reveal-delay', `${Math.min(index * 70, 210)}ms`);
    });

    // Observe l'entrée dans le viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Ignore les éléments encore hors écran.
          if (!entry.isIntersecting) {
            return;
          }

          // Déclenche l'apparition douce.
          entry.target.classList.add('scroll-reveal-visible');
          // Garde l'élément visible après le premier passage.
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    // Démarre l'observation de chaque élément.
    elements.forEach((element) => observer.observe(element));

    // Déclenche explicitement les textes déjà visibles au chargement, notamment le hero.
    requestAnimationFrame(() => {
      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();

        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          element.classList.add('scroll-reveal-visible');
          observer.unobserve(element);
        }
      });
    });

    // Nettoie l'observer au démontage.
    return () => observer.disconnect();
  }, []);

  // Ce composant ne rend rien à l'écran.
  return null;
}
