'use client';

import { useMemo, useState } from 'react';
import { SatelliteMap, type MapLocation } from './SatelliteMap';
import { ImportCSV } from '@/components/ImportCSV';

const fungalTargets = ['Fusarium graminearum', 'Fusarium culmorum', 'Fusarium verticillioides'];

const toxinTargets = [
  { label: 'Zéaralénone (ZEN)', thresholdUgKg: 100, growthWeight: 0.92 },
  { label: 'Déoxynivalénol (DON)', thresholdUgKg: 1250, growthWeight: 1.08 },
  { label: 'Fumonisines', thresholdUgKg: 1000, growthWeight: 1 },
] as const;

type ToxinTarget = (typeof toxinTargets)[number];
type ToxinLabel = ToxinTarget['label'];

type CurvePoint = {
  day: number;
  value: number;
};

type WeatherDay = {
  date: string;
  humidity: number;
  rainMm: number;
  temperatureMax: number;
  temperatureMin: number;
  windKmh: number;
};

type ChartProps = {
  areaClassName?: string;
  label: string;
  lineClassName?: string;
  points: CurvePoint[];
  threshold?: number;
  unit: string;
};

function formatCoordinate(value: number, positiveSuffix: string, negativeSuffix: string) {
  return `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positiveSuffix : negativeSuffix}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function buildPreHarvestWeather(harvestDate: Date, seed: number): WeatherDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const dayOffset = index - 7;
    const daySeed = Math.abs(Math.sin(seed * 18.37 + index * 4.91));
    const temperatureMin = Math.round(9 + daySeed * 8 + index * 0.35);
    const temperatureMax = Math.round(
      temperatureMin + 7 + Math.abs(Math.cos(seed * 7 + index)) * 6
    );
    const rainMm = Number((Math.max(0, Math.sin(seed * 9 + index * 1.7)) * 13.5).toFixed(1));
    const humidity = Math.round(clamp(58 + rainMm * 2.1 + daySeed * 18, 52, 96));
    const windKmh = Math.round(8 + Math.abs(Math.cos(seed * 12 + index * 2.2)) * 28);

    return {
      date: formatDate(addDays(harvestDate, dayOffset)),
      humidity,
      rainMm,
      temperatureMax,
      temperatureMin,
      windKmh,
    };
  });
}

function buildPrediction(
  fungus: string,
  toxin: ToxinTarget,
  location: MapLocation | null,
  currentDate: Date
) {
  if (!location) {
    return null;
  }

  const seed = Math.abs(
    Math.sin(
      location.lat * 12.9898 + location.lng * 78.233 + fungus.length * 4.7 + toxin.label.length
    )
  );
  const fungalStart = 8 + seed * 18;
  const harvestOffsetDays = 24 + Math.round(seed * 16);
  const harvestDate = addDays(currentDate, harvestOffsetDays);
  const fungalGrowth = 1.13 + seed * 0.12 + toxin.growthWeight * 0.015;
  const fungalCurve = Array.from({ length: 12 }, (_, index) => {
    const day = index * 3;
    const value = clamp(
      Math.round(fungalStart * Math.pow(fungalGrowth, index) + index * (2.2 + seed * 2.1)),
      0,
      100
    );

    return { day, value };
  });
  const contaminationUgKg = Math.round(
    toxin.thresholdUgKg *
      clamp(0.2 + seed * 0.86 + fungalCurve[0].value / 190 + toxin.growthWeight * 0.08, 0.18, 1.58)
  );
  const dailyToxinGrowth = 1.026 + seed * 0.042 + toxin.growthWeight * 0.009;
  const toxinCurve = Array.from({ length: 12 }, (_, index) => {
    const day = index * 3;
    const value = Math.round(contaminationUgKg * Math.pow(dailyToxinGrowth, day));

    return { day, value };
  });
  let thresholdDay: number | null = null;

  for (let day = 0; day <= 60; day += 1) {
    const projectedContamination = contaminationUgKg * Math.pow(dailyToxinGrowth, day);

    if (projectedContamination >= toxin.thresholdUgKg) {
      thresholdDay = day;
      break;
    }
  }

  return {
    contaminationUgKg,
    fungalCurve,
    fungalEnd: fungalCurve[fungalCurve.length - 1].value,
    harvestDate: formatDate(harvestDate),
    thresholdDate:
      thresholdDay === null
        ? 'Pas de dépassement prévu à 60 jours'
        : formatDate(addDays(currentDate, thresholdDay)),
    thresholdLabel:
      thresholdDay === null
        ? 'Sous le seuil suivi'
        : thresholdDay === 0
          ? 'Seuil déjà dépassé'
          : `Dépassement prévu dans ${thresholdDay} jours`,
    thresholdUgKg: toxin.thresholdUgKg,
    toxinCurve,
    weatherDays: buildPreHarvestWeather(harvestDate, seed),
  };
}

function PredictionChart({
  areaClassName = '',
  label,
  lineClassName = '',
  points,
  threshold,
  unit,
}: ChartProps) {
  const width = 680;
  const height = 240;
  const padding = 34;
  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values, threshold ?? 0, 1);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const coordinates = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * plotWidth;
    const y = height - padding - (point.value / maxValue) * plotHeight;

    return { ...point, x, y };
  });
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const thresholdY =
    threshold === undefined ? null : height - padding - (threshold / maxValue) * plotHeight;
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <svg
      className="prediction-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
      {thresholdY !== null && (
        <>
          <line
            className="prediction-chart-threshold"
            x1={padding}
            y1={thresholdY}
            x2={width - padding}
            y2={thresholdY}
          />
          <text x={padding + 8} y={Math.max(thresholdY - 8, 18)}>
            seuil {threshold} {unit}
          </text>
        </>
      )}
      <path className={`prediction-chart-area ${areaClassName}`} d={areaPath} />
      <path className={`prediction-chart-line ${lineClassName}`} d={linePath} />
      {coordinates.map((point) => (
        <circle key={point.day} cx={point.x} cy={point.y} r="4" />
      ))}
      {lastPoint && (
        <text x={lastPoint.x - 110} y={Math.max(lastPoint.y - 14, 18)}>
          {lastPoint.value} {unit} à J+{lastPoint.day}
        </text>
      )}
      <text x={padding} y={height - 7}>
        Aujourd’hui
      </text>
      <text x={width - padding - 56} y={height - 7}>
        J+33
      </text>
    </svg>
  );
}

export function PredictionMap() {
  const [selectedFungus, setSelectedFungus] = useState(fungalTargets[0]);
  const [selectedToxin, setSelectedToxin] = useState<ToxinLabel>(toxinTargets[0].label);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [weatherPreview, setWeatherPreview] = useState<any | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const currentDate = useMemo(() => new Date(), []);
  const today = useMemo(() => formatDate(currentDate), [currentDate]);
  
  const selectedToxinConfig = useMemo(
    () => toxinTargets.find((toxin) => toxin.label === selectedToxin) ?? toxinTargets[0],
    [selectedToxin]
  );
  
  const prediction = useMemo(
    () => buildPrediction(selectedFungus, selectedToxinConfig, selectedLocation, currentDate),
    [currentDate, selectedFungus, selectedLocation, selectedToxinConfig]
  );

  const handleLocationSelect = (location: MapLocation) => {
    setSelectedLocation(location);
    setHasSubmitted(false);
  };

  const weatherApiUrl = process.env.NEXT_PUBLIC_WEATHER_API_URL || "http://localhost:8000/api/v1/map/weather";

  async function fetchWeather(confirm = false) {
    setWeatherError(null);
    setWeatherLoading(true);
    setWeatherPreview(null);
    try {
      if (!selectedLocation) throw new Error("Aucune position sélectionnée");
      const payload = {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        days: 7,
        confirm,
      };

      const res = await fetch(weatherApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        data = { raw: text };
      }

      if (!res.ok) {
        const detail = data?.detail ?? data ?? text;
        throw new Error(String(detail));
      }

      setWeatherPreview(data);
    } catch (e: any) {
      setWeatherError(e?.message ?? "Erreur réseau");
    } finally {
      setWeatherLoading(false);
    }
  }

  return (
    <section id="prediction-map" className="prediction-dashboard-section">
      <div className="prediction-dashboard-header">
        <span className="section-badge-glow">Console de prédiction</span>
        <h2>Simulateur agronomique prédictif</h2>
        <p>
          Définissez les paramètres cibles, localisez une parcelle sur la carte satellite interactive, puis lancez le calcul prédictif.
        </p>
      </div>

      <div className="prediction-dashboard-layout">
        <div className="prediction-map-canvas">
          <SatelliteMap selectedLocation={selectedLocation} onLocationSelect={handleLocationSelect} />
          
          {/* Overlay gauche: Configuration & Inputs */}
          <div className="prediction-overlay-panel prediction-overlay-left">
            <h3 className="overlay-panel-title">Paramètres</h3>
            
            <div className="prediction-field-group">
              <label htmlFor="fungus-select">Champignon à prédire</label>
              <select
                id="fungus-select"
                className="prediction-input-select"
                value={selectedFungus}
                onChange={(e) => {
                  setSelectedFungus(e.target.value);
                  setHasSubmitted(false);
                }}
              >
                {fungalTargets.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="prediction-field-group">
              <label htmlFor="toxin-select">Toxine à suivre</label>
              <select
                id="toxin-select"
                className="prediction-input-select"
                value={selectedToxin}
                onChange={(e) => {
                  setSelectedToxin(e.target.value as ToxinLabel);
                  setHasSubmitted(false);
                }}
              >
                {toxinTargets.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="prediction-location-info">
              <span>Coordonnées de la parcelle</span>
              <strong>
                {selectedLocation
                  ? `${formatCoordinate(selectedLocation.lat, 'N', 'S')} · ${formatCoordinate(
                      selectedLocation.lng,
                      'E',
                      'O'
                    )}`
                  : 'Cliquez sur la carte'}
              </strong>
              <small>Date d&apos;analyse: {today}</small>
            </div>

            <button
              type="button"
              className="prediction-action-btn"
              disabled={!selectedLocation}
              onClick={() => setHasSubmitted(true)}
            >
              Lancer la simulation
            </button>

            {/* Upload CSV intégré dans le panneau de configuration pour rester visible */}
            <div style={{ marginTop: 12 }}>
              <ImportCSV />
            </div>

            {/* Weather preview & save controls */}
            <div style={{ marginTop: 12 }}>
              <h4 style={{ marginBottom: 8 }}>Météo & CSV</h4>
              <div className="prediction-field-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fetchWeather(false)}
                  disabled={!selectedLocation || weatherLoading}
                >
                  {weatherLoading ? "Chargement..." : "Prévisualiser la météo"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => fetchWeather(true)}
                  disabled={!selectedLocation || weatherLoading}
                  style={{ marginLeft: 8 }}
                >
                  {weatherLoading ? "En cours..." : "Confirmer et créer CSV"}
                </button>
              </div>

              {weatherError && <div className="text-red-600 mt-2">Erreur: {weatherError}</div>}

              {weatherPreview && (
                <div className="mt-3 bg-white p-2 rounded shadow-sm">
                  <div style={{ fontSize: 12, marginBottom: 6 }}>
                    <strong>Aperçu météo</strong> — {weatherPreview.n_rows} jours
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <div>Temp moyenne (moy): {String(weatherPreview.aggregates.temperature_2m_mean)}</div>
                    <div>Précipitations totales: {String(weatherPreview.aggregates.precipitation_sum)}</div>
                    {weatherPreview.filename && (
                      <div className="text-green-700">Fichier créé: {weatherPreview.filename}</div>
                    )}
                  </div>
                  <details className="mt-2">
                    <summary className="text-sm text-muted">Voir échantillon</summary>
                    <pre className="text-xs mt-2 max-h-40 overflow-auto">{JSON.stringify(weatherPreview.sample, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          </div>

          {/* Overlay droit: Résultats & Graphes */}
          <div className={`prediction-overlay-panel prediction-overlay-right ${hasSubmitted && prediction ? 'is-open' : ''}`}>
            {hasSubmitted && prediction ? (
              <div className="prediction-results-content">
                <h3 className="overlay-panel-title">Analyse prédictive</h3>
                
                <div className="results-numbers-row">
                  <div className="result-number-box">
                    <span>Contamination estimée</span>
                    <strong>{prediction.contaminationUgKg} µg/kg</strong>
                    <small>Seuil suivi : {prediction.thresholdUgKg} µg/kg</small>
                  </div>
                  <div className="result-number-box">
                    <span>Alerte dépassement</span>
                    <strong className="text-warning">{prediction.thresholdDate}</strong>
                    <small>{prediction.thresholdLabel}</small>
                  </div>
                </div>

                <div className="results-charts-container">
                  <div className="chart-item-box">
                    <span>Contamination en {selectedToxin}</span>
                    <PredictionChart
                      label="Courbe de contamination de la toxine"
                      points={prediction.toxinCurve}
                      threshold={prediction.thresholdUgKg}
                      unit="µg/kg"
                    />
                  </div>
                  <div className="chart-item-box">
                    <span>Contamination fongique ({selectedFungus})</span>
                    <PredictionChart
                      areaClassName="prediction-chart-area-blue"
                      label="Courbe de contamination fongique"
                      lineClassName="prediction-chart-line-blue"
                      points={prediction.fungalCurve}
                      unit="%"
                    />
                  </div>
                </div>

                <div className="results-weather-box">
                  <span>Météo simulée pré-récolte (Harvest: {prediction.harvestDate})</span>
                  <div className="weather-forecast-row">
                    {prediction.weatherDays.slice(0, 4).map((day) => (
                      <div className="weather-forecast-day" key={day.date}>
                        <small>{day.date.split(' ')[0]}</small>
                        <strong>{day.temperatureMax}°C</strong>
                        <small>{day.rainMm}mm pluie</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="results-empty-state">
                <span className="empty-state-icon">📡</span>
                <strong>En attente d&apos;une parcelle</strong>
                <p>Cliquez sur une zone agricole de la carte pour définir les coordonnées, puis lancez la simulation.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
