"use client";

import { useState } from 'react';

export default function ImportCSV() {
  const [status, setStatus] = useState<string | null>(null);

  const upload = async (file: File) => {
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      {status && <small style={{ display: 'block', marginTop: 6 }}>{status}</small>}
    </div>
  );
}
