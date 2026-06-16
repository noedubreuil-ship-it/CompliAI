"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, LayoutTemplate, Plus } from "lucide-react";
import Link from "next/link";

type Row = { id: string; doc_type: string; name: string; description: string | null; created_at: string };

export default function TemplatesManageClient() {
  const [list, setList] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("dpia");
  const [packProjectId, setPackProjectId] = useState("");
  const [packRunning, setPackRunning] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [packDone, setPackDone] = useState(false);

  async function refresh() {
    const res = await fetch("/api/templates");
    const data = await res.json();
    setList(data.templates ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doc_type: docType,
        name,
        template: {},
        description: "",
      }),
    });
    setName("");
    refresh();
  }

  async function del(id: string) {
    await fetch("/api/templates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    refresh();
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-2">
        <LayoutTemplate className="h-7 w-7" />
        <div>
          <h1 className="text-2xl font-bold">Modèles personnalisés</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enregistrez des gabarits JSON par type pour accélérer vos prochains DPIA / RoPA (corps étendu à venir dans les générateurs).
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold">Pack conformité (1‑click)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Génère automatiquement une base de livrables DPO pour un projet (Checklist + DPIA + Politique IA). Les documents sont enregistrés dans “Mes documents”.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={packProjectId}
            onChange={(e) => setPackProjectId(e.target.value)}
            placeholder="project_id (UUID)"
          />
          <Button
            type="button"
            disabled={packRunning || !packProjectId.trim()}
            onClick={async () => {
              setPackRunning(true);
              setPackError(null);
              setPackDone(false);
              try {
                const project_id = packProjectId.trim();
                const calls = [
                  fetch("/api/generate/checklist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ regulation: "AI Act (UE 2024/1689)", company_size: "50-249 salariés", sector: "Tech / SaaS / IA", specific_context: "", project_id }),
                  }),
                  fetch("/api/generate/dpia", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ treatment_name: "Traitement principal", controller: "", purposes: "", data_types: "", data_subjects: "", sector: "", recipients: "", project_id }),
                  }),
                  fetch("/api/generate/policy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ company_name: "", sector: "", scope: "IA générative et outils IA internes", project_id }),
                  }),
                ];
                for (const resP of calls) {
                  const res = await resP;
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error((data as any)?.error ?? "Erreur génération pack");
                  }
                }
                setPackDone(true);
              } catch (e: any) {
                setPackError(e?.message ?? String(e));
              } finally {
                setPackRunning(false);
              }
            }}
          >
            {packRunning ? "Génération…" : "Lancer le pack"}
          </Button>
        </div>
        {packError ? <p className="text-xs text-red-600">{packError}</p> : null}
        {packDone ? (
          <p className="text-xs text-emerald-700">
            Pack généré. Ouvrir{" "}
            <Link className="underline" href="/dashboard/documents">
              Mes documents
            </Link>
            .
          </p>
        ) : null}
      </div>

      <form onSubmit={save} className="rounded-xl border bg-white p-5 space-y-3">
        <div className="grid sm:grid-cols-3 gap-2">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="dpia">DPIA</option>
            <option value="ropa">RoPA</option>
            <option value="fria">FRIA</option>
            <option value="policy">Politique IA</option>
            <option value="contract">Contrat tiers</option>
            <option value="checklist">Checklist</option>
          </select>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du modèle"
            className="sm:col-span-2"
            required
          />
        </div>
        <Button type="submit" size="sm">
          <Plus className="h-4 w-4" /> Enregistrer le modèle
        </Button>
      </form>

      <ul className="space-y-2">
        {list.map((t) => (
          <li key={t.id} className="flex justify-between gap-4 border rounded-lg px-4 py-3 items-center">
            <div>
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.doc_type}</p>
            </div>
            <div className="flex items-center gap-2">
              {t.doc_type === "ropa" && (
                <Link href={`/dashboard/tools/ropa?template_id=${t.id}`}>
                  <Button variant="outline" size="sm" type="button">
                    Utiliser
                  </Button>
                </Link>
              )}
            <Button variant="ghost" size="sm" type="button" onClick={() => del(t.id)} className="text-red-600">
              <Trash2 className="h-4 w-4" />
            </Button>
            </div>
          </li>
        ))}
      </ul>

      <Link href="/dashboard/tools" className="text-sm text-blue-600 hover:underline">
        ← Retour aux outils
      </Link>
    </div>
  );
}
