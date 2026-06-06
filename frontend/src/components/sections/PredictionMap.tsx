'use client';

import { useMemo, useState } from 'react';
import { CloudRain, Droplets, Gauge, Sun, Thermometer, Wind } from 'lucide-react';
import { SatelliteMap, type MapLocation } from './SatelliteMap';
import ImportCSV from '../ImportCSV';

const fungalTargets = ['Fusarium graminearum', 'Fusarium culmorum', 'Fusarium verticillioides'];

const toxinTargets = [
  { label: 'Zéaralénone (ZEN)', thresholdUgKg: 100, growthWeight: 0.92 },
  { label: 'Déoxynivalénol (DON)', thresholdUgKg: 1250, growthWeight: 1.08 },
  { label: 'Fumonisines', thresholdUgKg: 1000, growthWeight: 1 },
] as const;

type ToxinTarget = (typeof toxinTargets)[number];
type ToxinLabel = ToxinTarget['label'];

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

export function PredictionMap() {
  const [selectedFungus, setSelectedFungus] = useState(fungalTargets[0]);
  const [selectedToxin, setSelectedToxin] = useState<ToxinLabel>(toxinTargets[0].label);
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
  };

  const [weatherPreview, setWeatherPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const callWeather = async (confirm = false) => {
    if (!selectedLocation) return;
    const payload = { latitude: selectedLocation.lat, longitude: selectedLocation.lng, confirm } as any;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    try {
      if (confirm) setConfirmLoading(true);
      else setPreviewLoading(true);
      const res = await fetch(`${apiUrl}/api/v1/map/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        try {
          data = await res.json();
        } catch (e) {
          data = { detail: `Invalid JSON response: ${String(e)}` };
        }
      } else {
        const text = await res.text();
        data = { detail: text };
      }

      if (!res.ok) throw new Error(data?.detail ?? JSON.stringify(data));
      setWeatherPreview(data.preview ?? data);
    } catch (err: any) {
      setWeatherPreview({ error: err.message ?? String(err) });
    } finally {
      setPreviewLoading(false);
      setConfirmLoading(false);
    }
  };

  const launchSimulation = async () => {
    if (!selectedLocation) return;
    setIsLoading(true);
    setMlResult(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    try {
      const res = await fetch(`${apiUrl}/api/v1/predict/geo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedLocation.lat,
          lon: selectedLocation.lng,
          crop_group: selectedFungus === 'Fusarium verticillioides' ? 'maize' : 'wheat',
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
    } catch {
      setWeather(randomWeather());
      setMlResult(null);
    } finally {
      setIsLoading(false);
      setHasSubmitted(true);
      requestAnimationFrame(() => {
        document.getElementById('simulation-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const risk = prediction?.risk;
  const displayLevel: RiskLevel = mlResult?.riskLevel ?? risk?.level ?? 'green';
  const riskMeta = RISK_META[displayLevel];
  const displayScore = mlResult ? mlResult.zenProbability : (risk?.score ?? 0);
  const contaminationProbability = Math.round(clamp(displayScore, 0, 1) * 100);

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

              <ImportCSV />

              {selectedLocation && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Générer la météo</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => callWeather(false)}
                      disabled={previewLoading}
                    >
                      {previewLoading ? 'Prévisualisation...' : 'Prévisualiser la météo'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => callWeather(true)}
                      disabled={confirmLoading}
                    >
                      {confirmLoading ? 'Création...' : 'Confirmer et créer CSV'}
                    </button>
                  </div>

                  {weatherPreview && (
                    <pre style={{ maxHeight: 160, overflow: 'auto', background: '#0f172a', color: '#e6eef8', padding: 8 }}>
                      {JSON.stringify(weatherPreview, null, 2)}
                    </pre>
                  )}
                </div>
              )}

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

      {/* Section résultats : météo choisie + probabilité du modèle */}
      <section id="simulation-results" className="simulation-results-section">
        <div className="container sim-results-inner">
          <header className="sim-results-header">
            <h2>Météo et probabilité de contamination</h2>
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
              </aside>

              <div className="sim-output">
                <div
                  className="sim-risk-card sim-contamination-card"
                  style={{
                    borderColor: `${riskMeta.color}80`,
                    boxShadow: `0 0 0 1px ${riskMeta.color}18`,
                  }}
                >
                  <div className="sim-risk-head">
                    <span className="sim-risk-dot" style={{ background: riskMeta.color }} />
                    <strong>Probabilité de contamination</strong>
                    <span className="sim-risk-score" style={{ color: riskMeta.color }}>
                      {riskMeta.label}
                    </span>
                  </div>
                  <strong className="sim-contamination-value" style={{ color: riskMeta.color }}>
                    {contaminationProbability}%
                  </strong>
                  <div className="sim-contamination-meter" aria-hidden="true">
                    <span
                      style={{
                        width: `${contaminationProbability}%`,
                        background: riskMeta.color,
                      }}
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
                ici la météo et la probabilité de contamination.
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
