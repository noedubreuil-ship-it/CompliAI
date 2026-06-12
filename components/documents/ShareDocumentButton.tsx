"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

export function ShareDocumentButton({ docId }: { docId: string }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const { toast } = useToast();

  async function enableShare() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, action: "enable", expiresInDays: 30 }),
      });
      const data = await res.json();
      if (data.url) {
        setUrl(data.url);
        await navigator.clipboard.writeText(data.url);
        toast("Lien copié dans le presse-papiers", { type: "success", duration: 4000 });
      } else toast(data.error ?? "Erreur", { type: "error" });
    } catch {
      toast("Erreur réseau", { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function disableShare() {
    setLoading(true);
    await fetch("/api/documents/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId, action: "disable" }),
    });
    setUrl(null);
    setLoading(false);
    toast("Partage désactivé", { type: "info" });
  }

  return (
    <div className="flex items-center gap-1">
      {url ? (
        <>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled>
            <Check className="h-3 w-3 text-green-600" /> Lien actif
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={disableShare} disabled={loading}>
            Arrêter
          </Button>
        </>
      ) : (
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={enableShare} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
          Partager
        </Button>
      )}
    </div>
  );
}
