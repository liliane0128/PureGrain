import React from 'react';

type ModelResult = { incertitude: number | null; accuracy: number | null };

export default function StrainRiskList({
  risks,
}: {
  risks: Record<string, ModelResult> | null;
}) {
  if (!risks) return null;

  const entries = Object.entries(risks);

  return (
    <div className="strain-risk-list">
      <h3 className="sim-panel-title">Risques par souche</h3>
      <div className="strain-list-grid">
        {entries.map(([strain, val]) => (
          <div className="strain-row" key={strain}>
            <div className="strain-label">{strain}</div>
            <div className="strain-bars">
              <div className="sim-risk-bar">
                <span className="sim-risk-bar-label">Probabilité</span>
                <span className="sim-risk-bar-track">
                  <span
                    className="sim-risk-bar-fill"
                    style={{ width: `${val.incertitude ?? 0}%`, background: '#f87171' }}
                  />
                </span>
                <span className="sim-risk-bar-value">{val.incertitude ?? '—'}%</span>
              </div>
              <div className="sim-risk-bar">
                <span className="sim-risk-bar-label">Précision</span>
                <span className="sim-risk-bar-track">
                  <span
                    className="sim-risk-bar-fill"
                    style={{ width: `${val.accuracy ?? 0}%`, background: '#60a5fa' }}
                  />
                </span>
                <span className="sim-risk-bar-value">{val.accuracy ?? '—'}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
