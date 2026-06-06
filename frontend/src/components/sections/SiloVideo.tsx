'use client';

import { useCallback } from 'react';

const SILO_VIDEO_RATE = 0.55;

export function SiloVideo() {
  const slowDownVideo = useCallback((video: HTMLVideoElement | null) => {
    if (!video) {
      return;
    }

    video.playbackRate = SILO_VIDEO_RATE;
  }, []);

  return (
    <video
      ref={slowDownVideo}
      src="/videos/video_silo.webm"
      aria-label="Visualisation de silo agricole Pure Grain"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      onLoadedMetadata={(event) => slowDownVideo(event.currentTarget)}
      onPlay={(event) => slowDownVideo(event.currentTarget)}
    />
  );
}
