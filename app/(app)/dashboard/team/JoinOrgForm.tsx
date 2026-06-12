"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JoinOrgForm() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/organizations/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setMsg("Bienvenue dans l’équipe !");
      setCode("");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border bg-white p-5 space-y-3 max-w-lg">
      <Label className="text-sm font-semibold">Rejoindre une équipe</Label>
      <p className="text-xs text-muted-foreground">Collez le code d&apos;invitation fourni par un administrateur.</p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code d'invitation"
          className="font-mono text-sm"
        />
        <Button type="submit" disabled={busy || code.trim().length < 4}>
          Rejoindre
        </Button>
      </div>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </form>
  );
}
