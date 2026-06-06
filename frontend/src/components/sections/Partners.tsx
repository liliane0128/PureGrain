'use client';

import Image from 'next/image';
import { useInView } from '@/hooks/useInView';

/**
 * Section "projet / affiliations" intercalée entre le hero et la section terrain.
 * Fond champ de blé fortement flouté (discret) pour marquer la rupture visuelle,
 * et logos partenaires posés sur des pastilles claires pour rester lisibles.
 *
 * Le premier visuel porte l'image d'équipe/projet, le second le logo iGEM.
 */
export function Partners() {
  const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.3, once: true });

  return (
    <section id="projet" ref={ref} className={`partners-section ${isInView ? 'is-in-view' : ''}`}>
      <div className="partners-bg" aria-hidden="true" />

      <div className="container partners-content">
        <h2 className="partners-title">Un projet né de la biologie de synthèse</h2>
        <p className="partners-lead">
          Pure Grain est imaginé par une équipe d’étudiants, dans l’esprit de la compétition
          internationale iGEM : mobiliser le vivant et la biologie de synthèse pour répondre à un
          enjeu agricole concret.
        </p>

        <div className="partners-logos">
          {/* Emplacement de gauche : image d'équipe/projet. */}
          <div className="partner-logo-chip">
            <Image
              src="/images/Plan-de-travail-1-475x367.png"
              alt="Association"
              width={475}
              height={367}
              className="partner-logo"
            />
          </div>
          <div className="partner-logo-chip">
            <Image
              src="/images/IGEM_logo_2500x2500.png"
              alt="iGEM"
              width={2500}
              height={2500}
              className="partner-logo"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
