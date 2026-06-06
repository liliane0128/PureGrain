'use client';

import { useRef } from 'react';

const HERO_VIDEO_SRC = '/videos/main_vid.mp4';
const HERO_VIDEO_POSTER = '/images/main_vid_poster.jpg';

/**
 * Composant Hero - Section d'accueil principale immersive style Tesla.com
 * Affiche le texte de marque et les boutons d'action sur une vidéo d'arrière-plan plein écran.
 */
export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <section id="top" className="hero-section">
      {/* Vidéo de fond en plein écran */}
      <video
        ref={videoRef}
        className="hero-bg-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={HERO_VIDEO_POSTER}
        aria-hidden="true"
      >
        <source src={HERO_VIDEO_SRC} type="video/mp4" />
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
