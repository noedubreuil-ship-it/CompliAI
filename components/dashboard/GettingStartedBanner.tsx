"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ClipboardList,
  FolderPlus,
  MessageSquare,
  X,
  ArrowRight,
} from "lucide-react";

const STORAGE_KEY = "compliai_getting_started_dismissed";

export function GettingStartedBanner({
  hasAudit,
}: {
  hasAudit: boolean;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!hasAudit || dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <div className="mb-8 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 relative">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
        aria-label="Masquer"
      >
        <X className="h-4 w-4" />
      </button>

      <h2 className="text-sm font-semibold text-slate-900 pr-8">
        Prochain pas : faire valider vos analyses avec le consultant IA
      </h2>
      <p className="text-xs text-slate-600 mt-1 max-w-2xl">
        Les équipes utilisent généralement CompliAI en trois temps : projet & audit, puis dialogue avec le conseiller pour affiner obligations et jurisprudence.
      </p>

      <ol className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <li className="flex items-start gap-2 rounded-lg bg-white border border-slate-200 p-3 text-xs">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
            ✓
          </span>
          <div>
            <p className="font-semibold text-slate-800">Créer un projet</p>
            <p className="text-slate-500">Fait</p>
          </div>
        </li>

        <li className="flex items-start gap-2 rounded-lg bg-white border border-slate-200 p-3 text-xs">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
            ✓
          </span>
          <div>
            <p className="font-semibold text-slate-800">Lancer un audit</p>
            <p className="text-slate-500">Analyse disponible dans Projets</p>
          </div>
        </li>

        <li className="flex items-start gap-2 rounded-lg bg-white border-2 border-blue-400 p-3 text-xs">
          <FolderPlus className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Consultant juridique
            </p>
            <Link
              href="/dashboard/chat"
              className="inline-flex items-center gap-1 mt-1 text-blue-600 font-medium hover:underline"
            >
              Ouvrir le chat <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </li>
      </ol>

      <Link
        href="/dashboard/support"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700 mt-3"
      >
        <ClipboardList className="h-3 w-3" /> Besoin d&apos;aide ? Centre support
      </Link>
    </div>
  );
}

/** Affiché après onboarding lorsqu’aucun projet n’a encore été créé */
export function GettingStartedStepsEmpty() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem("compliai_empty_state_onboarding_done") === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem("compliai_empty_state_onboarding_done", "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm relative">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        aria-label="Masquer"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="text-lg font-bold text-slate-900 pr-8">Démarrer en 3 étapes</h2>
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <Link href="/dashboard/projects/new" className="flex-1 rounded-xl border-2 border-dashed border-blue-300 hover:border-blue-500 p-5 text-center group">
          <span className="text-2xl font-bold text-blue-600 block mb-2">1</span>
          <span className="text-sm font-semibold text-slate-800 block">Créer un projet</span>
          <span className="text-xs text-slate-500 mt-1 block">Décrivez votre système IA</span>
          <ArrowRight className="h-4 w-4 mx-auto mt-3 text-blue-500 group-hover:translate-x-1 transition-transform" />
        </Link>
        <div className="flex-1 rounded-xl border bg-slate-50 p-5 text-center opacity-80">
          <span className="text-2xl font-bold text-slate-400 block mb-2">2</span>
          <span className="text-sm font-semibold text-slate-700 block">Audit automatique</span>
          <span className="text-xs text-slate-500 mt-1 block">Lançé automatiquement à la création</span>
        </div>
        <Link href="/dashboard/chat" className="flex-1 rounded-xl border bg-slate-50 hover:bg-blue-50 p-5 text-center">
          <span className="text-2xl font-bold text-slate-400 block mb-2">3</span>
          <span className="text-sm font-semibold text-slate-700 block">Consultant IA</span>
          <span className="text-xs text-slate-500 mt-1 block">Questions en langage naturel</span>
        </Link>
      </div>
    </div>
  );
}
