"use client";

import { useState } from "react";

export function ImportCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/imports/csv";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError("Veuillez sélectionner un fichier CSV.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(apiUrl, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="import-csv-component">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex gap-2 mt-2">
          <button type="submit" className="btn btn-sm btn-primary" disabled={uploading}>
            {uploading ? "Envoi..." : "Importer CSV"}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => { setFile(null); setResult(null); setError(null); }} disabled={uploading}>
            Réinitialiser
          </button>
        </div>
      </form>

      {error && <div className="text-red-600 mt-2">Erreur: {error}</div>}

      {result && (
        <div className="mt-2 bg-white p-2 rounded shadow-sm">
          <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
