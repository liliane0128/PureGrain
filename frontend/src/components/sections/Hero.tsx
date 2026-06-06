'use client';

const HERO_VIDEO_WEBM = '/videos/hero.webm';
const HERO_VIDEO_MP4 = '/videos/hero.mp4';
const HERO_VIDEO_POSTER = '/images/hero_poster.jpg';

/**
 * Section d'accueil immersive : texte de marque et appels à l'action posés sur
 * une vidéo plein écran.
 */
export function Hero() {
  return (
    <section id="top" className="hero-section">
      <video
        className="hero-bg-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={HERO_VIDEO_POSTER}
        aria-hidden="true"
      >
        {/* WebM (plus léger) servi en priorité, MP4 en repli universel. */}
        <source src={HERO_VIDEO_WEBM} type="video/webm" />
        <source src={HERO_VIDEO_MP4} type="video/mp4" />
      </video>

      {/* Voile d'ombrage pour maximiser le contraste des textes */}
      <div className="hero-bg-overlay" />

      {/* Conteneur principal des textes et boutons */}
      <div className="hero-container">
        <div className="hero-header-text">
          <h1 className="hero-main-title">Du laboratoire au champ</h1>
          <p className="hero-sub-title">Pure Graine teste, apprend et prédit.</p>
        </div>

        <div className="hero-footer-content">
          <p className="hero-body-description">
            Faites des tests en direct sur vos parcelles, obtenez une lecture rapide de la
            zéaralénone, puis transformez chaque mesure en donnée utile pour entraîner notre modèle
            de prédiction agricole.
          </p>
          <div className="hero-actions-group">
            <a className="btn btn-primary" href="#prediction-map">
              Lancer le simulateur
            </a>
            <a className="btn btn-secondary" href="#benefits">
              En savoir plus
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
