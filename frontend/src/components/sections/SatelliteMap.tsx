'use client';

import { useEffect, useRef, useState } from 'react';

export type MapLocation = {
  lat: number;
  lng: number;
};

type SatelliteMapProps = {
  selectedLocation?: MapLocation | null;
  onLocationSelect?: (location: MapLocation) => void;
};

export function SatelliteMap({ selectedLocation = null, onLocationSelect }: SatelliteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any | null>(null);
  const markerInstanceRef = useRef<any | null>(null);
  const [LInstance, setLInstance] = useState<any | null>(null);

  // Dynamically load Leaflet on the client side to avoid SSR "window is not defined" error
  useEffect(() => {
    import('leaflet').then((leafletModule) => {
      import('leaflet/dist/leaflet.css');
      setLInstance(leafletModule.default);
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!LInstance || !mapContainerRef.current || mapInstanceRef.current) return;

    const L = LInstance;

    // Define initial map state
    const initialLat = selectedLocation?.lat ?? 46.45;
    const initialLng = selectedLocation?.lng ?? 2.25;
    const initialZoom = selectedLocation ? 12 : 6;

    // Create custom glowing marker icon
    const customIcon = L.divIcon({
      className: 'leaflet-custom-marker',
      html: '<div class="custom-pin"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28], // Anchor pin point exactly in the center bottom
    });

    // Create the Leaflet map instance
    const map = L.map(mapContainerRef.current, {
      zoomControl: false, // Position custom Zoom control at top-right
      attributionControl: true,
    }).setView([initialLat, initialLng], initialZoom);

    mapInstanceRef.current = map;

    // Add Zoom control in the top-right corner to match design
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Esri World Imagery (Satellite) Layer
    const satelliteBase = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      }
    );

    // Esri World Boundaries and Places Layer (city names, borders, roads)
    const satelliteLabels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
      }
    );

    // Group them so that satellite view includes both the imagery and the text overlays
    const satelliteGroup = L.layerGroup([satelliteBase, satelliteLabels]);

    // OpenStreetMap (Road/Plan) Layer
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });

    // Default to satellite to preserve the agricultural theme of the site
    satelliteGroup.addTo(map);

    // Layer switcher (Vue Plan / Vue Satellite) in the bottom-left
    const baseLayers = {
      'Vue Satellite': satelliteGroup,
      'Vue Plan (OpenStreetMap)': osm,
    };
    L.control.layers(baseLayers, {}, { position: 'bottomleft' }).addTo(map);

    // Add a marker if a location is already selected on mount
    if (selectedLocation) {
      markerInstanceRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: customIcon,
      }).addTo(map);
    }

    // Capture clicks on the map to trigger onLocationSelect
    map.on('click', (e: any) => {
      if (onLocationSelect) {
        onLocationSelect({
          lat: Number(e.latlng.lat.toFixed(5)),
          lng: Number(e.latlng.lng.toFixed(5)),
        });
      }
    });

    // Clean up Leaflet map instance on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [LInstance]);

  // Synchronize the marker and viewport center when selectedLocation changes
  useEffect(() => {
    if (!LInstance || !mapInstanceRef.current) return;

    const L = LInstance;
    const map = mapInstanceRef.current;

    const customIcon = L.divIcon({
      className: 'leaflet-custom-marker',
      html: '<div class="custom-pin"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    if (selectedLocation) {
      const pos: [number, number] = [selectedLocation.lat, selectedLocation.lng];
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng(pos);
      } else {
        markerInstanceRef.current = L.marker(pos, { icon: customIcon }).addTo(map);
      }

      // Center the viewport on the selected coordinates
      map.panTo(pos);
    } else {
      if (markerInstanceRef.current) {
        markerInstanceRef.current.remove();
        markerInstanceRef.current = null;
      }
    }
  }, [selectedLocation, LInstance]);

  return (
    <div className="satellite-map" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {!LInstance && (
        <div
          className="satellite-map-placeholder"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            color: 'var(--color-primary-light)',
            background: 'linear-gradient(135deg, #22352d, #111b19)',
            fontSize: 'var(--font-size-lg)',
            fontWeight: 800,
            zIndex: 10,
          }}
        >
          Chargement de la carte interactive...
        </div>
      )}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
