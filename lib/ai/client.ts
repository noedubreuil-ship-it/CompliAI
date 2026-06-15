/**
 * Orchestrateur d'appel Claude pour CompliAI.
 *
 * Paramètres `max_tokens` / température par outil :
 * définition centrale dans {@link TOOL_CONFIGS} `./config.ts` —
 * équivalent tableau :
 * — consultant : 8192 / 0,1 scanner : 2500 / 0,1 doc_art11 : 4500 / 0,1
 * — doc_fria : 3500 / 0,1 doc_memoire : 3500 / 0,1 quiz : jusqu’à 6144 / 0,3
 * (plus `cerveau` : 1500 / 0,2, utilisé par le Cerveau, absent de votre liste.)
 * Consultant : utilisateurs **payants** utilisent le **plafond** configuré (**8192** par défaut) en sortie ; **plan gratuit** : plafond aligné avec budgets adaptatifs (`consultant-tokens.ts`).
 *
 * Responsabilités :
 *   - composer le system prompt = `MASTER_SYSTEM_PROMPT` + prompt outil,
 *   - appliquer les paramètres (max_tokens, température) propres à l'outil,
 *   - injecter le contexte RAG via `buildContextMessage`,
 *   - exposer une API non-streaming (`callClaude`) et streaming
 *     (`streamClaude`) compatibles avec les routes existantes.
 *
 * Important : on conserve volontairement une dépendance directe à
 * `@anthropic-ai/sdk` (déjà présent) — pas de nouvelle dépendance npm.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { PlanName } from "@/lib/pricing";
import { AI_CONFIG, TOOL_CONFIGS, type ToolConfig } from "./config";
import { resolveModelApiId } from "./model-routing";
import { resolveConsultantOutputMaxTokens, resolveConsultantBriefOutputMaxTokens } from "./consultant-tokens";
import { buildSystemPrompt, type ToolName } from "./prompts";
import { trimHistory, type ChatTurn } from "./history";

let _client: Anthropic | null = null;

function client(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export type ConsultantResponseDepthMode = "brief" | "detailed";

export interface CallClaudeOptions {
  /** Outil métier (consultant, scanner, doc_art11, …). */
  tool: ToolName;
  /** Message courant de l'utilisateur. */
  userMessage: string;
  /** Contexte RAG facultatif (passé en tête du message utilisateur). */
  context?: string;
  /** Historique conversationnel (sera tronqué à 6 échanges). */
  conversationHistory?: ChatTurn[];
  /** Surcharge éventuelle des paramètres outil. */
  maxTokensOverride?: number;
  temperatureOverride?: number;
  /** Modèle à utiliser (par défaut : AI_CONFIG.model). */
  modelOverride?: string;
  /** System prompt additionnel ad hoc (mergé à la suite du system). */
  systemAddendum?: string;
  /**
   * Pour `consultant` uniquement : plan crédits (`user_credits.plan`) utilisé pour
   * le budget output (gratuit = plafond plus bas, voir `resolveConsultantOutputMaxTokens`).
   */
  consultantCreditsPlan?: PlanName;
  /** Profondeur de réponse (consultant) : synthèse courte vs note développée (défaut : detailed). */
  consultantResponseDepth?: ConsultantResponseDepthMode;
}

