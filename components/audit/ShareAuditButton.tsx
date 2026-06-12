"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

export function ShareAuditButton({ auditId }: { auditId: string }) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const { toast } = useToast();

  async function enableShare() {
    setLoading(true);
    try {
      const res = await fetch("/api/audits/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, action: "enable", expiresInDays: 30 }),
      });
      const data = await res.json();
      if (data.url) {
        setUrl(data.url);
        await navigator.clipboard.writeText(data.url);
        toast("Lien d'audit copié (lecture seule, 30 jours)", { type: "success", duration: 5000 });
      } else toast(data.error ?? "Erreur", { type: "error" });
    } catch {
      toast("Erreur réseau", { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function disableShare() {
    setLoading(true);
    await fetch("/api/audits/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auditId, action: "disable" }),
    });
    setUrl(null);
    setLoading(false);
    toast("Partage désactivé", { type: "info" });
  }

  return (
    <div className="flex items-center gap-1">
      {url ?
        <>
          <Button variant="outline" size="sm" className="gap-1" disabled>
            <Check className="h-4 w-4 text-green-600" /> Lien actif
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={disableShare} disabled={loading}>
            Arrêter le partage
          </Button>
        </>
      : <Button variant="outline" size="sm" className="gap-1" onClick={enableShare} disabled={loading}>
          {loading ?
            <Loader2 className="h-4 w-4 animate-spin" />
          : <Share2 className="h-4 w-4" />}
          Partager (lecture seule)
        </Button>
      }
    </div>
  );
}
