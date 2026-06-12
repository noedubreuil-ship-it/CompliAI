/**
 * Helper client pour appeler l'IA et consulter les crédits.
 * Utilise /api/ai (jamais l'API Anthropic directement).
 */

import type { AIModel } from "./pricing";

// ─── Types publics ────────────────────────────────────────────────────────────
export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: AIModel;
  system?: string;
  maxTokens?: number;
  endpoint?: string; // label pour les logs
}

export interface ChatResult {
  message: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    creditsConsumed: number;
  };
  remainingCredits: number;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onDone?: (result: {
    usage: ChatResult["usage"];
    remainingCredits: number;
  }) => void;
  onError?: (error: AIClientError) => void;
}

export interface CreditInfo {
  balance: number;
  plan: string;
  subscriptionStatus: string | null;
  lastResetAt: string | null;
  monthlyCredits: number;
  lowCreditThreshold: number;
  criticalCreditThreshold: number;
  warningLevel: "ok" | "low" | "critical";
  isLow: boolean;
  autoRecharge?: {
    enabled: boolean;
    threshold: number;
    packId: string | null;
  };
}

export type AIClientError =
  | { code: "UNAUTHORIZED"; message: string }
  | { code: "INSUFFICIENT_CREDITS"; balance: number; message: string }
  | { code: "RATE_LIMITED"; retryAfter: number; message: string }
  | { code: "INVALID_REQUEST"; message: string }
  | { code: "AI_ERROR"; message: string }
  | { code: "NETWORK_ERROR"; message: string };

// ─── chatWithAI — réponse complète ────────────────────────────────────────────
/**
 * Envoie des messages à Claude et retourne la réponse complète.
 * Lève une AIClientError typée en cas de problème.
 */
export async function chatWithAI(
  messages: AIMessage[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model: options.model ?? "haiku",
      system: options.system,
      max_tokens: options.maxTokens,
      stream: false,
      endpoint: options.endpoint ?? "chat",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw parseError(res.status, data);
  }

  return {
    message: data.message,
    usage: {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      creditsConsumed: data.usage.credits_consumed,
    },
    remainingCredits: data.remaining_credits,
  };
}

// ─── streamWithAI — réponse en streaming (SSE) ────────────────────────────────
/**
 * Streame la réponse token par token.
 * Appelle onToken à chaque fragment, onDone à la fin, onError en cas d'erreur.
 * Retourne une fonction d'annulation (abort).
 */
export function streamWithAI(
  messages: AIMessage[],
  options: ChatOptions & StreamCallbacks = {}
): () => void {
  const controller = new AbortController();

  (async () => {
    let res: Response;
    try {
      res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          model: options.model ?? "haiku",
          system: options.system,
          max_tokens: options.maxTokens,
          stream: true,
          endpoint: options.endpoint ?? "chat",
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        options.onError?.({ code: "NETWORK_ERROR", message: "Connexion perdue" });
      }
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      options.onError?.(parseError(res.status, data));
      return;
    }

    if (!res.body) {
      options.onError?.({ code: "AI_ERROR", message: "Pas de stream" });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice(6));

          if (parsed.error) {
            options.onError?.({ code: "AI_ERROR", message: parsed.error });
            return;
          }

          if (parsed.text) {
            options.onToken?.(parsed.text);
          }

          if (parsed.done) {
            options.onDone?.({
              usage: {
                inputTokens: parsed.usage?.input_tokens ?? 0,
                outputTokens: parsed.usage?.output_tokens ?? 0,
                creditsConsumed: parsed.usage?.credits_consumed ?? 0,
              },
              remainingCredits: parsed.remaining_credits ?? 0,
            });
          }
        } catch {
          // Ligne SSE malformée — on ignore
        }
      }
    }
  })();

  return () => controller.abort();
}

// ─── getCreditBalance ─────────────────────────────────────────────────────────
export async function getCreditBalance(): Promise<CreditInfo | null> {
  const res = await fetch("/api/ai/credits");
  if (!res.ok) return null;
  return res.json();
}

// ─── Helper : parse les erreurs HTTP ──────────────────────────────────────────
function parseError(status: number, data: Record<string, unknown>): AIClientError {
  const message = (data.error as string) ?? "Erreur inconnue";
  if (status === 401) return { code: "UNAUTHORIZED", message };
  if (status === 402) return {
    code: "INSUFFICIENT_CREDITS",
    balance: (data.balance as number) ?? 0,
    message,
  };
  if (status === 429) return {
    code: "RATE_LIMITED",
    retryAfter: 60,
    message,
  };
  if (status === 400) return { code: "INVALID_REQUEST", message };
  return { code: "AI_ERROR", message };
}
