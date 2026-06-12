"use client";

import type { AiErrorBody, AiErrorCode } from "@/lib/ai/http-errors";

export type { AiErrorCode, AiErrorBody };

export interface AiToastHandlers {
  insufficientCredits: (balance: number) => void;
  rateLimited: () => void;
  aiError: (msg?: string) => void;
}

/**
 * Interprète une réponse HTTP d’API IA et affiche le toast adapté.
 * @returns true si une erreur a été gérée (l’appelant doit arrêter le flux).
 */
export function handleAiHttpResponse(
  res: Response,
  data: AiErrorBody & Record<string, unknown>,
  toast: AiToastHandlers,
): boolean {
  if (res.ok) return false;

  const code = data.code as AiErrorCode | undefined;

  if (res.status === 402 || code === "INSUFFICIENT_CREDITS") {
    toast.insufficientCredits(typeof data.balance === "number" ? data.balance : 0);
    return true;
  }
  if (res.status === 429 || code === "RATE_LIMITED") {
    toast.rateLimited();
    return true;
  }
  if (res.status === 401 || code === "UNAUTHORIZED") {
    toast.aiError(data.error ?? "Session expirée — reconnectez-vous.");
    return true;
  }
  if (res.status === 503 || code === "AI_UNAVAILABLE") {
    toast.aiError(data.error);
    return true;
  }

  toast.aiError(typeof data.error === "string" ? data.error : undefined);
  return true;
}

/** Parse JSON + handleAiHttpResponse en une passe. */
export async function parseJsonWithAiErrors<T extends Record<string, unknown>>(
  res: Response,
  toast: AiToastHandlers,
): Promise<{ ok: true; data: T } | { ok: false }> {
  const data = (await res.json().catch(() => ({}))) as T & AiErrorBody;
  if (handleAiHttpResponse(res, data, toast)) {
    return { ok: false };
  }
  return { ok: true, data };
}
