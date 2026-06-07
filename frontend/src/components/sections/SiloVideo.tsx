'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SILO_VIDEO_SRC = '/videos/video_silo.webm';
const SILO_VIDEO_RATE = 0.55;
const SILO_VIDEO_ROOT_MARGIN = '900px 0px';

export function SiloVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);

  const slowDownVideo = useCallback((video: HTMLVideoElement | null) => {
    if (!video) {
      return;
    }

    video.playbackRate = SILO_VIDEO_RATE;
  }, []);

  const setVideoNode = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video;
      slowDownVideo(video);
    },
    [slowDownVideo]
  );

  useEffect(() => {
    const video = videoRef.current;

    if (!video || shouldLoadVideo) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setShouldLoadVideo(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: SILO_VIDEO_ROOT_MARGIN }
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, [shouldLoadVideo]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !shouldLoadVideo) {
      return;
    }

    slowDownVideo(video);
    video.load();
    void video.play().catch(() => undefined);
  }, [shouldLoadVideo, slowDownVideo]);

  return (
    <video
      ref={setVideoNode}
      src={shouldLoadVideo ? SILO_VIDEO_SRC : undefined}
      aria-label="Visualisation de silo agricole Pure Grain"
      autoPlay
      loop
      muted
      playsInline
      preload={shouldLoadVideo ? 'auto' : 'none'}
      onLoadedMetadata={(event) => slowDownVideo(event.currentTarget)}
      onPlay={(event) => slowDownVideo(event.currentTarget)}
    />
  );
}
