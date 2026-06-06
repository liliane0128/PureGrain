'use client';

import Image from 'next/image';
import { useInView } from '@/hooks/useInView';

/**
 * Section éditoriale présentant l'apport de la biologie de synthèse : un test
 * de terrain qui produit des données fiables pour nourrir la prédiction.
 */
export function SynBio() {
  const { ref, isInView } = useInView<HTMLElement>({ threshold: 0.2, once: true });

  return (
    <section
      id="synbio"
      ref={ref}
      className={`synbio-section ${isInView ? 'is-in-view' : ''}`}
    >
      <div className="container synbio-layout">
        <div className="synbio-visual">
          <div className="synbio-frame">
            <Image
              src="/images/leon-mcgregor-Zk3ZUpzSp8c-unsplash.jpg"
              alt="Champ de céréales, support de collecte des échantillons agricoles"
              width={1200}
              height={768}
              className="synbio-image"
              sizes="(max-width: 900px) 90vw, 45vw"
            />
          </div>
          <div className="synbio-frame">
            <Image
              src="/images/toehold-switch.avif"
              alt="Rendu 3D d'un toehold switch : brin d'ARN guidé vers le ribosome pour déclencher l'expression du reporter fluorescent"
              width={1200}
              height={720}
              className="synbio-image"
              sizes="(max-width: 900px) 90vw, 45vw"
            />
          </div>
        </div>

        <div className="synbio-copy">
          <h2>Un test de biologie synthétique pour collecter des données fiables</h2>
          <p className="synbio-lead">
            Pure Grain a créé un test de terrain fondé sur la biologie synthétique pour mesurer la
            contamination directement au plus près des parcelles. L’objectif n’est pas seulement
            d’obtenir un résultat rapide : chaque analyse produit une donnée exploitable, précise et
            contextualisée.
          </p>
          <p className="synbio-detail">
            En multipliant ces mesures sur différents lots, cultures et conditions météo, le projet
            peut constituer une base de données de grande qualité. Ces données pourront ensuite
            alimenter un modèle capable d’estimer la probabilité de contamination avant que le risque
            ne devienne critique.
          </p>
          <p className="synbio-detail">
            Cette approche relie détection biologique et prédiction agronomique : aider les
            agriculteurs à réduire les pertes, mieux décider quand agir, et limiter l’exposition des
            consommateurs aux mycotoxines.
          </p>
        </div>
      </div>
    </section>
  );
}
