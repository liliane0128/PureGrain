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
    <section className="container mt-6">
      <h3 className="text-lg font-semibold mb-2">Importer un CSV</h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-md">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading}
          >
            {uploading ? "Envoi..." : "Envoyer"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => { setFile(null); setResult(null); setError(null); }}
            disabled={uploading}
          >
            Réinitialiser
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-3 text-red-600">Erreur: {error}</div>
      )}

      {result && (
        <div className="mt-3">
          <h4 className="font-medium">Résultat</h4>
          <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}
