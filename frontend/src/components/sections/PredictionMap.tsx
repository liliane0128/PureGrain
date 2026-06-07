'use client';

import { useMemo, useState } from 'react';
import { CloudRain, Droplets, Gauge, Sun, Thermometer, Wind } from 'lucide-react';
import { SatelliteMap, type MapLocation } from './SatelliteMap';

type WeatherInputs = {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind: number;
  sunshine: number;
  pressure: number;
};

const DEFAULT_WEATHER: WeatherInputs = {
  temperature: 23,
  humidity: 78,
  rainfall: 9,
  wind: 14,
  sunshine: 7,
  pressure: 1014,
};

function randomWeather(): WeatherInputs {
  const between = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
  return {
    temperature: between(11, 33),
    humidity: between(55, 97),
    rainfall: between(0, 26),
    wind: between(4, 42),
    sunshine: between(2, 13),
    pressure: between(995, 1030),
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatCoordinate(value: number, positiveSuffix: string, negativeSuffix: string) {
  return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positiveSuffix : negativeSuffix}`;
}

function toxinColor(pct: number): string {
  if (pct < 33) return '#34d399';
  if (pct < 66) return '#f5b34d';
  return '#f87171';
}

const TOXIN_BARS = [
  { key: 'ZEN' as const, label: 'Zéaralénone' },
  { key: 'DON' as const, label: 'Déoxynivalénol' },
  { key: 'FUM' as const, label: 'Fumonisines' },
];

const CROP_OPTIONS = [
  { value: 'wheat'  as const, label: 'Blé' },
  { value: 'maize'  as const, label: 'Maïs' },
  { value: 'barley' as const, label: 'Orge' },
];

export function PredictionMap() {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [weather, setWeather] = useState<WeatherInputs>(DEFAULT_WEATHER);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toxinResults, setToxinResults] = useState<{ ZEN: number; DON: number; FUM: number } | null>(null);
  const [locationName, setLocationName] = useState<{ country: string; region: string } | null>(null);
  const [cropGroup, setCropGroup] = useState<'wheat' | 'maize' | 'barley'>('wheat');

  const currentDate = useMemo(() => new Date(), []);
  const today = useMemo(() => formatDate(currentDate), [currentDate]);

  const handleLocationSelect = async (location: MapLocation) => {
    setSelectedLocation(location);
    setHasSubmitted(false);
    setToxinResults(null);
    setLocationName(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      setLocationName({
        country: data.address?.country ?? '',
        region: data.address?.state ?? data.address?.county ?? '',
      });
    } catch {
      // geocoding is best-effort
    }
  };

  const launchSimulation = async () => {
    if (!selectedLocation) return;
    setIsLoading(true);
    setToxinResults(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

    try {
      const res = await fetch(`${apiUrl}/api/v1/predict/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedLocation.lat,
          lon: selectedLocation.lng,
          crop_group: cropGroup,
          sampling_point: 'Primary production',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const w = data.weather as Record<string, number>;
        setWeather({
          temperature: Math.round(w.temperature_2m_mean ?? DEFAULT_WEATHER.temperature),
          humidity: Math.round(w.relative_humidity_2m_mean ?? DEFAULT_WEATHER.humidity),
          rainfall: Math.round(w.precipitation_sum ?? DEFAULT_WEATHER.rainfall),
          wind: DEFAULT_WEATHER.wind,
          sunshine: Math.round((1 - (w.cloud_cover_mean ?? 50) / 100) * 13),
          pressure: DEFAULT_WEATHER.pressure,
        });
        if (data.toxins) {
          setToxinResults({
            ZEN: data.toxins.ZEN ?? 0,
            DON: data.toxins.DON ?? 0,
            FUM: data.toxins.FUM ?? 0,
          });
        }
      } else {
        setWeather(randomWeather());
      }
    } catch {
      setWeather(randomWeather());
    }

    setIsLoading(false);
    setHasSubmitted(true);
    requestAnimationFrame(() => {
      document.getElementById('simulation-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const weatherCards = [
    { key: 'temp', Icon: Thermometer, value: weather.temperature, unit: ' °C', label: 'Température', color: '#f5b34d' },
    { key: 'sun', Icon: Sun, value: weather.sunshine, unit: ' h', label: 'Ensoleillement', color: '#fbbf24' },
    { key: 'rain', Icon: CloudRain, value: weather.rainfall, unit: ' mm', label: 'Pluviométrie', color: '#60a5fa' },
    { key: 'humidity', Icon: Droplets, value: weather.humidity, unit: ' %', label: 'Humidité', color: '#34d399' },
    { key: 'wind', Icon: Wind, value: weather.wind, unit: ' km/h', label: 'Vent', color: '#94a3b8' },
    { key: 'pressure', Icon: Gauge, value: weather.pressure, unit: ' hPa', label: 'Pression', color: '#a78bfa' },
  ];

  return (
    <>
      {/* Section carte : localisation + lancement */}
      <section id="prediction-map" className="prediction-dashboard-section">
        <div className="prediction-dashboard-header">
          <h2>Simulateur agronomique prédictif</h2>
          <p>
            Localisez une parcelle sur la carte satellite, puis lancez le calcul : la météo et les
            résultats s&apos;affichent dans la section suivante.
          </p>
        </div>

        <div className="prediction-dashboard-layout">
          <div className="prediction-map-canvas">
            <SatelliteMap selectedLocation={selectedLocation} onLocationSelect={handleLocationSelect} />

            <div className="prediction-overlay-panel prediction-overlay-left">
              <div className="prediction-location-info">
                <span>Coordonnées de la parcelle</span>
                {selectedLocation ? (
                  <>
                    <strong>
                      {locationName
                        ? `${locationName.country}${locationName.region ? ` · ${locationName.region}` : ''}`
                        : '…'}
                    </strong>
                    <small>
                      {formatCoordinate(selectedLocation.lat, 'N', 'S')} · {formatCoordinate(selectedLocation.lng, 'E', 'O')}
                    </small>
                  </>
                ) : (
                  <strong>Cliquez sur la carte</strong>
                )}
                <small>Date d&apos;analyse : {today}</small>
              </div>

              <div className="crop-selector">
                {CROP_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`crop-selector-btn${cropGroup === value ? ' is-active' : ''}`}
                    onClick={() => setCropGroup(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="prediction-action-btn"
                disabled={!selectedLocation || isLoading}
                onClick={launchSimulation}
              >
                {isLoading ? 'Analyse en cours…' : 'Lancer la simulation'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section résultats : météo + barres toxines */}
      <section id="simulation-results" className="simulation-results-section">
        <div className="container sim-results-inner">
          <header className="sim-results-header">
            <h2>Météo et risque de contamination</h2>
          </header>

          {hasSubmitted ? (
            <div className="sim-results-grid">
              {/* Panneau météo */}
              <aside className="sim-weather-panel">
                <h3 className="sim-panel-title">Conditions météo</h3>
                <div className="sim-weather-grid">
                  {weatherCards.map(({ key, Icon, value, unit, label, color }) => (
                    <div className="sim-weather-card" key={key}>
                      <Icon className="sim-weather-icon" style={{ color }} aria-hidden="true" />
                      <strong>
                        {value}
                        {unit}
                      </strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </aside>

              {/* Barres toxines */}
              <div className="sim-output">
                <div className="sim-risk-card">
                  <p className="sim-panel-title" style={{ marginBottom: 16 }}>Risque mycotoxines</p>
                  {toxinResults ? (() => {
                    const PAD_L = 34, PAD_R = 50, PAD_T = 14, PAD_B = 28;
                    const VW = 300, VH = 168;
                    const iW = VW - PAD_L - PAD_R;
                    const iH = VH - PAD_T - PAD_B;
                    const slotW = iW / 3;
                    const barW = slotW * 0.46;
                    const yFor = (pct: number) => PAD_T + iH * (1 - pct / 100);
                    return (
                      <svg viewBox={`0 0 ${VW} ${VH}`} className="toxin-chart" aria-label="Risque mycotoxines">
                        {/* Y-axis labels only */}
                        {[0, 25, 50, 75, 100].map(v => (
                          <text key={v} x={PAD_L - 4} y={yFor(v) + 3.5} textAnchor="end"
                            fontSize={8.5} fill="rgba(255,255,255,0.3)">{v}%</text>
                        ))}
                        {/* threshold lines (colored) + zone labels outside chart */}
                        {([
                          { v: 66, topV: 100, label: 'Élevé',  color: '#f87171' },
                          { v: 33, topV: 66,  label: 'Modéré', color: '#f5b34d' },
                          { v: 0,  topV: 33,  label: 'Faible', color: '#34d399' },
                        ] as { v: number; topV: number; label: string; color: string }[]).map(({ v, topV, label, color }) => (
                          <g key={label}>
                            {v > 0 && (
                              <line x1={PAD_L} y1={yFor(v)} x2={VW - PAD_R} y2={yFor(v)}
                                stroke={color} strokeOpacity={0.45} strokeWidth={1} strokeDasharray="4 3" />
                            )}
                            <text
                              x={VW - PAD_R + 8}
                              y={(yFor(topV) + yFor(v)) / 2 + 3.5}
                              textAnchor="start"
                              fontSize={8}
                              fill={color}
                              opacity={0.85}
                              fontWeight={600}
                            >{label}</text>
                          </g>
                        ))}
                        {/* bars */}
                        {TOXIN_BARS.map(({ key, label }, i) => {
                          const pct = toxinResults[key];
                          const color = toxinColor(pct);
                          const cx = PAD_L + (i + 0.5) * slotW;
                          const bh = (pct / 100) * iH;
                          const by = yFor(pct);
                          return (
                            <g key={key}>
                              <rect x={cx - barW / 2} y={by} width={barW} height={bh}
                                rx={4} fill={color} opacity={0.82} />
                              <text x={cx} y={by - 5} textAnchor="middle"
                                fontSize={10} fill={color} fontWeight={700}>{pct}%</text>
                              <text x={cx} y={VH - PAD_B + 13} textAnchor="middle"
                                fontSize={9.5} fill="rgba(255,255,255,0.5)">{key}</text>
                              <text x={cx} y={VH - PAD_B + 24} textAnchor="middle"
                                fontSize={8} fill="rgba(255,255,255,0.28)">{label}</text>
                            </g>
                          );
                        })}
                        {/* X axis */}
                        <line x1={PAD_L} y1={PAD_T + iH} x2={VW - PAD_R} y2={PAD_T + iH}
                          stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
                      </svg>
                    );
                  })() : (
                    <p style={{ color: '#64748b', fontSize: 13 }}>
                      Résultats du modèle en attente…
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="sim-results-empty">
              <span className="empty-state-icon">📡</span>
              <strong>En attente d&apos;une simulation</strong>
              <p>
                Localisez une parcelle sur la carte ci-dessus et lancez la simulation pour afficher
                ici la météo et le risque de contamination.
              </p>
              <a className="btn btn-secondary" href="#prediction-map">
                Revenir à la carte
              </a>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
