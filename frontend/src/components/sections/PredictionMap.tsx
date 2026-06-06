'use client';

import { useMemo, useState } from 'react';
import { SatelliteMap, type MapLocation } from './SatelliteMap';

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

// Variables météo choisies par l'utilisateur (entrées du modèle).
type WeatherInputs = {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind: number;
};

const DEFAULT_WEATHER: WeatherInputs = {
  temperature: 23,
  humidity: 78,
  rainfall: 9,
  wind: 14,
};

type RiskLevel = 'green' | 'orange' | 'red';

// Métadonnées d'affichage par niveau de risque (aligné sur risk_level du backend).
const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  green: { label: 'Risque faible', color: '#34d399' },
  orange: { label: 'Risque modéré', color: '#f5b34d' },
  red: { label: 'Risque élevé', color: '#f87171' },
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

function buildPrediction(
  fungus: string,
  toxin: ToxinTarget,
  location: MapLocation | null,
  weather: WeatherInputs,
  currentDate: Date
) {
  if (!location) {
    return null;
  }

  // Petite variabilité spatiale stable issue de la parcelle.
  const seed = Math.abs(
    Math.sin(location.lat * 12.9898 + location.lng * 78.233 + fungus.length * 4.7)
  );

  // Facteurs de favorabilité météo pour Fusarium / mycotoxines.
  const humidityFactor = clamp((weather.humidity - 50) / 45, 0, 1);
  const rainFactor = clamp(weather.rainfall / 25, 0, 1);
  const tempFactor = clamp(1 - Math.abs(weather.temperature - 25) / 22, 0, 1);
  const windFactor = clamp(1 - weather.wind / 60, 0, 1); // vent fort = assèchement
  const weatherPressure = clamp(
    0.34 * humidityFactor + 0.32 * rainFactor + 0.22 * tempFactor + 0.12 * windFactor,
    0,
    1
  );

  const harvestOffsetDays = 24 + Math.round(seed * 16);
  const harvestDate = addDays(currentDate, harvestOffsetDays);

  const fungalStart = 8 + weatherPressure * 22 + seed * 6;
  const fungalGrowth = 1.1 + weatherPressure * 0.16 + toxin.growthWeight * 0.015;
  const fungalCurve = Array.from({ length: 12 }, (_, index) => ({
    day: index * 3,
    value: clamp(
      Math.round(fungalStart * Math.pow(fungalGrowth, index) + index * (1.8 + weatherPressure * 2.4)),
      0,
      100
    ),
  }));

  const contaminationUgKg = Math.round(
    toxin.thresholdUgKg *
      clamp(0.18 + weatherPressure * 1.15 + toxin.growthWeight * 0.06, 0.16, 1.7)
  );
  const dailyToxinGrowth = 1.02 + weatherPressure * 0.05 + toxin.growthWeight * 0.008;
  const toxinCurve = Array.from({ length: 12 }, (_, index) => ({
    day: index * 3,
    value: Math.round(contaminationUgKg * Math.pow(dailyToxinGrowth, index * 3)),
  }));

  let thresholdDay: number | null = null;

  for (let day = 0; day <= 60; day += 1) {
    if (contaminationUgKg * Math.pow(dailyToxinGrowth, day) >= toxin.thresholdUgKg) {
      thresholdDay = day;
      break;
    }
  }

  // Score de risque (0-1) puis probabilités 3 classes (vert / orange / rouge).
  const riskScore = clamp(
    0.12 + weatherPressure * 0.62 + (contaminationUgKg / toxin.thresholdUgKg) * 0.3,
    0,
    1
  );
  const rawGreen = Math.max(0, 1 - riskScore * 2);
  const rawRed = Math.max(0, (riskScore - 0.5) * 2);
  const rawOrange = Math.max(0, 1 - Math.abs(riskScore - 0.5) * 2);
  const total = rawGreen + rawOrange + rawRed || 1;
  const probabilities = {
    green: rawGreen / total,
    orange: rawOrange / total,
    red: rawRed / total,
  };
  const level: RiskLevel =
    probabilities.red >= probabilities.orange && probabilities.red >= probabilities.green
      ? 'red'
      : probabilities.orange >= probabilities.green
        ? 'orange'
        : 'green';

  const storageRecommendation =
    level === 'red'
      ? 'Séchage immédiat ou tri du lot avant tout stockage'
      : level === 'orange'
        ? 'Ventilation renforcée et nouveau contrôle sous 7 jours'
        : 'Stockage standard, surveillance légère suffisante';

  const topFactors = [
    { label: 'Humidité', weight: humidityFactor },
    { label: 'Pluviométrie', weight: rainFactor },
    { label: 'Température', weight: tempFactor },
    { label: 'Charge fongique', weight: fungalCurve[fungalCurve.length - 1].value / 100 },
  ]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((factor) => factor.label);

  return {
    contaminationUgKg,
    thresholdUgKg: toxin.thresholdUgKg,
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
    fungalCurve,
    toxinCurve,
    risk: { level, score: riskScore, probabilities, storageRecommendation, topFactors },
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
  const height = 220;
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
    <svg className="prediction-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
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

type WeatherSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
};

function WeatherSlider({ label, value, min, max, step, unit, onChange }: WeatherSliderProps) {
  return (
    <label className="sim-weather-slider">
      <span className="sim-weather-slider-head">
        <span>{label}</span>
        <strong>
          {value}
          {unit}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function PredictionMap() {
  const [selectedFungus, setSelectedFungus] = useState(fungalTargets[0]);
  const [selectedToxin, setSelectedToxin] = useState<ToxinLabel>(toxinTargets[0].label);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [weather, setWeather] = useState<WeatherInputs>(DEFAULT_WEATHER);
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
    () => buildPrediction(selectedFungus, selectedToxinConfig, selectedLocation, weather, currentDate),
    [currentDate, selectedFungus, selectedLocation, selectedToxinConfig, weather]
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
  const launchSimulation = () => {
    setHasSubmitted(true);
    requestAnimationFrame(() => {
      document.getElementById('simulation-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const setWeatherField = (field: keyof WeatherInputs) => (value: number) =>
    setWeather((current) => ({ ...current, [field]: value }));

  const risk = prediction?.risk;
  const riskMeta = risk ? RISK_META[risk.level] : null;

  return (
    <>
      {/* Section carte : configuration de la parcelle + lancement */}
      <section id="prediction-map" className="prediction-dashboard-section">
        <div className="prediction-dashboard-header">
          <span className="section-badge-glow">Console de prédiction</span>
          <h2>Simulateur agronomique prédictif</h2>
          <p>
            Définissez les paramètres cibles, localisez une parcelle sur la carte satellite, puis
            lancez le calcul : la météo et les résultats s’affichent dans la section suivante.
          </p>
        </div>

        <div className="prediction-dashboard-layout">
          <div className="prediction-map-canvas">
            <SatelliteMap selectedLocation={selectedLocation} onLocationSelect={handleLocationSelect} />

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
                onClick={launchSimulation}
              >
                Lancer la simulation
              </button>
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
        </div>
      </section>

      {/* Section résultats : météo choisie + sorties du modèle */}
      <section id="simulation-results" className="simulation-results-section">
        <div className="container sim-results-inner">
          <header className="sim-results-header">
            <span className="section-badge-glow">Résultats de simulation</span>
            <h2>Météo, risque et trajectoire de contamination</h2>
          </header>

          {hasSubmitted && prediction && risk && riskMeta ? (
            <div className="sim-results-grid">
              <aside className="sim-weather-panel">
                <h3 className="sim-panel-title">Conditions météo</h3>
                <p className="sim-panel-hint">
                  Ajustez les variables : le risque et les courbes se recalculent en direct.
                </p>
                <WeatherSlider
                  label="Température"
                  value={weather.temperature}
                  min={5}
                  max={38}
                  step={1}
                  unit=" °C"
                  onChange={setWeatherField('temperature')}
                />
                <WeatherSlider
                  label="Humidité"
                  value={weather.humidity}
                  min={30}
                  max={100}
                  step={1}
                  unit=" %"
                  onChange={setWeatherField('humidity')}
                />
                <WeatherSlider
                  label="Pluviométrie"
                  value={weather.rainfall}
                  min={0}
                  max={40}
                  step={1}
                  unit=" mm"
                  onChange={setWeatherField('rainfall')}
                />
                <WeatherSlider
                  label="Vent"
                  value={weather.wind}
                  min={0}
                  max={60}
                  step={1}
                  unit=" km/h"
                  onChange={setWeatherField('wind')}
                />
                <p className="sim-weather-context">
                  Récolte estimée : <strong>{prediction.harvestDate}</strong>
                </p>
              </aside>

              <div className="sim-output">
                <div className="sim-risk-card" style={{ borderColor: `${riskMeta.color}55` }}>
                  <div className="sim-risk-head">
                    <span className="sim-risk-dot" style={{ background: riskMeta.color }} />
                    <strong style={{ color: riskMeta.color }}>{riskMeta.label}</strong>
                    <span className="sim-risk-score">score {Math.round(risk.score * 100)}/100</span>
                  </div>
                  <div className="sim-risk-bars">
                    {(['green', 'orange', 'red'] as const).map((key) => (
                      <div className="sim-risk-bar" key={key}>
                        <span className="sim-risk-bar-label">{RISK_META[key].label}</span>
                        <span className="sim-risk-bar-track">
                          <span
                            className="sim-risk-bar-fill"
                            style={{
                              width: `${Math.round(risk.probabilities[key] * 100)}%`,
                              background: RISK_META[key].color,
                            }}
                          />
                        </span>
                        <span className="sim-risk-bar-value">
                          {Math.round(risk.probabilities[key] * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="sim-risk-reco">{risk.storageRecommendation}</p>
                  <div className="sim-risk-factors">
                    {risk.topFactors.map((factor) => (
                      <span className="sim-factor-chip" key={factor}>
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="sim-numbers-row">
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

                <div className="sim-charts">
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
              </div>
            </div>
          ) : (
            <div className="sim-results-empty">
              <span className="empty-state-icon">📡</span>
              <strong>En attente d&apos;une simulation</strong>
              <p>
                Localisez une parcelle sur la carte ci-dessus et lancez la simulation pour afficher
                ici la météo et les courbes de sortie.
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
