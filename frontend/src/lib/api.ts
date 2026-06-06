const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export type RiskLevel = 'GREEN' | 'ORANGE' | 'RED';

export interface GeoPredictionResponse {
  zen_probability: number;
  risk_level: RiskLevel;
  weather: {
    temperature_2m_mean: number;
    temperature_2m_max: number;
    temperature_2m_min: number;
    relative_humidity_2m_mean: number;
    precipitation_sum: number;
    cloud_cover_mean: number;
  };
  model_roc_auc: number;
}

export async function predictGeo(
  lat: number,
  lon: number,
  cropGroup: string,
  samplingPoint: string,
): Promise<GeoPredictionResponse> {
  const res = await fetch(`${API_URL}/api/v1/predict/geo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat,
      lon,
      crop_group: cropGroup,
      sampling_point: samplingPoint,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `API error ${res.status}`);
  }

  return res.json() as Promise<GeoPredictionResponse>;
}
