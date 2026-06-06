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
            Pure Grain rapproche l’analyse du terrain : un prélèvement rapide, une lecture simple et un résultat exploitable en 30 minutes pour repérer la zéaralénone.
          </p>
        </div>

        {/* Bandeau de spécifications horizontales style Tesla à la base du viewport */}
        <div className="features-specs-wrapper">
          <div className="features-spec-item">
            <span className="features-spec-value">30 min</span>
            <span className="features-spec-label">Résultat terrain</span>
          </div>
          <div className="features-spec-item">
            <span className="features-spec-value">Tests répétés</span>
            <span className="features-spec-label">Coût accessible</span>
          </div>
          <div className="features-spec-item">
            <span className="features-spec-value">IA Europe</span>
            <span className="features-spec-label">Données partagées</span>
          </div>
        </div>
      </div>
    </section>
  );
}
