"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Bell, Slack, CheckCircle2, Loader2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ full_name: "", company: "", slack_webhook_url: "", email_notifications: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setProfile({ ...data, email: user.email });
          setForm({
            full_name: data.full_name ?? "",
            company: data.company ?? "",
            slack_webhook_url: data.slack_webhook_url ?? "",
            email_notifications: data.email_notifications ?? true,
          });
        }
      });
    });
  }, []);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({
      full_name: form.full_name,
      company: form.company,
      slack_webhook_url: form.slack_webhook_url || null,
      email_notifications: form.email_notifications,
    }).eq("id", user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function testSlack() {
    if (!form.slack_webhook_url) return;
    setTestingSlack(true);
    try {
      const res = await fetch("/api/test-slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: form.slack_webhook_url }),
      });
      if (res.ok) alert("✓ Message Slack envoyé avec succès !");
      else alert("Erreur — vérifiez l'URL du webhook.");
    } catch { alert("Erreur réseau."); }
    setTestingSlack(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">Gérez votre profil et vos notifications.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Profil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {profile?.email && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
              <input value={profile.email} disabled
                className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Nom complet</label>
              <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Jean Dupont"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Entreprise</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Acme Corp"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications email</CardTitle></CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.email_notifications}
              onChange={e => setForm(f => ({ ...f, email_notifications: e.target.checked }))}
              className="w-4 h-4 rounded" />
            <div>
              <p className="text-sm font-medium">Alertes de deadline AI Act</p>
              <p className="text-xs text-muted-foreground">Recevez des rappels à 90, 60, 30, 14 et 7 jours avant chaque échéance réglementaire.</p>
            </div>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Slack className="h-4 w-4" /> Intégration Slack / Teams</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">URL du webhook entrant</label>
            <input value={form.slack_webhook_url} onChange={e => setForm(f => ({ ...f, slack_webhook_url: e.target.value }))}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs" />
            <p className="text-xs text-slate-400 mt-1">
              Slack : Paramètres de l&apos;app → Incoming Webhooks · Teams : Connecteurs → Incoming Webhook
            </p>
          </div>
          {form.slack_webhook_url && (
            <Button variant="outline" size="sm" onClick={testSlack} disabled={testingSlack}>
              {testingSlack ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tester la connexion"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><CheckCircle2 className="h-4 w-4" /> Sauvegardé</> : "Sauvegarder les paramètres"}
      </Button>
    </div>
  );
}
