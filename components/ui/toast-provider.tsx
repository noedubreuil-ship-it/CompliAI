"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Link from "next/link";
import { CheckCircle2, X, AlertCircle, Info, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning" | "credits";

export interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastType | ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, dismiss: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/** Helpers pré-configurés pour les cas courants */
export function useAIToast() {
  const { toast } = useToast();
  return {
    insufficientCredits: (balance: number) =>
      toast(`Crédits insuffisants — solde : ${balance.toLocaleString("fr-FR")} cr.`, {
        type: "credits",
        duration: 8000,
        action: { label: "Recharger", href: "/dashboard/credits" },
      }),
    rateLimited: () =>
      toast("Trop de requêtes — attendez 60 secondes avant de réessayer.", {
        type: "warning",
        duration: 6000,
      }),
    aiError: (msg?: string) =>
      toast(msg ?? "Erreur IA — veuillez réessayer dans quelques instants.", {
        type: "error",
        duration: 5000,
      }),
    aiSuccess: (label: string) =>
      toast(label, { type: "success", duration: 3000 }),
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options?: ToastType | ToastOptions) => {
      const opts: ToastOptions =
        typeof options === "string" ? { type: options } : (options ?? {});
      const type: ToastType = opts.type ?? "success";
      const duration = opts.duration ?? (type === "error" || type === "credits" ? 6000 : 3500);
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type, duration, action: opts.action }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
    credits: Zap,
  };
  const STYLES: Record<ToastType, string> = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    credits: "bg-amber-50 border-amber-300 text-amber-900",
  };
  const ICON_COLORS: Record<ToastType, string> = {
    success: "text-green-600",
    error: "text-red-600",
    info: "text-blue-600",
    warning: "text-amber-600",
    credits: "text-amber-600",
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "flex flex-col gap-2 px-4 py-3 rounded-xl border shadow-lg text-sm pointer-events-auto",
                "animate-in slide-in-from-bottom-4 fade-in duration-200",
                STYLES[t.type]
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", ICON_COLORS[t.type])} />
                <span className="flex-1 font-medium leading-snug">{t.message}</span>
                <button
                  onClick={() => dismiss(t.id)}
                  className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {t.action && (
                <div className="pl-7">
                  {t.action.href ? (
                    <Link
                      href={t.action.href}
                      className="inline-block text-xs font-semibold underline underline-offset-2 hover:opacity-80"
                      onClick={() => dismiss(t.id)}
                    >
                      {t.action.label} →
                    </Link>
                  ) : (
                    <button
                      onClick={() => { t.action?.onClick?.(); dismiss(t.id); }}
                      className="text-xs font-semibold underline underline-offset-2 hover:opacity-80"
                    >
                      {t.action.label} →
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
