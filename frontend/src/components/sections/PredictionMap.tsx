'use client';

import { useMemo, useState } from 'react';
import { CloudRain, Droplets, Gauge, Sun, Thermometer, Wind } from 'lucide-react';
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

// Relevé météo de la parcelle (aléatoire pour l'instant, en attendant le backend).
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

// Génère un relevé météo plausible (placeholder tant que le backend n'est pas branché).
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

type RiskLevel = 'green' | 'orange' | 'red';

// Métadonnées d'affichage par niveau de risque (aligné sur risk_level du backend).
const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  green: { label: 'Risque faible', color: '#34d399' },
  orange: { label: 'Risque modéré', color: '#f5b34d' },
  red: { label: 'Risque élevé', color: '#f87171' },
};

type ChartProps = {
  label: string;
  pill: string;
  legend: string;
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

// Courbe lissée (Catmull-Rom → Bézier) pour un rendu doux façon graphique bio.
function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) {
    return '';
  }

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
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

// Reproduit exactement l'UI du graphique « Réponse fluorescente » (BioConversion) :
// même carte, en-tête + pastille, grille, axe, courbe à halo et légende.
function PredictionChart({ label, pill, legend, points, threshold, unit }: ChartProps) {
  const width = 760;
  const height = 470;
  const padding = 46;
  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values, threshold ?? 0, 1);
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const coordinates = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * plotWidth;
    const y = height - padding - (point.value / maxValue) * plotHeight;

    return { ...point, x, y };
  });
  const linePath = smoothPath(coordinates);
  const axisPath = `M ${padding} ${padding} V ${height - padding} H ${width - padding}`;
  const gridLines = [0.25, 0.5, 0.75].map((fraction) => padding + fraction * plotHeight);
  const thresholdY =
    threshold === undefined ? null : height - padding - (threshold / maxValue) * plotHeight;
  const lastPoint = coordinates[coordinates.length - 1];
  const lastDay = lastPoint?.day ?? 33;

  return (
    <div className="bio-absorption-card">
      <div className="bio-absorption-header">
        <span>{label}</span>
        <strong>{pill}</strong>
      </div>

      <div className="bio-absorption-chart">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
          <g className="bio-chart-grid">
            {gridLines.map((y) => (
              <line key={y} x1={padding} y1={y} x2={width - padding} y2={y} />
            ))}
          </g>
          <path className="bio-chart-axis" d={axisPath} />
          {thresholdY !== null && (
            <>
              <line
                className="prediction-chart-threshold"
                x1={padding}
                y1={thresholdY}
                x2={width - padding}
                y2={thresholdY}
              />
              <text className="bio-chart-label" x={padding + 8} y={Math.max(thresholdY - 10, 20)}>
                seuil {threshold} {unit}
              </text>
            </>
          )}
          <path className="sim-chart-curve" d={linePath} />
          {lastPoint && (
            <text
              className="bio-chart-value bio-chart-value-living"
              x={Math.min(lastPoint.x, width - padding - 4)}
              y={Math.max(lastPoint.y - 16, 22)}
              textAnchor="end"
            >
              {lastPoint.value} {unit} à J+{lastDay}
            </text>
          )}
          <text className="bio-chart-label" x={padding} y={height - 14}>
            Aujourd’hui
          </text>
          <text className="bio-chart-label" x={width - padding} y={height - 14} textAnchor="end">
            J+{lastDay}
          </text>
        </svg>
      </div>

      <div className="bio-absorption-legend">
        <span>
          <i className="bio-legend-living" />
          {legend}
        </span>
        {threshold !== undefined && (
          <span>
            <i className="sim-legend-threshold" />
            Seuil réglementaire
          </span>
        )}
      </div>
    </div>
  );
}


