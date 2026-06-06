'use client';

import Image from 'next/image';
import { useInView } from '@/hooks/useInView';

const advantages = [
  {
    metric: '× moins cher',
    title: 'Coût divisé',
    description:
      'Une réaction sans cellule (TXTL) et des réactifs synthétiques remplacent les analyses laboratoire lourdes : le coût par test chute drastiquement.',
  },
  {
    metric: '30 min',
    title: 'Résultat immédiat',
    description:
      'Le signal fluorescent du toehold switch se lit directement, sans envoi d’échantillon ni attente de plusieurs jours.',
  },
  {
    metric: 'Format terrain',
    title: 'Mobile et simple',
    description:
      'Un kit léger utilisable au bord du champ : plus besoin d’équipement analytique fixe ni de personnel spécialisé.',
  },
  {
    metric: 'Niveau labo',
    title: 'Précision conservée',
    description:
      'L’aptamère Z0/Z1 reste spécifique à la zéaralénone : on gagne en accessibilité sans sacrifier la fiabilité de la mesure.',
  },
];

/**
 * Section éditoriale présentant l'apport de la biologie de synthèse : un test
 * radicalement moins cher, plus rapide et mobile, tout en restant précis.
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
            <span className="synbio-visual-caption">Terrain · collecte d'échantillons</span>
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
          <h2>Un test de laboratoire, repensé pour le terrain</h2>
          <p className="synbio-lead">
            Plutôt que d’envoyer les échantillons vers un laboratoire, Pure Graine embarque la
            détection dans une réaction de biologie de synthèse. Résultat : un test{' '}
            <strong>radicalement moins cher, plus rapide et mobile</strong>, qui garde la précision
            d’une analyse classique.
          </p>

          <div className="synbio-grid">
            {advantages.map((item) => (
              <article className="synbio-card" key={item.title}>
                <strong className="synbio-card-metric">{item.metric}</strong>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
