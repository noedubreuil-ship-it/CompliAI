"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

export function IndexSemanticButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents/index-semantic", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast(`Indexation : ${data.indexed} document(s) mis à jour pour la recherche sémantique.`, "success");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Erreur indexation", "error");
    }
    setLoading(false);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={run} disabled={loading} className="gap-1">
      {loading ?
        <Loader2 className="h-4 w-4 animate-spin" />
      : <Sparkles className="h-4 w-4" />}
      Indexer la recherche sémantique
    </Button>
  );
}
