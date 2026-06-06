"use client";

import { useState } from 'react';

export default function ImportCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const upload = async () => {
    if (!file) return setStatus('Choisissez un fichier');
    setStatus('Envoi en cours...');
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/v1/imports/csv', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
      setStatus('Import réussi');
    } catch (err: any) {
      setStatus(`Erreur: ${err.message ?? err}`);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Importer un CSV</label>
      <input
        aria-label="csv-file"
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div style={{ marginTop: 8 }}>
        <button type="button" onClick={upload} className="btn btn-primary" style={{ marginRight: 8 }}>
          Envoyer
        </button>
        <small>{status}</small>
      </div>
    </div>
  );
}
