import Image from 'next/image';
import { Header } from '@/components/sections/Header';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Hero } from '@/components/sections/Hero';
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

        {/* Section 2: Apport de la biologie de synthèse et données terrain */}
        <SynBio />

        {/* Section 3: Analyse terrain et métriques clés */}
        <Features />

        {/* Section 4: Simulateur interactif de prédiction (carte + résultats) */}
        <PredictionMap />
      </main>

      {/* Pied de page institutionnel */}
      <footer className="site-footer">
        <div className="container site-footer-content">
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
            <a
              href="https://www.genopole.fr/offres/d4gen-hackathon/"
              target="_blank"
              rel="noreferrer"
              title="D4GEN Hackathon"
            >
              <Image
                src="/images/hackathon.png"
                alt="D4GEN Hackathon"
                width={96}
                height={96}
                className="site-footer-logo site-footer-logo-hackathon"
              />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
