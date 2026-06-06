'use client';

import { useEffect } from 'react';

// Textes éditoriaux révélés en douceur lors de leur entrée dans le viewport.
const REVEAL_SELECTOR = [
  '.features-header-text h2',
  '.features-header-text p',
  '.bio-conversion-copy h2',
  '.bio-conversion-copy p',
  '.molecules-header h2',
  '.molecules-header p',
].join(', ');

/** Composant sans rendu qui anime l'apparition des titres et paragraphes au scroll. */
export function ScrollReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));

    elements.forEach((element, index) => {
      element.classList.add('scroll-reveal');
      element.style.setProperty('--scroll-reveal-delay', `${Math.min(index * 70, 210)}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('scroll-reveal-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    elements.forEach((element) => observer.observe(element));

    // Révèle immédiatement les textes déjà visibles au chargement (hero notamment).
    requestAnimationFrame(() => {
      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();

        if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
          element.classList.add('scroll-reveal-visible');
          observer.unobserve(element);
        }
      });
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
