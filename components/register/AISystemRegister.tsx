"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Download, BookOpen, X, Check } from "lucide-react";
import { formatDate, RISK_LEVEL_COLORS } from "@/lib/utils";

interface AISystem {
  id: string;
  system_name: string;
  version?: string;
  description?: string;
  purpose?: string;
  risk_category?: string;
  ai_act_classification?: string;
  provider_name?: string;
  deployment_date?: string;
  status: string;
  conformity_assessment_done: boolean;
  human_oversight: boolean;
}

interface Props {
  initialSystems: AISystem[];
}

const EMPTY_FORM = {
  system_name: "",
  version: "",
  description: "",
  purpose: "",
  risk_category: "Minimal",
  ai_act_classification: "",
  provider_name: "",
  deployment_date: "",
  status: "active",
  conformity_assessment_done: false,
  human_oversight: true,
};

export default function AISystemRegister({ initialSystems }: Props) {
  const [systems, setSystems] = useState<AISystem[]>(initialSystems);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function update(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(system: AISystem) {
    setEditingId(system.id);
    setForm({
      system_name: system.system_name,
      version: system.version ?? "",
      description: system.description ?? "",
      purpose: system.purpose ?? "",
      risk_category: system.risk_category ?? "Minimal",
      ai_act_classification: system.ai_act_classification ?? "",
      provider_name: system.provider_name ?? "",
      deployment_date: system.deployment_date ?? "",
      status: system.status,
      conformity_assessment_done: system.conformity_assessment_done,
      human_oversight: system.human_oversight,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveSystem() {
    if (!form.system_name.trim()) return;
    setSaving(true);

    try {
      const url = editingId
        ? `/api/register/${editingId}`
        : "/api/register";

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Erreur sauvegarde");
      const saved = await res.json();

      if (editingId) {
        setSystems((prev) => prev.map((s) => (s.id === editingId ? saved : s)));
      } else {
        setSystems((prev) => [saved, ...prev]);
      }
      cancelForm();
    } catch {
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSystem(id: string) {
    if (!confirm("Supprimer ce système du registre ?")) return;
    await fetch(`/api/register/${id}`, { method: "DELETE" });
    setSystems((prev) => prev.filter((s) => s.id !== id));
  }

  function exportCSV() {
    const headers = [
      "Nom", "Version", "Description", "Finalité", "Catégorie de risque",
      "Classification AI Act", "Fournisseur", "Date déploiement", "Statut",
      "Évaluation conformité", "Supervision humaine",
    ];
    const rows = systems.map((s) => [
      s.system_name, s.version ?? "", s.description ?? "", s.purpose ?? "",
      s.risk_category ?? "", s.ai_act_classification ?? "", s.provider_name ?? "",
      s.deployment_date ?? "", s.status,
      s.conformity_assessment_done ? "Oui" : "Non",
      s.human_oversight ? "Oui" : "Non",
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliai-registre-ia-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{systems.length} système(s) enregistré(s)</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={systems.length === 0}>
            <Download className="h-4 w-4" /> Exporter CSV
          </Button>
          <Button size="sm" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Ajouter un système
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-2 border-slate-300">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {editingId ? "Modifier le système" : "Nouveau système IA"}
              </span>
              <button onClick={cancelForm} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom du système *</Label>
              <Input placeholder="Ex: Système de scoring crédit" value={form.system_name} onChange={(e) => update("system_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Version</Label>
              <Input placeholder="1.0.0" value={form.version} onChange={(e) => update("version", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea placeholder="Description du système..." value={form.description} onChange={(e) => update("description", e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie de risque AI Act</Label>
              <Select value={form.risk_category} onChange={(e) => update("risk_category", e.target.value)}>
                {["Inacceptable", "Haut", "Limité", "Minimal"].map((r) => <option key={r}>{r}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fournisseur</Label>
              <Input placeholder="Nom de l'entreprise" value={form.provider_name} onChange={(e) => update("provider_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Date de déploiement</Label>
              <Input type="date" value={form.deployment_date} onChange={(e) => update("deployment_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
                <option value="active">Actif</option>
                <option value="under_review">En révision</option>
                <option value="decommissioned">Décommissionné</option>
              </Select>
            </div>
            <div className="sm:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.conformity_assessment_done} onChange={(e) => update("conformity_assessment_done", e.target.checked)} className="h-4 w-4 rounded" />
                Évaluation de conformité réalisée
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form.human_oversight} onChange={(e) => update("human_oversight", e.target.checked)} className="h-4 w-4 rounded" />
                Supervision humaine active
              </label>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={cancelForm}>Annuler</Button>
              <Button size="sm" onClick={saveSystem} disabled={saving || !form.system_name.trim()}>
                {saving ? "Sauvegarde…" : (<><Check className="h-4 w-4" /> Sauvegarder</>)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {systems.length > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {["Système", "Risque", "Fournisseur", "Déploiement", "Conformité", "Statut", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {systems.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.system_name}</p>
                    {s.version && <p className="text-xs text-muted-foreground">v{s.version}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_LEVEL_COLORS[s.risk_category as keyof typeof RISK_LEVEL_COLORS] ?? "bg-slate-100 text-slate-700"}`}>
                      {s.risk_category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.provider_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.deployment_date ? formatDate(s.deployment_date) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {s.conformity_assessment_done ? (
                      <span className="text-green-600 text-xs font-medium">✓ Faite</span>
                    ) : (
                      <span className="text-orange-600 text-xs font-medium">En attente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === "active" ? "bg-green-100 text-green-700" :
                      s.status === "decommissioned" ? "bg-slate-100 text-slate-600" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {s.status === "active" ? "Actif" : s.status === "decommissioned" ? "Désactivé" : "En révision"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => startEdit(s)} className="p-1.5 hover:bg-slate-200 rounded">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteSystem(s.id)} className="p-1.5 hover:bg-red-100 rounded text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !showForm && (
        <div className="text-center py-12 border rounded-xl bg-slate-50">
          <BookOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-sm">Registre vide</p>
          <p className="text-xs text-muted-foreground mt-1">Commencez par déclarer votre premier système IA.</p>
        </div>
      )}
    </div>
  );
}
