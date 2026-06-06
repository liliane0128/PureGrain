const scienceModules = [
  {
    name: 'Docking ZEN sur Z0',
    tag: 'T17-T21 / C50',
    metric: '-6.28 kcal/mol',
    role: 'Le docking non ciblé identifie deux zones d’ancrage cohérentes avec la littérature. Le site T17-T21 sert de point de départ aux simulations de repliement induit.',
    variant: 'docking',
  },
  {
    name: 'Z1 original vs Z1 + 9 bases',
    tag: 'NUPACK + SMD',
    metric: '+9 bases',
    role: 'L’extension de Z1 clarifie la recherche de switch et doit être comparée au Z1 original par dynamique moléculaire, stabilité sans force et hybridation trigger-switch.',
    variant: 'switch',
  },
  {
    name: 'Validation expérimentale',
    tag: 'TXTL / LAMP',
    metric: 'LOD / LOQ',
    role: 'Le protocole prévoit la calibration mNeonGreen, le ratio Z0/Z1, le contrôle de fuite, la courbe standard ZEN et la spécificité face aux autres mycotoxines.',
    variant: 'validation',
  },
];

function ScienceGraphic({ variant }: { variant: string }) {
  return (
    <div className={`molecule-viewer science-card-graphic science-card-graphic-${variant}`}>
      <span className="science-dna-strand science-dna-strand-one" />
      <span className="science-dna-strand science-dna-strand-two" />
      <span className="science-signal science-signal-one" />
      <span className="science-signal science-signal-two" />
      <span className="science-signal science-signal-three" />
      <span className="science-core-dot" />
    </div>
  );
}

// Section présentant les briques scientifiques du projet ZEN.
export function Molecules() {
  return (
    <section className="molecules">
      {/* Conteneur aligné avec le reste de la page. */}
      <div className="container">
        {/* En-tête éditorial de la section. */}
        <div className="molecules-header">
          <span className="section-badge-glow">Science pole</span>
          <h2>Identifier la zéaralénone ou sa source</h2>
          <p>
            Pure Graine concentre le travail scientifique sur trois stratégies complémentaires : la
            modélisation et le docking de l’aptamère, le design du toehold switch et la validation
            expérimentale en conditions proches d’un échantillon réel (TXTL et LAMP).
          </p>
        </div>

        {/* Grille des trois modules scientifiques. */}
        <div className="molecules-grid">
          {scienceModules.map((module) => (
            <article className="molecule-card" key={module.name}>
              <ScienceGraphic variant={module.variant} />
              <div className="molecule-card-copy">
                <span className="science-module-tag">{module.tag}</span>
                <h3>{module.name}</h3>
                <strong className="science-module-metric">{module.metric}</strong>
                <p>{module.role}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
