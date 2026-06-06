'use client';

import { useEffect, useRef, useState } from 'react';

type UseInViewOptions = {
  threshold?: number;
  rootMargin?: string;
  /** Si true, l'élément reste considéré visible après son premier passage. */
  once?: boolean;
};

/** Indique si l'élément référencé est visible dans le viewport. */
export function useInView<TElement extends Element>({
  threshold = 0.2,
  rootMargin = '0px',
  once = false,
}: UseInViewOptions = {}) {
  const ref = useRef<TElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);

        if (entry.isIntersecting && once) {
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return { ref, isInView };
}
