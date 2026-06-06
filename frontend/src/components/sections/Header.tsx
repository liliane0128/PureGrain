// Directive Next.js: le header réagit au scroll côté navigateur.
'use client';

// Import du composant Image de Next.js pour afficher le logo de marque proprement.
import Image from 'next/image';
// Import des hooks React pour suivre la direction du scroll.
import { useEffect, useRef, useState } from 'react';
// Import de la configuration globale du site et des liens de navigation.
import { navigation, siteConfig } from '@/lib/config';

/**
 * Composant Header - En-tête simple du site
 * Affiche le nom du projet et les liens principaux de navigation
 */
export function Header() {
  // Indique si le header doit être caché pendant une descente dans la page.
  const [isHidden, setIsHidden] = useState(false);
  // Indique si la page a été scrollée de plus de 20px.
  const [isScrolled, setIsScrolled] = useState(false);
  // Conserve la dernière position de scroll sans déclencher de rendu.
  const lastScrollY = useRef(0);
 
  // Observe le scroll pour cacher le header à la descente et le réafficher à la remontée.
  useEffect(() => {
    // Gestionnaire appelé à chaque scroll.
    const handleScroll = () => {
      // Position courante dans la page.
      const currentScrollY = window.scrollY;
      
      // Met à jour l'état scrollé pour l'effet de flou en arrière-plan
      setIsScrolled(currentScrollY > 20);

      // Détecte une vraie descente, en ignorant les micro-mouvements.
      const isScrollingDown = currentScrollY > lastScrollY.current + 8;
      // Détecte une vraie remontée.
      const isScrollingUp = currentScrollY < lastScrollY.current - 8;
 
      // Cache le header quand l'utilisateur descend après le premier écran du header.
      if (isScrollingDown && currentScrollY > 80) {
        setIsHidden(true);
      }
 
      // Réaffiche le header quand l'utilisateur remonte ou revient en haut.
      if (isScrollingUp || currentScrollY <= 16) {
        setIsHidden(false);
      }
 
      // Mémorise la position pour le prochain événement.
      lastScrollY.current = currentScrollY;
    };
 
    // Initialise la position au montage.
    lastScrollY.current = window.scrollY;
    setIsScrolled(window.scrollY > 20);
    // Écoute le scroll en mode passif pour ne pas bloquer la page.
    window.addEventListener('scroll', handleScroll, { passive: true });
 
    // Nettoie l'écouteur au démontage.
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
 
  // Retourne un en-tête léger, lisible et réutilisable sur la page d'accueil.
  return (
    // Header principal affiché en haut du site.
    <header className={`site-header ${isHidden ? 'site-header-hidden' : ''} ${isScrolled ? 'site-header-scrolled' : ''}`}>
      {/* Conteneur central qui aligne la marque et la navigation. */}
      <div className="container site-header-content">
        {/* Lien de marque qui ramène vers le haut de la page. */}
        <a className="site-brand" href="#top">
          {/* Logo Pure Graine affiché dans le header. */}
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
          {/* Nom public du site depuis la configuration globale. */}
          <span>{siteConfig.name}</span>
        </a>

        {/* Navigation principale du site. */}
        <nav className="site-nav" aria-label="Navigation principale">
          {/* Itération sur les liens déclarés dans src/lib/config.ts. */}
          {navigation.map((item) => (
            // Chaque lien utilise son libellé comme clé car la liste est courte et stable.
            <a key={item.label} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
