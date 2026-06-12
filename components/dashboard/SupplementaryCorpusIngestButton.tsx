"use client";

import { useState } from "react";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SupplementaryCorpusIngestButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleIngest() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ingest-supplementary-corpus", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        report?: { insertedTotal: number; errors: string[] };
        error?: string;
      };
      if (res.status === 403) {
        setMessage("Réservé aux administrateurs (ADMIN_USER_IDS).");
        return;
      }
      if (!res.ok) {
        setMessage(data.error ?? `Erreur ${res.status}`);
        return;
      }
      const n = data.report?.insertedTotal ?? 0;
      const errN = data.report?.errors?.length ?? 0;
      setMessage(
        errN === 0 ?
          `Indexation terminée — ${n} segments insérés.`
        : `Partiel : ${n} segments, ${errN} erreur(s).`
      );
    } catch {
      setMessage("Échec réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between max-w-3xl mx-auto">
      <div className="text-sm text-slate-600">
        <p className="font-medium text-slate-800">Corpus RAG complémentaire</p>
        <p className="text-xs mt-1">
          ICO (UK), ISO/IEC 42001, NIST AI RMF, OCDE, renfort AEPD — indexation pgvector.
        </p>
        {message && <p className="text-xs mt-2 text-slate-700">{message}</p>}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={handleIngest}>
        {loading ?
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        : <Database className="h-4 w-4 mr-2" />}
        Indexer dans RAG
      </Button>
    </div>
  );
}
