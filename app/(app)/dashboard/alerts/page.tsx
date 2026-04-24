"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, ExternalLink, AlertTriangle, CheckCircle2, Lock, Loader2, RefreshCw, Sparkles } from "lucide-react";

const SEVERITY_COLOR = (s: string) => {
  if (s === "critical") return "border-red-200 bg-red-50";
  if (s === "high") return "border-orange-200 bg-orange-50";
  if (s === "medium") return "border-amber-200 bg-amber-50";
  return "border-slate-200 bg-slate-50";
};

const SEVERITY_ICON_COLOR = (s: string) => {
  if (s === "critical") return "text-red-600";
  if (s === "high") return "text-orange-600";
  if (s === "medium") return "text-amber-600";
  return "text-slate-400";
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AlertsPage() {
  const supabase = createClient();
  const [tier, setTier] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single();
    setTier(profile?.subscription_tier ?? "free");

    const { data } = await supabase
      .from("regulatory_alerts")
      .select("*, projects(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAlerts(data ?? []);

    // Mark as read
    const unread = (data ?? []).filter((a: any) => !a.is_read).map((a: any) => a.id);
    if (unread.length > 0) {
      await supabase.from("regulatory_alerts").update({ is_read: true }).in("id", unread);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function seedAlerts() {
    setSeeding(true); setSeedMsg("");
    try {
      const res = await fetch("/api/alerts/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSeedMsg(`✅ ${data.created} alerte${data.created > 1 ? "s" : ""} ajoutée${data.created > 1 ? "s" : ""} pour ${data.projects} projet${data.projects > 1 ? "s" : ""}`);
      await load();
    } catch (e: any) {
      setSeedMsg(`❌ ${e.message}`);
    } finally { setSeeding(false); }
  }

  const hasPro = tier === "pro" || tier === "enterprise";

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );

  if (!hasPro) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Veille réglementaire</h1>
      <Card>
        <CardContent className="py-16 text-center">
          <Lock className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <p className="text-lg font-medium">Fonctionnalité Pro</p>
          <p className="text-muted-foreground text-sm mt-2 mb-6 max-w-md mx-auto">
            Recevez des alertes automatiques lorsqu&apos;une modification réglementaire impacte vos projets.
          </p>
          <Link href="/dashboard/upgrade">
            <Button>Passer au plan Pro — 199€/mois</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Veille réglementaire</h1>
          <p className="text-muted-foreground mt-1">Alertes basées sur les textes officiels · Cron quotidien 8h (en production)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Veille configurée
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-slate-700">
          <strong className="text-slate-900">Comment ça fonctionne ?</strong>
          <p className="mt-1 text-slate-600">
            En production (Vercel), le scan se lance automatiquement à 8h chaque matin. 
            En local ou pour tester maintenant, cliquez sur le bouton ci-dessous pour charger les alertes 
            réglementaires AI Act et RGPD connues pour vos projets.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Button size="sm" onClick={seedAlerts} disabled={seeding} className="whitespace-nowrap">
            {seeding ? <><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</> : "📋 Charger les alertes AI Act"}
          </Button>
        </div>
      </div>
      {seedMsg && <p className="text-sm text-center text-slate-600">{seedMsg}</p>}

      {alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert: any) => (
            <Card key={alert.id} className={`border ${SEVERITY_COLOR(alert.severity)}`}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-4">
                  <AlertTriangle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${SEVERITY_ICON_COLOR(alert.severity)}`} />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{alert.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                            {alert.regulation}
                          </span>
                          {alert.projects?.name && (
                            <span className="text-xs text-muted-foreground">Projet : {alert.projects.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{formatDate(alert.created_at)}</span>
                        {alert.source_url && (
                          <a href={alert.source_url} target="_blank" rel="noopener" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    {alert.description && (
                      <p className="text-sm text-slate-700 leading-relaxed">{alert.description.replace(/\[.*?\]$/, "").trim()}</p>
                    )}
                    {alert.affected_features?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {alert.affected_features.map((f: string) => (
                          <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-white border font-medium text-slate-700">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    {alert.project_id && (
                      <Link href={`/dashboard/projects/${alert.project_id}`} className="text-xs text-primary font-medium hover:underline inline-block">
                        Voir le projet →
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-sm">Aucune alerte pour le moment</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Cliquez sur &quot;Charger les alertes AI Act&quot; ci-dessus pour voir les alertes réglementaires actuelles.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground border rounded-lg p-3 bg-slate-50">
        Ces alertes sont générées à partir des textes officiels publiés au Journal Officiel de l&apos;UE (EUR-Lex).
        Elles constituent des informations juridiques générales, non des conseils juridiques personnalisés.
        Consultez un avocat spécialisé pour valider l&apos;impact sur votre situation.
      </div>
    </div>
  );
}
