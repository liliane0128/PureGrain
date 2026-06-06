'use client';

import Image from 'next/image';
import { useInView } from '@/hooks/useInView';

/**
 * Section éditoriale présentant le test de biologie synthétique comme source
 * de données terrain pour le modèle prédictif.
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
              src="/images/7v3t_assembly-1.jpeg"
              alt="Structure 3D de l'aptamère lié à la zéaralénone, coloré en spectre du 5' au 3'"
              width={500}
              height={500}
              className="synbio-image synbio-image-mol"
              sizes="(max-width: 900px) 90vw, 45vw"
            />
            <span className="synbio-visual-caption">Aptamère ZEN · structure 3D</span>
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
            <span className="synbio-visual-caption">Toehold switch · biologie de synthèse</span>
          </div>
        </div>

        <div className="synbio-copy">
          <h2>Un test de biologie synthétique pour nourrir la prédiction</h2>
          <p className="synbio-lead">
            Pure Grain développe un test basé sur la biologie synthétique pour mesurer la
            contamination directement à partir d’échantillons de terrain. L’objectif n’est pas
            seulement d’obtenir un résultat rapide : chaque test doit produire une donnée{' '}
            <strong>fiable, précise et contextualisée</strong>, capable d’alimenter ensuite un
            modèle de prédiction des contaminations.
          </p>
          <p className="synbio-lead">
            En reliant les résultats biologiques aux conditions agronomiques et météorologiques,
            nous pourrons mieux anticiper les zones et les périodes à risque. Cette approche vise à
            réduire les pertes pour les agriculteurs, tout en limitant les risques sanitaires pour
            les consommateurs.
          </p>
        </div>
      </div>
    </section>
  );
}
