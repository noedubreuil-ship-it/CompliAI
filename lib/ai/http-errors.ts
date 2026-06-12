/**
 * Réponses HTTP standardisées pour les routes IA (crédits, rate limit, indisponibilité).
 */
import { NextResponse } from "next/server";
import type { ConsumeError } from "@/lib/credits";

export type AiErrorCode =
  | "UNAUTHORIZED"
  | "INSUFFICIENT_CREDITS"
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "AI_UNAVAILABLE";

export interface AiErrorBody {
  error: string;
  code?: AiErrorCode;
  balance?: number;
}

const USER_MESSAGES: Record<AiErrorCode, string> = {
  UNAUTHORIZED: "Session expirée — reconnectez-vous.",
  INSUFFICIENT_CREDITS: "Crédits insuffisants. Rechargez pour continuer.",
  RATE_LIMITED: "Trop de requêtes — réessayez dans une minute.",
  INVALID_REQUEST: "Requête invalide.",
  AI_UNAVAILABLE: "Le service IA est temporairement indisponible. Réessayez dans quelques instants.",
};

export function aiUnauthorized(): NextResponse {
  return NextResponse.json(
    { error: USER_MESSAGES.UNAUTHORIZED, code: "UNAUTHORIZED" } satisfies AiErrorBody,
    { status: 401 },
  );
}

export function aiInsufficientCredits(balance: number): NextResponse {
  return NextResponse.json(
    {
      error: USER_MESSAGES.INSUFFICIENT_CREDITS,
      code: "INSUFFICIENT_CREDITS",
      balance,
    } satisfies AiErrorBody,
    { status: 402 },
  );
}

export function aiRateLimited(retryAfterSeconds = 60): NextResponse {
  return NextResponse.json(
    { error: USER_MESSAGES.RATE_LIMITED, code: "RATE_LIMITED" } satisfies AiErrorBody,
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

export function aiBadRequest(message: string): NextResponse {
  return NextResponse.json(
    { error: message, code: "INVALID_REQUEST" } satisfies AiErrorBody,
    { status: 400 },
  );
}

export function aiUnavailable(detail?: string): NextResponse {
  const message =
    detail && !detail.includes("ANTHROPIC") && detail.length < 120 ?
      detail
    : USER_MESSAGES.AI_UNAVAILABLE;
  return NextResponse.json(
    { error: message, code: "AI_UNAVAILABLE" } satisfies AiErrorBody,
    { status: 503 },
  );
}

/** Convertit le résultat de preflightCheck en NextResponse ou null si OK. */
export function preflightToResponse(err: ConsumeError): NextResponse | null {
  if (err.code === "RATE_LIMITED") {
    return aiRateLimited(err.retryAfterSeconds);
  }
  if (err.code === "INSUFFICIENT_CREDITS") {
    return aiInsufficientCredits(err.balance);
  }
  if (err.code === "CREDITS_NOT_FOUND") {
    return aiInsufficientCredits(0);
  }
  return null;
}

export function catchGenerateRouteError(err: unknown): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[generate-route]", message);
  if (message.includes("INSUFFICIENT_CREDITS") || message.includes("Crédits insuffisants")) {
    return aiInsufficientCredits(0);
  }
  return aiUnavailable(message);
}