export function PredictionMap() {
  const [selectedFungus] = useState(fungalTargets[0]);
  const [selectedToxin] = useState<ToxinLabel>(toxinTargets[0].label);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [weather, setWeather] = useState<WeatherInputs>(DEFAULT_WEATHER);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mlResult, setMlResult] = useState<{
    zenProbability: number;
    riskLevel: RiskLevel;
    rocAuc: number;
    fromBackend: boolean;
  } | null>(null);
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
    setPredictionResult(null);
  };

  const [predictionResult, setPredictionResult] = useState<{
    contamination_probability: number;
    accuracy: number;
  } | null>(null);

  const launchSimulation = async () => {
    if (!selectedLocation) return;
    setIsLoading(true);
    setMlResult(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

    const [geoRes, weatherRes] = await Promise.allSettled([
      fetch(`${apiUrl}/api/v1/predict/geo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedLocation.lat,
          lon: selectedLocation.lng,
          crop_group: selectedFungus === 'Fusarium verticillioides' ? 'maize' : 'wheat',
          sampling_point: 'Primary production',
        }),
      }),
      fetch(`${apiUrl}/api/v1/map/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: selectedLocation.lat, longitude: selectedLocation.lng, confirm: true }),
      }),
    ]);

    if (geoRes.status === 'fulfilled' && geoRes.value.ok) {
      const data = await geoRes.value.json();
      const w = data.weather as Record<string, number>;
      setWeather({
        temperature: Math.round(w.temperature_2m_mean ?? DEFAULT_WEATHER.temperature),
        humidity: Math.round(w.relative_humidity_2m_mean ?? DEFAULT_WEATHER.humidity),
        rainfall: Math.round(w.precipitation_sum ?? DEFAULT_WEATHER.rainfall),
        wind: DEFAULT_WEATHER.wind,
        sunshine: Math.round((1 - (w.cloud_cover_mean ?? 50) / 100) * 13),
        pressure: DEFAULT_WEATHER.pressure,
      });
      setMlResult({
        zenProbability: data.zen_probability,
        riskLevel: (data.risk_level as string).toLowerCase() as RiskLevel,
        rocAuc: data.model_roc_auc,
        fromBackend: true,
      });
    } else {
      setWeather(randomWeather());
      setMlResult(null);
    }

    if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
      const data = await weatherRes.value.json();
      if (data.prediction) setPredictionResult(data.prediction);
    }

    setIsLoading(false);
    setHasSubmitted(true);
    requestAnimationFrame(() => {
      document.getElementById('simulation-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const risk = prediction?.risk;
  const sensorLevel: RiskLevel | null = predictionResult
    ? predictionResult.contamination_probability < 33 ? 'green'
      : predictionResult.contamination_probability < 66 ? 'orange'
      : 'red'
    : null;
  const displayLevel: RiskLevel = sensorLevel ?? mlResult?.riskLevel ?? risk?.level ?? 'green';
  const riskMeta = RISK_META[displayLevel];
  const displayScore = predictionResult
    ? predictionResult.contamination_probability / 100
    : mlResult
      ? mlResult.zenProbability
      : (risk?.score ?? 0);
  const displayProbabilities: Record<RiskLevel, number> = mlResult
    ? {
        red: mlResult.zenProbability ** 2,
        orange: 2 * mlResult.zenProbability * (1 - mlResult.zenProbability),
        green: (1 - mlResult.zenProbability) ** 2,
      }
    : risk?.probabilities ?? { green: 1, orange: 0, red: 0 };
  const displayStorageReco =
    displayLevel === 'red'
      ? 'Séchage immédiat ou tri du lot avant tout stockage'
      : displayLevel === 'orange'
        ? 'Ventilation renforcée et nouveau contrôle sous 7 jours'
        : 'Stockage standard, surveillance légère suffisante';

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
      {/* Section carte : configuration de la parcelle + lancement */}
      <section id="prediction-map" className="prediction-dashboard-section">
        <div className="prediction-dashboard-header">
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
                disabled={!selectedLocation || isLoading}
                onClick={launchSimulation}
              >
                {isLoading ? 'Analyse en cours…' : 'Lancer la simulation'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section résultats : météo choisie + sorties du modèle */}
      <section id="simulation-results" className="simulation-results-section">
        <div className="container sim-results-inner">
          <header className="sim-results-header">
            <h2>Météo, risque et trajectoire de contamination</h2>
          </header>

          {hasSubmitted && prediction ? (
            <div className="sim-results-grid">
              <aside className="sim-weather-panel">
                <h3 className="sim-panel-title">Conditions météo</h3>
                <p className="sim-panel-hint">
                  {mlResult?.fromBackend ? 'Données Open-Meteo temps réel.' : 'Données simulées (backend indisponible).'}
                </p>
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
                <p className="sim-weather-context">
                  Récolte estimée : <strong>{prediction.harvestDate}</strong>
                </p>
              </aside>

              <div className="sim-output">
                <div className="sim-risk-card" style={{ borderColor: `${riskMeta.color}55` }}>
                  <div className="sim-risk-head">
                    <span className="sim-risk-dot" style={{ background: riskMeta.color }} />
                    <strong style={{ color: riskMeta.color }}>{riskMeta.label}</strong>
                    <span className="sim-risk-score">score {Math.round(displayScore * 100)}/100</span>
                    {mlResult?.fromBackend && (
                      <span className="sim-risk-ml-badge">ML · ROC-AUC {mlResult.rocAuc}</span>
                    )}
                  </div>
                  <div className="sim-risk-bars">
                    {predictionResult ? (
                      <>
                        <div className="sim-risk-bar">
                          <span className="sim-risk-bar-label">Probabilité de contamination</span>
                          <span className="sim-risk-bar-track">
                            <span
                              className="sim-risk-bar-fill"
                              style={{
                                width: `${predictionResult.contamination_probability}%`,
                                background: riskMeta.color,
                              }}
                            />
                          </span>
                          <span className="sim-risk-bar-value">{predictionResult.contamination_probability}%</span>
                        </div>
                        <div className="sim-risk-bar">
                          <span className="sim-risk-bar-label">Précision du modèle</span>
                          <span className="sim-risk-bar-track">
                            <span
                              className="sim-risk-bar-fill"
                              style={{
                                width: `${predictionResult.accuracy}%`,
                                background: '#60a5fa',
                              }}
                            />
                          </span>
                          <span className="sim-risk-bar-value">{predictionResult.accuracy}%</span>
                        </div>
                      </>
                    ) : (
                      (['green', 'orange', 'red'] as const).map((key) => (
                        <div className="sim-risk-bar" key={key}>
                          <span className="sim-risk-bar-label">{RISK_META[key].label}</span>
                          <span className="sim-risk-bar-track">
                            <span
                              className="sim-risk-bar-fill"
                              style={{
                                width: `${Math.round(displayProbabilities[key] * 100)}%`,
                                background: RISK_META[key].color,
                              }}
                            />
                          </span>
                          <span className="sim-risk-bar-value">
                            {Math.round(displayProbabilities[key] * 100)}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="sim-risk-reco">{displayStorageReco}</p>
                  <div className="sim-risk-factors">
                    {risk?.topFactors.map((factor) => (
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
                  <PredictionChart
                    label={`Contamination fongique (${selectedFungus})`}
                    pill="%"
                    legend="Charge fongique estimée"
                    points={prediction.fungalCurve}
                    unit="%"
                  />
                  <PredictionChart
                    label={`Contamination en ${selectedToxin}`}
                    pill="µg/kg"
                    legend="Contamination prévue"
                    points={prediction.toxinCurve}
                    threshold={prediction.thresholdUgKg}
                    unit="µg/kg"
                  />
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
