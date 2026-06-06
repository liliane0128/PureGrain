'use client';

import { useCallback } from 'react';

const TRACTOR_VIDEO_RATE = 0.55;

export function TractorVideo() {
  const slowDownVideo = useCallback((video: HTMLVideoElement | null) => {
    if (!video) {
      return;
    }

    video.playbackRate = TRACTOR_VIDEO_RATE;
  }, []);

  return (
    <video
      ref={slowDownVideo}
      src="/videos/tracteur.mp4"
      aria-label="Visualisation agricole Pure Graine"
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
