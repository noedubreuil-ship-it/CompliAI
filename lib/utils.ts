import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function getCurrentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const VERDICT_COLORS = {
  Conforme: "text-green-600 bg-green-50 border-green-200",
  "Attention requise": "text-amber-600 bg-amber-50 border-amber-200",
  "Risque élevé": "text-orange-600 bg-orange-50 border-orange-200",
  "Non conforme": "text-red-600 bg-red-50 border-red-200",
} as const;

export const RISK_LEVEL_COLORS = {
  Inacceptable: "text-red-700 bg-red-100",
  Haut: "text-orange-700 bg-orange-100",
  Limité: "text-amber-700 bg-amber-100",
  Minimal: "text-green-700 bg-green-100",
} as const;

export const SEVERITY_COLORS = {
  critical: "text-red-700 bg-red-50 border-red-300",
  high: "text-orange-700 bg-orange-50 border-orange-300",
  medium: "text-amber-700 bg-amber-50 border-amber-300",
  low: "text-blue-700 bg-blue-50 border-blue-300",
} as const;
