// Directive Next.js: ce hook observe le viewport côté navigateur.
'use client';

// Import des hooks React nécessaires à l'observation d'un élément DOM.
import { useEffect, useRef, useState } from 'react';

// Options acceptées par le hook d'apparition dans le viewport.
type UseInViewOptions = {
  // Seuil de visibilité requis avant de considérer l'élément comme visible.
  threshold?: number;
  // Marge autour du viewport, utile pour déclencher légèrement avant le centre de l'écran.
  rootMargin?: string;
  // Si true, l'animation reste considérée visible après le premier passage.
  once?: boolean;
};

// Hook générique qui indique si un élément est visible dans la fenêtre.
export function useInView<TElement extends Element>({
  threshold = 0.2,
  rootMargin = '0px',
  once = false,
}: UseInViewOptions = {}) {
  // Référence de l'élément observé.
  const ref = useRef<TElement | null>(null);
  // État indiquant si l'élément est actuellement visible.
  const [isInView, setIsInView] = useState(false);

  // Installe l'IntersectionObserver après le montage du composant.
  useEffect(() => {
    // Récupère l'élément courant à observer.
    const element = ref.current;

    // Stoppe si l'élément n'est pas encore monté.
    if (!element) {
      return;
    }

    // Observe les entrées et sorties de l'élément dans le viewport.
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Un élément est considéré visible s'il intersecte le viewport au seuil demandé.
        const nextIsInView = entry.isIntersecting;

        // Met à jour l'état pour déclencher ou arrêter les animations associées.
        setIsInView(nextIsInView);

        // En mode once, arrête l'observation après le premier déclenchement.
        if (nextIsInView && once) {
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Démarre l'observation de l'élément.
    observer.observe(element);

    // Nettoie l'observer au démontage.
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  // Retourne la référence à poser sur le DOM et l'état de visibilité.
  return { ref, isInView };
}
