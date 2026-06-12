/**
 * Journalisation des appels IA pour audit interne et amélioration continue.
 *
 * On n'enregistre **jamais** le texte brut de la question utilisateur :
 * uniquement un hash SHA-256 (RGPD — principe de minimisation,
 * Règlement (UE) 2016/679, article 5, paragraphe 1, sous-paragraphe c).
 *
 * Table cible : `ai_interaction_logs` (migration
 * `supabase/migrations/010_ai_interaction_logs.sql`).
 */

import { createHash } from "node:crypto";
import type { ToolName } from "./prompts";

export interface AIInteractionLogInput {
  userId: string | null;
  tool: ToolName | string;
  userInput: string;
  outputLength: number;
  latencyMs: number;
  temperature: number;
  model: string;
  warnings?: string[];
}

export function hashInput(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Insère une ligne dans `ai_interaction_logs` via le client Supabase
 * fourni. Volontairement défensif : toute erreur est consignée mais ne
 * remonte jamais dans la route appelante (logging best-effort).
 *
 * Le typage `SupabaseLike` est volontairement structurel : on accepte
 * aussi bien un `SupabaseClient` standard qu'un client admin, sans
 * créer une dépendance dure sur `@supabase/supabase-js` côté
 * monitoring.
 */
export async function logAIInteraction(
  supabase: SupabaseLike,
  data: AIInteractionLogInput
): Promise<void> {
  try {
    const payload = {
      user_id: data.userId,
      tool: data.tool,
      input_hash: hashInput(data.userInput),
      output_length: Math.max(0, Math.floor(data.outputLength)),
      latency_ms: Math.max(0, Math.floor(data.latencyMs)),
      temperature: data.temperature,
      model: data.model,
      warnings: data.warnings && data.warnings.length > 0 ? data.warnings : null,
    };

    const builder = supabase.from("ai_interaction_logs").insert(payload);
    const res = await (builder as PromiseLike<{ error: { message?: string } | null }>);
    if (res?.error) {
      console.warn("[ai-monitoring] insert error:", res.error.message ?? res.error);
    }
  } catch (err) {
    console.warn("[ai-monitoring] unexpected error:", err);
  }
}

interface SupabaseLike {
  from(table: string): {
    insert(payload: Record<string, unknown>): unknown;
  };
}
