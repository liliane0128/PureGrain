'use client';

import Image from 'next/image';
import { useInView } from '@/hooks/useInView';

/**
 * Section "projet / affiliations" intercalée entre le hero et la section terrain.
 * Fond champ de blé fortement flouté (discret) pour marquer la rupture visuelle,
 * et logos partenaires posés sur des pastilles claires pour rester lisibles.
 *
 * Les deux logos sont pour l'instant des placeholders iGEM ; à terme le premier
 * portera le logo de l'association, le second celui d'iGEM.
 */
export function Partners() {
  const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.3, once: true });

  return (
    <section id="projet" ref={ref} className={`partners-section ${isInView ? 'is-in-view' : ''}`}>
      <div className="partners-bg" aria-hidden="true" />

      <div className="container partners-content">
        <span className="section-badge-glow">Le projet</span>
        <h2 className="partners-title">Un projet né de la biologie de synthèse</h2>
        <p className="partners-lead">
          Pure Graine est imaginé par une équipe d’étudiants, dans l’esprit de la compétition
          internationale iGEM : mobiliser le vivant et la biologie de synthèse pour répondre à un
          enjeu agricole concret.
        </p>

        <div className="partners-logos">
          {/* Emplacement de gauche : logo de l'association (placeholder iGEM pour l'instant). */}
          <div className="partner-logo-chip">
            <Image
              src="/images/IGEM_logo_2500x2500.png"
              alt="Association"
              width={2500}
              height={2500}
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
