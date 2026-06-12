"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, FolderPlus, MessageSquare, ScanSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "compliai_product_funnel_dismissed";

export type ProductFunnelStep = 1 | 2 | 3;

function currentStep(hasProject: boolean, hasAudit: boolean, hasChat: boolean): ProductFunnelStep {
  if (!hasProject) return 1;
  if (!hasAudit) return 2;
  if (!hasChat) return 3;
  return 3;
}

function allDone(hasProject: boolean, hasAudit: boolean, hasChat: boolean) {
  return hasProject && hasAudit && hasChat;
}

const STEPS = [
  {
    id: 1 as const,
    title: "Créer un projet",
    desc: "Décrivez votre système IA ou traitement de données",
    href: "/dashboard/projects/new",
    icon: FolderPlus,
  },
  {
    id: 2 as const,
    title: "Lancer un audit",
    desc: "Analyse RGPD & AI Act lancée à la création du projet",
    href: "/dashboard/projects/new",
    icon: ScanSearch,
  },
  {
    id: 3 as const,
    title: "Consulter le juriste IA",
    desc: "Affinez obligations, sanctions et jurisprudence en dialogue",
    href: "/dashboard/chat",
    icon: MessageSquare,
  },
];

export function ProductOnboardingStepper({
  hasProject,
  hasAudit,
  hasChat,
  serverCompleted,
}: {
  hasProject: boolean;
  hasAudit: boolean;
  hasChat: boolean;
  serverCompleted: boolean;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const done = allDone(hasProject, hasAudit, hasChat);
  const active = currentStep(hasProject, hasAudit, hasChat);

  if (serverCompleted || dismissed) return null;
  if (done) {
    return (
      <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Parcours de démarrage terminé</p>
            <p className="text-sm text-green-800 mt-0.5">
              Projet, audit et consultant IA — vous pouvez explorer les outils juridiques et le registre.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-green-300 bg-white shrink-0"
          onClick={() => {
            try {
              window.localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
            void fetch("/api/profile/product-funnel", { method: "POST" }).catch(() => {});
          }}
        >
          Masquer
        </Button>
      </div>
    );
  }

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <div className="mb-8 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 relative">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        aria-label="Masquer le guide"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Premiers pas</p>
      <h2 className="text-lg font-bold text-slate-900 mt-1 pr-8">Votre parcours CompliAI en 3 étapes</h2>
      <p className="text-sm text-slate-600 mt-1 max-w-2xl">
        Suivez ces étapes pour obtenir un premier verdict de conformité, puis valider vos questions avec le consultant juridique.
      </p>

      <div className="mt-2 h-1.5 rounded-full bg-blue-100 overflow-hidden max-w-md">
        <div
          className="h-full bg-blue-600 transition-all duration-500"
          style={{
            width: `${((hasProject ? 1 : 0) + (hasAudit ? 1 : 0) + (hasChat ? 1 : 0)) / 3 * 100}%`,
          }}
        />
      </div>

      <ol className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {STEPS.map((step) => {
          const isDone =
            (step.id === 1 && hasProject) ||
            (step.id === 2 && hasAudit) ||
            (step.id === 3 && hasChat);
          const isActive = step.id === active && !isDone;
          const Icon = step.icon;

          return (
            <li
              key={step.id}
              className={cn(
                "rounded-xl border p-4 flex flex-col gap-3 bg-white transition-shadow",
                isActive && "border-blue-500 shadow-md ring-2 ring-blue-200",
                isDone && "border-green-200 opacity-90",
                !isActive && !isDone && "border-slate-200 opacity-75",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                    isDone ? "bg-green-600 text-white"
                    : isActive ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-600",
                  )}
                >
                  {isDone ? "✓" : step.id}
                </span>
                <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-slate-500")} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">{step.title}</p>
                <p className="text-xs text-slate-500 mt-1">{step.desc}</p>
              </div>
              {isActive && (
                <Link
                  href={step.href}
                  className="inline-flex items-center justify-center gap-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-2"
                >
                  Continuer <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
              {isDone && <p className="text-xs text-green-700 font-medium">Terminé</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Bandeau post-audit : incite à ouvrir le consultant (étape 3). */
export function PostAuditChatCta({ projectName }: { projectName?: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem("compliai_post_audit_cta_hidden") === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-indigo-900">Étape 3 — Affinez avec le consultant IA</p>
        <p className="text-xs text-indigo-800 mt-0.5">
          {projectName ?
            `Posez vos questions sur l'audit « ${projectName} » (obligations, sanctions, mesures correctives).`
          : "Discutez des obligations et mesures correctives liées à cet audit."}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-indigo-700"
          onClick={() => {
            try {
              sessionStorage.setItem("compliai_post_audit_cta_hidden", "1");
            } catch {
              /* ignore */
            }
            setHidden(true);
          }}
        >
          Plus tard
        </Button>
        <Link href="/dashboard/chat?from=audit">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <MessageSquare className="h-4 w-4" />
            Ouvrir le consultant
          </Button>
        </Link>
      </div>
    </div>
  );
}
