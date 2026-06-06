'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const TILE_SIZE = 256;
// Tuiles récupérées 1 niveau de zoom plus haut puis affichées réduites : bonne
// netteté sans multiplier le nombre de tuiles (chargement rapide et propre, y
// compris au premier clic de zoom).
const HD_TILE_ZOOM_OFFSET = 1;
// Esri World Imagery fournit des tuiles jusqu'au niveau ~19 → on peut descendre
// jusqu'à la parcelle.
const MAX_TILE_ZOOM = 19;
const MIN_ZOOM = 5;
const MAX_ZOOM = 17;
const ZOOM_ANIMATION_MS = 420;
const INITIAL_VIEW = {
  lat: 46.45,
  lng: 2.25,
  zoom: 6,
};

type View = typeof INITIAL_VIEW;

export type MapLocation = {
  lat: number;
  lng: number;
};

export type DataPoint = {
  id: number;
  lat: number;
  lng: number;
  riskLevel: 'GREEN' | 'ORANGE' | 'RED' | null;
  label?: string;
};

const RISK_COLORS: Record<string, string> = {
  GREEN:  '#22c55e',
  ORANGE: '#f97316',
  RED:    '#ef4444',
};

const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  'France':         { lat: 46.60, lng:  2.30 },
  'Germany':        { lat: 51.20, lng: 10.50 },
  'Spain':          { lat: 40.50, lng: -3.70 },
  'Italy':          { lat: 42.80, lng: 12.80 },
  'Poland':         { lat: 52.00, lng: 19.90 },
  'Hungary':        { lat: 47.20, lng: 19.50 },
  'Romania':        { lat: 45.90, lng: 24.90 },
  'Czech Republic': { lat: 49.80, lng: 15.50 },
  'Netherlands':    { lat: 52.30, lng:  5.30 },
  'Belgium':        { lat: 50.80, lng:  4.30 },
  'Austria':        { lat: 47.50, lng: 14.60 },
  'Denmark':        { lat: 56.30, lng:  9.50 },
  'Sweden':         { lat: 60.10, lng: 18.60 },
  'Finland':        { lat: 64.00, lng: 26.00 },
  'Portugal':       { lat: 39.70, lng: -8.10 },
  'Greece':         { lat: 39.10, lng: 21.80 },
  'Bulgaria':       { lat: 42.70, lng: 25.50 },
  'Slovakia':       { lat: 48.70, lng: 19.70 },
  'Lithuania':      { lat: 55.90, lng: 23.90 },
  'Estonia':        { lat: 58.60, lng: 25.00 },
};

export function countryToLatLng(country: string | null | undefined): { lat: number; lng: number } | null {
  if (!country) return null;
  return COUNTRY_CENTROIDS[country] ?? null;
}

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWorldX: number;
  startWorldY: number;
  zoom: number;
};

