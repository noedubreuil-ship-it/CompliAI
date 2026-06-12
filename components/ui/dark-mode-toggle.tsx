"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./dark-mode-provider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Clair" },
  { value: "system", icon: Monitor, label: "Système" },
  { value: "dark", icon: Moon, label: "Sombre" },
] as const;

export function DarkModeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const next = theme === "dark" ? "light" : "dark";
    const Icon = theme === "dark" ? Sun : Moon;
    return (
      <button
        onClick={() => setTheme(next)}
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
        title={next === "dark" ? "Activer le mode sombre" : "Activer le mode clair"}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            theme === value
              ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
