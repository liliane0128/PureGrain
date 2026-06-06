'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { navigation, siteConfig } from '@/lib/config';

/**
 * En-tête du site : se masque pendant la descente, réapparaît à la remontée et
 * passe en mode flouté dès que la page est scrollée.
 */
export function Header() {
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      setIsScrolled(currentScrollY > 20);

      // Seuil de 8px pour ignorer les micro-mouvements de scroll.
      const isScrollingDown = currentScrollY > lastScrollY.current + 8;
      const isScrollingUp = currentScrollY < lastScrollY.current - 8;

      if (isScrollingDown && currentScrollY > 80) {
        setIsHidden(true);
      }

      if (isScrollingUp || currentScrollY <= 16) {
        setIsHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    lastScrollY.current = window.scrollY;
    setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`site-header ${isHidden ? 'site-header-hidden' : ''} ${isScrolled ? 'site-header-scrolled' : ''}`}>
      <div className="container site-header-content">
        <a className="site-brand" href="#top">
          <span className="site-brand-mark" aria-hidden="true">
            <Image
              src="/images/pure-graine-logo.png"
              alt=""
              width={1047}
              height={1050}
              className="site-brand-logo"
              priority
            />
          </span>
          <span>{siteConfig.name}</span>
        </a>

        <nav className="site-nav" aria-label="Navigation principale">
          {navigation.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