export interface CallClaudeResult {
  text: string;
  model: string;
  temperature: number;
  maxTokens: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

/**
 * Construit un bloc de contexte RAG à insérer en tête du message
 * utilisateur. Chaque source est encadrée par des balises ASCII pour
 * faciliter la lecture par le modèle.
 */
export function buildContextMessage(
  sources: Array<{ title: string; content: string }>
): string {
  if (!sources || sources.length === 0) return "";
  return sources
    .map((s) => `=== SOURCE : ${s.title.trim()} ===\n${s.content.trim()}\n=== FIN SOURCE ===`)
    .join("\n\n");
}

function resolveTool(tool: ToolName): ToolConfig {
  const cfg = TOOL_CONFIGS[tool];
  if (!cfg) {
    throw new Error(`Outil IA inconnu : ${tool}`);
  }
  return cfg;
}

function resolveMaxTokens(options: CallClaudeOptions, cfg: ToolConfig): number {
  if (options.maxTokensOverride !== undefined) return options.maxTokensOverride;
  if (options.tool === "consultant") {
    if (options.consultantResponseDepth === "brief") {
      return resolveConsultantBriefOutputMaxTokens();
    }
    const resolved = resolveConsultantOutputMaxTokens(
      options.userMessage,
      options.consultantCreditsPlan,
      cfg.maxTokens
    );
    /** Plancher produit : évite troncature sur notes longues (surcharge .env basse ignorée). */
    return Math.max(8192, resolved);
  }
  return cfg.maxTokens;
}

function composeUserMessage(userMessage: string, context?: string): string {
  if (!context || context.trim().length === 0) return userMessage;
  return `${context}\n\n---\n\nQuestion : ${userMessage}`;
}

function buildSystem(options: CallClaudeOptions): string {
  const base = buildSystemPrompt(options.tool);
  if (options.systemAddendum && options.systemAddendum.trim().length > 0) {
    return `${base}\n\n${options.systemAddendum.trim()}`;
  }
  return base;
}

function buildMessages(options: CallClaudeOptions): Array<{ role: "user" | "assistant"; content: string }> {
  const history = trimHistory(options.conversationHistory ?? []);
  return [
    ...history,
    { role: "user", content: composeUserMessage(options.userMessage, options.context) },
  ];
}

/**
 * Appel Claude non-streaming. Retourne la réponse texte agrégée et les
 * métadonnées nécessaires au logging.
 */
function resolveCallModel(options: CallClaudeOptions): string {
  if (options.modelOverride) return options.modelOverride;
  if (options.consultantCreditsPlan) {
    return resolveModelApiId({ plan: options.consultantCreditsPlan, tool: options.tool });
  }
  return AI_CONFIG.model;
}

export async function callClaude(options: CallClaudeOptions): Promise<CallClaudeResult> {
  const cfg = resolveTool(options.tool);
  const model = resolveCallModel(options);
  const temperature = options.temperatureOverride ?? cfg.temperature;
  const maxTokens = resolveMaxTokens(options, cfg);

  const system = buildSystem(options);
  const messages = buildMessages(options);

  const startedAt = Date.now();
  const response = await client().messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system,
    messages,
  });
  const latencyMs = Date.now() - startedAt;

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  return {
    text,
    model,
    temperature,
    maxTokens,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
    latencyMs,
  };
}

export interface StreamClaudeHandlers {
  onText: (chunk: string) => void;
  onDone?: (meta: {
    fullText: string;
    model: string;
    temperature: number;
    maxTokens: number;
    latencyMs: number;
    inputTokens: number;
    outputTokens: number;
    stopReason: string | null;
  }) => void | Promise<void>;
  onError?: (error: Error) => void;
}

/**
 * Appel Claude en streaming. Réutilisé par `/api/chat` (consultant) et
 * par `/api/brain/chat` (cerveau) qui exposent du SSE au client.
 */
export async function streamClaude(
  options: CallClaudeOptions,
  handlers: StreamClaudeHandlers
): Promise<void> {
  const cfg = resolveTool(options.tool);
  const model = resolveCallModel(options);
  const temperature = options.temperatureOverride ?? cfg.temperature;
  const maxTokens = resolveMaxTokens(options, cfg);

  const system = buildSystem(options);
  const messages = buildMessages(options);

  const startedAt = Date.now();
  let fullText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const stream = client().messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const t = event.delta.text;
        fullText += t;
        handlers.onText(t);
      } else if (event.type === "message_start" && event.message.usage) {
        inputTokens = event.message.usage.input_tokens;
      } else if (event.type === "message_delta" && event.usage) {
        outputTokens = event.usage.output_tokens;
      }
    }

    const finalMessage = await stream.finalMessage();
    const stopReason = finalMessage.stop_reason ?? null;
    if (stopReason === "max_tokens") {
      console.warn(
        `[streamClaude] sortie tronquée (max_tokens): tool=${options.tool} max=${maxTokens} out=${outputTokens}`
      );
    }

    await handlers.onDone?.({
      fullText,
      model,
      temperature,
      maxTokens,
      latencyMs: Date.now() - startedAt,
      inputTokens,
      outputTokens,
      stopReason,
    });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    if (handlers.onError) handlers.onError(e);
    else throw e;
  }
}
