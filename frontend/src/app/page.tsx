import Image from 'next/image';
import { Header } from '@/components/sections/Header';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Hero } from '@/components/sections/Hero';
import { Features } from '@/components/sections/Features';
import { SynBio } from '@/components/sections/SynBio';
import { PredictionMap } from '@/components/sections/PredictionMap';
import { BioConversion } from '@/components/sections/BioConversion';
import { Molecules } from '@/components/sections/Molecules';

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

        {/* Section 2: Analyse terrain et métriques clés */}
        <Features />

        {/* Section 3: Apport de la biologie de synthèse (coût, rapidité, mobilité) */}
        <SynBio />

        {/* Section 4: Simulateur interactif de prédiction */}
        <PredictionMap />

        {/* Section 5: Mécanisme de fluorescence BioConversion */}
        <BioConversion />

        {/* Section 6: Briques scientifiques Molecules */}
        <Molecules />
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
            <a href="https://www.universite-paris-saclay.fr" target="_blank" rel="noreferrer" title="Université Paris-Saclay">
              <Image
                src="/images/Logo_Université_Paris-Saclay_2019-12.svg.png"
                alt="Université Paris-Saclay"
                width={120}
                height={42}
                className="site-footer-logo site-footer-logo-saclay"
              />
            </a>
            <a href="https://www.agroparistech.fr" target="_blank" rel="noreferrer" title="AgroParisTech">
              <Image
                src="/images/APT_Logo_RVB_Positif.png"
                alt="AgroParisTech"
                width={110}
                height={30}
                className="site-footer-logo site-footer-logo-apt"
              />
            </a>
            <a href="https://agpb.fr" target="_blank" rel="noreferrer" title="AGPB">
              <Image
                src="/images/logo_agpb.png"
                alt="AGPB"
                width={40}
                height={40}
                className="site-footer-logo site-footer-logo-agpb"
              />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
