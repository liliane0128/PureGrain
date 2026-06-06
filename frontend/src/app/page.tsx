import Image from 'next/image';
import { Header } from '@/components/sections/Header';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Hero } from '@/components/sections/Hero';
import { Partners } from '@/components/sections/Partners';
import { Features } from '@/components/sections/Features';
import { SynBio } from '@/components/sections/SynBio';
import { PredictionMap } from '@/components/sections/PredictionMap';

export default function Home() {
  return (
    <>
      {/* Navigation en haut de page */}
      <Header />
      
      {/* Révélation progressive des éléments au scroll */}
      <ScrollReveal />

      {/* Disposition principale en sections pour le scroll snapping */}
      <main className="main-scroll-container">
        {/* Section 1: Hero avec vidéo de démonstration plein écran */}
        <Hero />

        {/* Section 2: Projet & affiliations (biologie de synthèse, logos) */}
        <Partners />

        {/* Section 3: Apport de la biologie de synthèse (coût, rapidité, mobilité) */}
        <SynBio />

        {/* Section 4: Analyse terrain et métriques clés */}
        <Features />

        {/* Section 5: Simulateur interactif de prédiction (carte + résultats) */}
        <PredictionMap />
      </main>

      {/* Section 6: Pied de page institutionnel minimalist */}
      <footer className="site-footer">
        <div className="container site-footer-content">
          <p>
            Pure Graine © 2026 · Projet développé pour le{' '}
            <a
              href="https://www.universite-paris-saclay.fr/evenements/hackathon-youthforbioeconomy-2026"
              target="_blank"
              rel="noreferrer"
            >
              Hackathon #YouthForBioeconomy
            </a>
          </p>
          <div className="site-footer-logos">
            <a href="https://igem.org" target="_blank" rel="noreferrer" title="iGEM">
              <Image
                src="/images/IGEM_logo_2500x2500.png"
                alt="iGEM"
                width={96}
                height={96}
                className="site-footer-logo"
              />
            </a>
            <a
              href="https://www.linkedin.com/company/igem-sorbonne/posts/?feedView=all"
              target="_blank"
              rel="noreferrer"
              title="iGEM Sorbonne Université"
            >
              <Image
                src="/images/igem .png"
                alt="iGEM Sorbonne Université"
                width={96}
                height={96}
                className="site-footer-logo"
              />
            </a>
            <a href="#top" title="Pure Graine">
              <Image
                src="/images/logo projet.png"
                alt="Pure Graine"
                width={96}
                height={96}
                className="site-footer-logo"
              />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