type SatelliteMapProps = {
  selectedLocation?: MapLocation | null;
  onLocationSelect?: (location: MapLocation) => void;
  dataPoints?: DataPoint[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function wrapTileX(x: number, zoom: number) {
  const count = 2 ** zoom;
  return ((x % count) + count) % count;
}

function project(lat: number, lng: number, zoom: number) {
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const sinLat = Math.sin((safeLat * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;

  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const normalizedY = clamp(y, 0, scale);
  const lng = (x / scale) * 360 - 180;
  const mercator = Math.PI - (2 * Math.PI * normalizedY) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(mercator));

  return {
    lat: clamp(lat, -85.05112878, 85.05112878),
    lng,
  };
}

function tileUrl(zoom: number, x: number, y: number) {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
}

// Tuiles transparentes "labels only" (noms de villes, frontières) superposées
// au satellite. CARTO sert ces overlays en PNG via les sous-domaines a-d.
function labelUrl(zoom: number, x: number, y: number) {
  const sub = 'abcd'[(x + y) % 4];
  return `https://${sub}.basemaps.cartocdn.com/rastertiles/dark_only_labels/${zoom}/${x}/${y}.png`;
}

export function SatelliteMap({ selectedLocation = null, onLocationSelect, dataPoints = [] }: SatelliteMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);
  const zoomFrameRef = useRef<number | null>(null);
  const pendingViewRef = useRef<View | null>(null);
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const viewRef = useRef<View>(INITIAL_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const sizeRef = useRef(size);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    const node = mapRef.current;

    if (!node) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (zoomFrameRef.current !== null) {
        window.cancelAnimationFrame(zoomFrameRef.current);
      }
    };
  }, []);

  const scheduleView = useCallback((nextView: View) => {
    pendingViewRef.current = nextView;

    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;

      if (pendingViewRef.current) {
        setView(pendingViewRef.current);
      }
    });
  }, []);

  // Zoom à la molette, centré sur le curseur (le point sous la souris reste fixe).
  // Listener non passif pour pouvoir bloquer le scroll de page pendant le zoom carte.
  useEffect(() => {
    const node = mapRef.current;

    if (!node) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = node.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const current = viewRef.current;
      const width = Math.max(sizeRef.current.width, 1);
      const height = Math.max(sizeRef.current.height, 1);
      const nextZoom = clamp(current.zoom - event.deltaY * 0.0045, MIN_ZOOM, MAX_ZOOM);

      if (nextZoom === current.zoom) {
        return;
      }

      const center = project(current.lat, current.lng, current.zoom);
      const topLeft = { x: center.x - width / 2, y: center.y - height / 2 };
      const geo = unproject(topLeft.x + cursorX, topLeft.y + cursorY, current.zoom);
      const projected = project(geo.lat, geo.lng, nextZoom);
      const nextCenter = unproject(
        projected.x - (cursorX - width / 2),
        projected.y - (cursorY - height / 2),
        nextZoom
      );

      scheduleView({ lat: nextCenter.lat, lng: nextCenter.lng, zoom: nextZoom });
    };

    node.addEventListener('wheel', onWheel, { passive: false });

    return () => node.removeEventListener('wheel', onWheel);
  }, [scheduleView]);

  const geometry = useMemo(() => {
    const width = Math.max(size.width, 1);
    const height = Math.max(size.height, 1);
    const center = project(view.lat, view.lng, view.zoom);
    const topLeft = {
      x: center.x - width / 2,
      y: center.y - height / 2,
    };

    // Construit l'ensemble des tuiles couvrant le viewport pour un offset de niveau
    // donné. Le serveur n'expose que des zooms entiers : on prend le plus proche du
    // zoom courant + l'offset, puis on met à l'échelle (fractionnaire → zoom fluide).
    const buildTiles = (offset: number, urlFn: (z: number, x: number, y: number) => string) => {
      const tileZoom = clamp(Math.round(view.zoom) + offset, 0, MAX_TILE_ZOOM);
      const tileToView = 2 ** (view.zoom - tileZoom);
      const viewToTile = 1 / tileToView;
      const renderedTileSize = TILE_SIZE * tileToView;
      const sourceTopLeft = {
        x: topLeft.x * viewToTile,
        y: topLeft.y * viewToTile,
      };
      const minTileX = Math.floor(sourceTopLeft.x / TILE_SIZE) - 1;
      const maxTileX = Math.floor((sourceTopLeft.x + width * viewToTile) / TILE_SIZE) + 1;
      const minTileY = Math.max(0, Math.floor(sourceTopLeft.y / TILE_SIZE) - 1);
      const maxTileY = Math.min(
        2 ** tileZoom - 1,
        Math.floor((sourceTopLeft.y + height * viewToTile) / TILE_SIZE) + 1
      );
      const tiles = [];

      for (let y = minTileY; y <= maxTileY; y += 1) {
        for (let x = minTileX; x <= maxTileX; x += 1) {
          const tileX = wrapTileX(x, tileZoom);

          // Positions arrondies au pixel entier + recouvrement de 2 px pour masquer
          // les franges d'anti-aliasing et éliminer les coutures entre tuiles.
          tiles.push({
            key: `${tileZoom}-${x}-${y}`,
            src: urlFn(tileZoom, tileX, y),
            left: Math.floor(x * renderedTileSize - topLeft.x),
            size: Math.ceil(renderedTileSize) + 2,
            top: Math.floor(y * renderedTileSize - topLeft.y),
          });
        }
      }

      return tiles;
    };

    // Couche de base basse résolution (peu de tuiles, chargement quasi instantané)
    // qui comble le fond pendant que la couche HD se charge → aucun trou au zoom.
    const baseTiles = buildTiles(0, tileUrl);
    const tiles = buildTiles(HD_TILE_ZOOM_OFFSET, tileUrl);
    // Couche de labels (noms de villes) au zoom d'affichage, alignée sur la base.
    const labelTiles = buildTiles(0, labelUrl);

    const selectedMarker = selectedLocation
      ? {
          ...selectedLocation,
          ...(() => {
            const point = project(selectedLocation.lat, selectedLocation.lng, view.zoom);

            return {
              left: point.x - topLeft.x,
              top: point.y - topLeft.y,
            };
          })(),
        }
      : null;

    return { baseTiles, tiles, labelTiles, selectedMarker };
  }, [selectedLocation, size.height, size.width, view.lat, view.lng, view.zoom]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const center = project(view.lat, view.lng, view.zoom);
      dragRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startWorldX: center.x,
        startWorldY: center.y,
        zoom: view.zoom,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    },
    [view.lat, view.lng, view.zoom]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;

      if (!drag) {
        return;
      }

      const next = unproject(
        drag.startWorldX - (event.clientX - drag.startClientX),
        drag.startWorldY - (event.clientY - drag.startClientY),
        drag.zoom
      );

      scheduleView({ ...next, zoom: drag.zoom });
    },
    [scheduleView]
  );

  const stopDragging = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;

      if (drag?.pointerId === event.pointerId) {
        const movedDistance = Math.hypot(
          event.clientX - drag.startClientX,
          event.clientY - drag.startClientY
        );

        if (event.type === 'pointerup' && movedDistance < 6 && onLocationSelect && mapRef.current) {
          const rect = mapRef.current.getBoundingClientRect();
          const center = project(view.lat, view.lng, view.zoom);
          const topLeft = {
            x: center.x - Math.max(size.width, 1) / 2,
            y: center.y - Math.max(size.height, 1) / 2,
          };
          const location = unproject(
            topLeft.x + event.clientX - rect.left,
            topLeft.y + event.clientY - rect.top,
            view.zoom
          );

          onLocationSelect({
            lat: Number(location.lat.toFixed(5)),
            lng: Number(location.lng.toFixed(5)),
          });
        }

        dragRef.current = null;
        setIsDragging(false);
      }
    },
    [onLocationSelect, size.height, size.width, view.lat, view.lng, view.zoom]
  );

  // Anime le zoom de façon continue (easing) au lieu de sauter d'un niveau entier.
  const animateZoomBy = useCallback((delta: number) => {
    const startZoom = viewRef.current.zoom;
    const targetZoom = clamp(startZoom + delta, MIN_ZOOM, MAX_ZOOM);

    if (zoomFrameRef.current !== null) {
      window.cancelAnimationFrame(zoomFrameRef.current);
      zoomFrameRef.current = null;
    }

    if (targetZoom === startZoom) {
      return;
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / ZOOM_ANIMATION_MS, 1);
      const nextZoom = startZoom + (targetZoom - startZoom) * easeOutCubic(progress);

      setView((current) => ({ ...current, zoom: nextZoom }));

      if (progress < 1) {
        zoomFrameRef.current = window.requestAnimationFrame(step);
      } else {
        zoomFrameRef.current = null;
      }
    };

    zoomFrameRef.current = window.requestAnimationFrame(step);
  }, []);

  return (
    <div
      ref={mapRef}
      className={`satellite-map${isDragging ? ' satellite-map-dragging' : ''}`}
      role="img"
      aria-label="Vue satellite interactive de territoires céréaliers"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onLostPointerCapture={() => {
        dragRef.current = null;
        setIsDragging(false);
      }}
    >
      <div className="satellite-map-tile-layer satellite-map-tile-layer-base" aria-hidden="true">
        {geometry.baseTiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.key}
            className="satellite-map-tile"
            src={tile.src}
            alt=""
            draggable={false}
            decoding="async"
            loading="eager"
            fetchPriority="high"
            style={{
              height: `${tile.size}px`,
              transform: `translate3d(${tile.left}px, ${tile.top}px, 0)`,
              width: `${tile.size}px`,
            }}
          />
        ))}
      </div>

      <div className="satellite-map-tile-layer" aria-hidden="true">
        {geometry.tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.key}
            className="satellite-map-tile"
            src={tile.src}
            alt=""
            draggable={false}
            decoding="async"
            loading="eager"
            fetchPriority="low"
            style={{
              height: `${tile.size}px`,
              transform: `translate3d(${tile.left}px, ${tile.top}px, 0)`,
              width: `${tile.size}px`,
            }}
          />
        ))}
      </div>

      <div className="satellite-map-tile-layer satellite-map-label-layer" aria-hidden="true">
        {geometry.labelTiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.key}
            className="satellite-map-label-tile"
            src={tile.src}
            alt=""
            draggable={false}
            decoding="async"
            loading="eager"
            style={{
              height: `${tile.size}px`,
              transform: `translate3d(${tile.left}px, ${tile.top}px, 0)`,
              width: `${tile.size}px`,
            }}
          />
        ))}
      </div>

      {geometry.selectedMarker && (
        <span
          className="satellite-map-selected-pin"
          aria-hidden="true"
          style={{
            left: `${geometry.selectedMarker.left}px`,
            top: `${geometry.selectedMarker.top}px`,
          }}
        />
      )}

      <div className="satellite-map-controls" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" aria-label="Zoom avant" onClick={() => animateZoomBy(1)}>
          +
        </button>
        <button type="button" aria-label="Zoom arrière" onClick={() => animateZoomBy(-1)}>
          -
        </button>
      </div>
    </div>
  );
}
