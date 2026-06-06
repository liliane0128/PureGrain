'use client';

import { useInView } from '@/hooks/useInView';

/**
 * Section éditoriale immersive expliquant le mécanisme aptamère-toehold de
 * détection de ZEN. Le graphique ne s'anime qu'à l'entrée dans le viewport.
 */
export function BioConversion() {
  const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.25 });

  return (
    <section id="conversion" className={`bio-conversion ${isInView ? 'is-in-view' : ''}`} ref={ref}>
      <div className="bio-conversion-overlay">
        <div className="container bio-conversion-content">
          <div className="bio-conversion-copy">
            <p className="bio-conversion-kicker">Plan 1 - toehold switch</p>
            <h2>Un signal fluorescent déclenché par la zéaralénone</h2>
            <p>
              La cible scientifique est la zéaralénone, une mycotoxine produite par Fusarium et
              retrouvée dans le blé, le maïs, l’avoine et d’autres céréales. Elle est étudiée ici
              comme perturbateur endocrinien à détecter rapidement.
            </p>
            {/* Texte positionnant le mécanisme de détection. */}
            <p>
              Le mécanisme proposé associe l’aptamère Z0, le trigger Z1 et un toehold switch
              exprimant mNeonGreen ou sfGFP en système TXTL. La validation doit mesurer le ratio
              ON/OFF, la fuite, la courbe standard, puis la spécificité en mélange de farine.
            </p>
          </div>

          <div
            className="bio-absorption-card"
            aria-label="Graphique de réponse fluorescente attendue pour ZEN"
          >
            <div className="bio-absorption-header">
              <span>Réponse fluorescente relative</span>
              <strong>ON/OFF</strong>
            </div>

            <div className="bio-absorption-chart">
              <svg
                viewBox="0 0 420 260"
                role="img"
                aria-label="Courbe de signal mNeonGreen avec ZEN au-dessus d'une ligne de fuite faible sans ZEN"
              >
                <g className="bio-chart-grid">
                  <line x1="48" y1="40" x2="390" y2="40" />
                  <line x1="48" y1="95" x2="390" y2="95" />
                  <line x1="48" y1="150" x2="390" y2="150" />
                  <line x1="48" y1="205" x2="390" y2="205" />
                </g>
                <path className="bio-chart-axis" d="M48 30 V214 H390" />
                {/* Courbe de fuite (sans ZEN) puis courbe de fluorescence (ZEN croissante). */}
                <path
                  className="bio-chart-line bio-chart-line-passive"
                  d="M48 202 C118 201 186 198 246 195 C304 192 350 190 390 188"
                />
                <path
                  className="bio-chart-line bio-chart-line-living"
                  d="M48 205 C92 196 118 176 148 146 C188 106 242 78 390 58"
                />
                <text className="bio-chart-value bio-chart-value-living" x="286" y="48">
                  ON
                </text>
                <text className="bio-chart-value bio-chart-value-passive" x="292" y="178">
                  fuite faible
                </text>
                <text className="bio-chart-label" x="48" y="236">
                  sans ZEN
                </text>
                <text className="bio-chart-label" x="292" y="236">
                  ZEN croissante
                </text>
              </svg>
            </div>

            <div className="bio-absorption-legend">
              <span>
                <i className="bio-legend-living" />
                ZEN libère Z1 puis active le reporter
              </span>
              <span>
                <i className="bio-legend-passive" />
                Contrôle sans ZEN
              </span>
            </div>

            <p className="bio-absorption-note">
              Validation prévue: quantifier la fluorescence en fonction de la quantité de ZEN,
              déterminer LOD/LOQ, tester d’autres mycotoxines et vérifier la robustesse en farine
              mélangée.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
