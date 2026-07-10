"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Webhook, Plus } from "lucide-react";
import Link from "next/link";

type Wh = { id: string; url: string; events: string[] | null; is_active: boolean; created_at: string };

export default function IntegrationsPageClient() {
  const [list, setList] = useState<Wh[]>([]);
  const [url, setUrl] = useState("");
  const [secretOnce, setSecretOnce] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/webhooks");
    const data = await res.json();
    setList(data.webhooks ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (data.signing_secret) setSecretOnce(data.signing_secret);
    setUrl("");
    load();
  }

  async function remove(id: string) {
    await fetch("/api/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Webhook className="h-7 w-7" /> Intégrations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recevez une requête POST JSON lorsqu&apos;une issue <strong>critique ou haute</strong> est détectée après un audit.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          En-tête signature : <code className="text-[11px]">X-CompliAI-Signature: sha256=…</code> (HMAC-SHA256 du corps avec le secret affiché à la création).
        </p>
      </div>

      {secretOnce && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">Secret de signature — copiez-le maintenant :</p>
          <code className="block mt-2 break-all select-all">{secretOnce}</code>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setSecretOnce(null)}>
            J&apos;ai noté le secret
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nouveau webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="space-y-3">
            <div>
              <Label>URL HTTPS de votre automate (Make, Zapier, n8n…)</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.example.com/compliai" className="mt-1" required />
            </div>
            <Button type="submit"><Plus className="h-4 w-4" /> Ajouter</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhooks actifs</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {loading && <p className="text-muted-foreground">Chargement…</p>}
          {!loading && list.length === 0 && <p className="text-muted-foreground">Aucun webhook.</p>}
          {list.map((w) => (
            <div key={w.id} className="flex items-start justify-between gap-4 border rounded-lg px-4 py-3">
              <div className="min-w-0">
                <code className="text-xs break-all">{w.url}</code>
                <p className="text-xs text-muted-foreground mt-1">
                  événements : {(w.events ?? ["blocking_issue.created"]).join(", ")}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => remove(w.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-sm space-y-3 border rounded-lg p-4 bg-slate-50">
        <p className="font-semibold">Slack / Microsoft Teams (M2)</p>
        <ul className="text-muted-foreground text-xs space-y-2 list-disc pl-4">
          <li>
            <strong>Webhook entrant</strong> : configurez l&apos;URL dans{" "}
            <Link href="/dashboard/settings" className="text-blue-600 hover:underline">
              Paramètres → Slack
            </Link>
            . Chaque nouvel audit envoie un résumé (verdict + score).
          </li>
          <li>
            <strong>Commande slash</strong> <code>/compliai</code> →{" "}
            <code>{typeof window !== "undefined" ? window.location.origin : ""}/api/slack/commands</code>{" "}
            + <code>SLACK_SIGNING_SECRET</code> + option <code>SLACK_MAPPED_SUPABASE_USER_ID</code>.
          </li>
          <li>Teams : même principe via un connecteur webhook entrant.</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/settings">
            <Button variant="outline" size="sm">Paramètres Slack</Button>
          </Link>
          <Link href="/dashboard/api-keys">
            <Button variant="outline" size="sm">Clés API REST</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
