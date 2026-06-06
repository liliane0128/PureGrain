'use client';

import { SiloVideo } from './SiloVideo';

/**
 * Composant Features - Présentation immersive style Tesla de l'analyse terrain
 * Affiche l'accroche et les indicateurs clés au-dessus de la vidéo de silo ralentie.
 */
export function Features() {
  return (
    <section id="benefits" className="features-section">
      {/* Vidéo de fond du silo */}
      <div className="features-bg-video-wrapper">
        <SiloVideo />
      </div>

      {/* Voile d'ombrage */}
      <div className="features-bg-overlay" />

      {/* Conteneur principal */}
      <div className="features-container">
        {/* Accroche textuelle centrée en haut */}
        <div className="features-header-text">
          <h2 className="features-main-title">Analyser son champ en direct</h2>
          <p className="features-sub-title">
            Pure Grain rapproche l’analyse du terrain : un prélèvement rapide, une lecture simple
            et un résultat exploitable en 30 minutes pour repérer toute une gamme de mycotoxines.
            L’IA assure une veille constante pour prévoir les risques, prévenir les contaminations
            et motiver des tests ciblés.
          </p>
        </div>

        {/* Bandeau de spécifications horizontales style Tesla à la base du viewport */}
        <div className="features-specs-wrapper">
          <div className="features-spec-item">
            <span className="features-spec-note">RÉSULTAT EN</span>
            <span className="features-spec-value">30 min</span>
          </div>
          <div className="features-spec-item">
            <span className="features-spec-note">À PARTIR DE</span>
            <span className="features-spec-value">3 € / unité</span>
          </div>
          <div className="features-spec-item">
            <span className="features-spec-note">IA AGRICOLE</span>
            <span className="features-spec-value">Europe</span>
          </div>
        </div>
      </div>
    </section>
  );
}
