'use client';

const HERO_VIDEO_WEBM = '/videos/hero.webm';
const HERO_VIDEO_POSTER = '/images/field.webp';

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
        {/* WebM léger servi directement pour éviter de garder un doublon MP4. */}
        <source src={HERO_VIDEO_WEBM} type="video/webm" />
      </video>

      {/* Voile d'ombrage pour maximiser le contraste des textes */}
      <div className="hero-bg-overlay" />

      {/* Conteneur principal des textes et boutons */}
      <div className="hero-container">
        <div className="hero-header-text">
          <h1 className="hero-main-title">Du laboratoire au champ</h1>
          <p className="hero-sub-title">
            Pure Grain <strong>teste, apprend et prédit.</strong>
          </p>
        </div>

        <div className="hero-footer-content">
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
