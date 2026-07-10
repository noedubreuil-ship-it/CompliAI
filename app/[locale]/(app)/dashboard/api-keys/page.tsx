"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/user/api-keys");
    const data = await res.json();
    setKeys(data.keys ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/user/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, scopes: ["read", "write"] }),
    });
    const data = await res.json();
    if (data.key) {
      setNewKey(data.key);
      setNewName("");
      setShowForm(false);
      await loadKeys();
    }
    setCreating(false);
  }

  async function handleRevoke(keyId: string) {
    if (!confirm("Révoquer cette clé ? Les intégrations utilisant cette clé cesseront de fonctionner.")) return;
    await fetch("/api/user/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    });
    await loadKeys();
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clés API</h1>
          <p className="text-sm text-gray-500 mt-1">Intégrez CompliAI dans vos outils avec l&apos;API REST.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" /> Nouvelle clé
        </button>
      </div>

      {/* Alerte clé nouvellement créée */}
      {newKey && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
            <Check className="h-4 w-4" /> Clé créée — copiez-la maintenant, elle ne sera plus affichée
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border rounded-lg px-3 py-2 text-xs font-mono text-gray-800 overflow-hidden overflow-ellipsis">
              {newKey}
            </code>
            <button
              onClick={() => copyKey(newKey)}
              className="flex items-center gap-1.5 text-xs font-semibold text-green-700 border border-green-300 rounded-lg px-3 py-2 hover:bg-green-100 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-xs text-green-600 hover:underline">
            J&apos;ai copié ma clé — fermer
          </button>
        </div>
      )}

      {/* Formulaire nouvelle clé */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border bg-white p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">Nouvelle clé API</h3>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nom descriptif</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex: Intégration Notion, Bot Slack..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Annuler</button>
            <button type="submit" disabled={creating} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Créer la clé"}
            </button>
          </div>
        </form>
      )}

      {/* Liste des clés */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-gray-400" /></div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Key className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aucune clé API — créez-en une pour commencer</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Nom</th>
                <th className="text-left px-4 py-3">Préfixe</th>
                <th className="text-left px-4 py-3">Dernière utilisation</th>
                <th className="text-left px-4 py-3">Expire</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {keys.map((k) => (
                <tr key={k.id} className={cn("hover:bg-gray-50", !k.is_active && "opacity-50")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium text-gray-800">{k.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{k.key_prefix}…</code>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {k.last_used_at
                      ? new Date(k.last_used_at).toLocaleDateString("fr-FR")
                      : "Jamais"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {k.expires_at ? new Date(k.expires_at).toLocaleDateString("fr-FR") : "Jamais"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Révoquer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Doc API */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-blue-500" /> Utiliser l&apos;API
        </h3>
        <p className="text-xs text-gray-600">Authentifiez vos requêtes avec le header :</p>
        <code className="block bg-white border rounded-lg px-4 py-3 text-xs font-mono text-gray-800">
          Authorization: Bearer cai_votre_clé
        </code>
        <p className="text-xs text-gray-600">Endpoint de base :</p>
        <code className="block bg-white border rounded-lg px-4 py-3 text-xs font-mono text-gray-800">
          GET {typeof window !== "undefined" ? window.location.origin : ""}/api/v1/me
        </code>
      </div>
    </div>
  );
}
