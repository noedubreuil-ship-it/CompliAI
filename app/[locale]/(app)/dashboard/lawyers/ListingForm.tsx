"use client";

import { useState } from "react";
import { PlusCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface FormData {
  firmName: string;
  contactName: string;
  email: string;
  website: string;
  city: string;
  countries: string;
  specializations: string;
  description: string;
}

const INITIAL: FormData = {
  firmName: "",
  contactName: "",
  email: "",
  website: "",
  city: "",
  countries: "",
  specializations: "",
  description: "",
};

export function LawyerListingForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/lawyers/listing-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Erreur lors de l'envoi");
      setSuccess(true);
      setForm(INITIAL);
    } catch {
      setError("Une erreur est survenue. Réessayez ou contactez support@compliai.eu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
        onClick={() => { setOpen(true); setSuccess(false); }}
      >
        <PlusCircle className="h-4 w-4" />
        Être listé
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(100vw-2rem,28rem)] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>Demande d&apos;inscription à l&apos;annuaire</SheetTitle>
            <SheetDescription>
              Votre demande sera examinée manuellement sous 48h. Seuls les cabinets spécialisés
              en droit du numérique européen (AI Act, RGPD, NIS2) sont acceptés.
            </SheetDescription>
          </SheetHeader>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div>
                <p className="font-semibold text-slate-900">Demande reçue !</p>
                <p className="text-sm text-slate-500 mt-1">
                  Nous reviendrons vers vous sous 48h à l&apos;adresse indiquée.
                </p>
              </div>
              <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <Field label="Nom du cabinet" required>
                <input
                  type="text"
                  required
                  value={form.firmName}
                  onChange={(e) => update("firmName", e.target.value)}
                  placeholder="Ex. Dupont & Associés"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Nom du contact" required>
                <input
                  type="text"
                  required
                  value={form.contactName}
                  onChange={(e) => update("contactName", e.target.value)}
                  placeholder="Prénom Nom"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Email professionnel" required>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="contact@cabinet.eu"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Site web">
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                  placeholder="https://www.cabinet.eu"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Ville">
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="Paris"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Field>
                <Field label="Pays (virgules)">
                  <input
                    type="text"
                    value={form.countries}
                    onChange={(e) => update("countries", e.target.value)}
                    placeholder="France, Belgique"
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </Field>
              </div>

              <Field label="Spécialités (virgules)">
                <input
                  type="text"
                  value={form.specializations}
                  onChange={(e) => update("specializations", e.target.value)}
                  placeholder="AI Act, RGPD, NIS2"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              <Field label="Présentation du cabinet" required>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Décrivez l'expertise de votre cabinet en droit du numérique européen (2-3 phrases)."
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </Field>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-start gap-2">
                  <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                  Annuler
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    "Envoyer"
                  )}
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
