/**
 * Parser de base pour le pipeline RAG Phase 2.
 *
 * Responsabilités :
 * 1. Charger le prompt versionné correspondant au type de document
 * 2. Appeler Claude (claude-sonnet-4-5, température 0) avec le texte du document
 * 3. Parser la réponse JSON
 * 4. Construire les StagingChunkInsert avec les métadonnées enrichies
 *
 * Règles non-négociables :
 * - Modèle figé : RAG_INGESTION_MODEL (claude-sonnet-4-5)
 * - Température : RAG_INGESTION_TEMPERATURE (0)
 * - Hash du prompt documenté dans chaque résultat
 */

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";

import { loadPromptForDocumentType } from "../prompt-loader";
import {
  DOCUMENT_TYPE_TO_TEXT_TYPE,
  RAG_INGESTION_MAX_TOKENS,
  RAG_INGESTION_MODEL,
  RAG_INGESTION_TEMPERATURE,
  type ParserError,
  type ParserInput,
  type ParserResponse,
  type ParserResult,
  type RawParserOutput,
  type StagingChunkInsert,
} from "./types";

let _anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY manquant dans les variables d'environnement.");
    }
    _anthropicClient = new Anthropic({ apiKey });
  }
  return _anthropicClient;
}

/** Injecte un client Anthropic custom — réservé aux tests unitaires. */
export function _setAnthropicClientForTesting(client: Anthropic): void {
  _anthropicClient = client;
}

/** Réinitialise le client singleton — réservé aux tests unitaires. */
export function _resetAnthropicClient(): void {
  _anthropicClient = null;
}


/**
 * Schema JSON impose a la reponse de Claude (sorties structurees).
 *
 * Sans lui, le modele produisait par intermittence du JSON invalide : un
 * caractere non echappe au milieu d'une chaine suffisait a perdre tout le
 * document. Mesure le 2026-07-19 sur des conclusions d'avocat general —
 * 34 394 caracteres, reponse complete et non tronquee, echec a la position
 * 6398. Neuf avis EDPB avaient echoue de la meme facon.
 *
 * `output_config.format` contraint la generation elle-meme : le JSON ne peut
 * plus etre malforme. Verifie supporte sur claude-sonnet-4-6.
 *
 * Contraintes des sorties structurees : `additionalProperties: false` partout,
 * pas de schema recursif, pas de contrainte numerique ou de longueur.
 */
const PARSER_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    regulation: { type: "string" },
    celex: { type: ["string", "null"] },
    ecli: { type: ["string", "null"] },
    publication_date: { type: ["string", "null"] },
    authority: { type: ["string", "null"] },
    country: { type: ["string", "null"] },
    language: { type: ["string", "null"] },
    parties: { type: ["string", "null"] },
    chunks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          article_number: { type: ["string", "null"] },
          paragraph_number: { type: ["string", "null"] },
          point_letter: { type: ["string", "null"] },
          article_title: { type: ["string", "null"] },
          chapter: { type: ["string", "null"] },
          content: { type: "string" },
        },
        required: [
          "article_number",
          "paragraph_number",
          "point_letter",
          "article_title",
          "chapter",
          "content",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["regulation", "celex", "publication_date", "chunks"],
  additionalProperties: false,
} as const;

/** Calcule le SHA-256 du contenu d'un chunk pour la déduplication */
function computeChunkHash(content: string): string {
  return createHash("sha256").update(content.trim()).digest("hex");
}

/** Parse la réponse JSON de Claude, tolère le JSON enveloppé dans du markdown */
function parseClaudeJsonResponse(text: string): RawParserOutput {
  // Claude retourne parfois le JSON enveloppé dans ```json ... ```
  const stripped = text
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (e) {
    // Ne montrer que le DEBUT de la reponse rendait le diagnostic impossible :
    // le JSON commence presque toujours correctement, et la cause est a la fin
    // (troncature, texte hors JSON, guillemet non echappe). On expose donc les
    // deux extremites, la position signalee par JSON.parse et la longueur.
    const reason = e instanceof Error ? e.message : String(e);
    const head = stripped.slice(0, 160);
    const tail = stripped.length > 320 ? stripped.slice(-160) : "";
    throw new Error(
      `Réponse Claude non parseable en JSON (${reason}). ` +
        `Longueur ${stripped.length} caractères. ` +
        `DÉBUT: ${head}` +
        (tail ? ` […] FIN: ${tail}` : "")
    );
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Réponse Claude n'est pas un objet JSON.");
  }

  const obj = parsed as Record<string, unknown>;

  if (!obj.regulation || typeof obj.regulation !== "string") {
    throw new Error('Champ "regulation" manquant ou invalide dans la réponse Claude.');
  }
  if (!Array.isArray(obj.chunks) || obj.chunks.length === 0) {
    throw new Error('Champ "chunks" manquant ou vide dans la réponse Claude.');
  }

  return obj as unknown as RawParserOutput;
}

/**
 * Appelle Claude pour parser un document et retourne les chunks structurés.
 */
export async function parseDocumentWithClaude(input: ParserInput): Promise<ParserResponse> {
  const startMs = Date.now();

  // 1. Charger le prompt versionné
  let loadedPrompt: ReturnType<typeof loadPromptForDocumentType>;
  try {
    loadedPrompt = loadPromptForDocumentType(input.documentType, input.documentText);
  } catch (e) {
    return makeError(`Erreur de chargement du prompt : ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. Appel Claude
  const client = getAnthropicClient();
  let rawText: string;
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    // Appel en STREAMING, et non `messages.create`.
    //
    // Un appel non streame doit tenir dans le timeout HTTP du SDK, ce qui
    // plafonnait le parsing a ~16 000 tokens de sortie. Or un arret CJUE reel
    // mesure a 16 013 tokens (2026-07-18) — a 2 % du plafond. La majorite des
    // arrets de la Cour tronquaient donc, et la troncature faisait perdre tout
    // le document. Le streaming supprime la contrainte de timeout et permet de
    // monter le plafond a la hauteur reelle du modele.
    //
    // `finalMessage()` rassemble le flux : le reste du code voit le meme objet
    // `Message` qu'avant, avec `usage` et `stop_reason`.
    const stream = client.messages.stream({
      model: RAG_INGESTION_MODEL,
      max_tokens: RAG_INGESTION_MAX_TOKENS,
      temperature: RAG_INGESTION_TEMPERATURE,
      output_config: { format: { type: "json_schema", schema: PARSER_OUTPUT_SCHEMA } },
      messages: [
        {
          role: "user",
          content: loadedPrompt.content,
        },
      ],
    });
    const response = await stream.finalMessage();

    inputTokens = response.usage.input_tokens;
    outputTokens = response.usage.output_tokens;

    // `stop_reason` n'était pas vérifié : une réponse tronquée au plafond de
    // tokens arrivait jusqu'à JSON.parse, qui échouait sur « Réponse Claude non
    // parseable en JSON » — un message trompeur qui a masqué la vraie cause.
    // Constaté le 2026-07-18 sur les avis EDPB, longs par nature.
    if (response.stop_reason === "max_tokens") {
      return makeError(
        `Réponse tronquée : le plafond de ${RAG_INGESTION_MAX_TOKENS} tokens de sortie a été atteint ` +
          `(document trop long pour un seul appel). Augmenter RAG_INGESTION_MAX_TOKENS ou découper le document.`,
        inputTokens,
        outputTokens,
        Date.now() - startMs
      );
    }

    const block = response.content[0];
    if (!block || block.type !== "text") {
      return makeError("Claude n'a pas retourné de bloc texte.", inputTokens, outputTokens, Date.now() - startMs);
    }
    rawText = block.text;
  } catch (e) {
    return makeError(
      `Erreur API Anthropic : ${e instanceof Error ? e.message : String(e)}`,
      inputTokens,
      outputTokens,
      Date.now() - startMs
    );
  }

  const latencyMs = Date.now() - startMs;

  // 3. Parser la réponse JSON
  let rawOutput: RawParserOutput;
  try {
    rawOutput = parseClaudeJsonResponse(rawText);
  } catch (e) {
    return makeError(
      `Parsing JSON échoué : ${e instanceof Error ? e.message : String(e)}`,
      inputTokens,
      outputTokens,
      latencyMs
    );
  }

  // 4. Construire les StagingChunkInsert
  const textType = DOCUMENT_TYPE_TO_TEXT_TYPE[input.documentType] ?? input.documentType;
  const language = rawOutput.language ?? input.language ?? "fr";
  const country = rawOutput.country ?? input.country ?? "EU";
  const regulation = rawOutput.regulation;
  const publicationDate = rawOutput.publication_date ?? input.publicationDate ?? null;
  const sourceUrl = input.sourceUrl;
  const eurLexUrl = input.eurLexUrl ?? null;

  const chunks: StagingChunkInsert[] = rawOutput.chunks.map((raw) => ({
    document_id: input.documentId,
    regulation,
    article_number: raw.article_number ?? null,
    paragraph_number: raw.paragraph_number ?? null,
    point_letter: raw.point_letter ?? null,
    article_title: raw.article_title ?? null,
    chapter: raw.chapter ?? null,
    content: raw.content.trim(),
    language,
    country,
    text_type: textType,
    source_type: input.documentType,
    source_url: sourceUrl,
    eurlex_url: eurLexUrl,
    publication_date: publicationDate,
    chunk_hash: computeChunkHash(raw.content),
  }));

  const result: ParserResult = {
    ok: true,
    rawOutput,
    chunks,
    usage: { inputTokens, outputTokens, latencyMs },
    promptHash: loadedPrompt.hash,
  };

  return result;
}

function makeError(
  error: string,
  inputTokens = 0,
  outputTokens = 0,
  latencyMs = 0
): ParserError {
  return {
    ok: false,
    error,
    usage: { inputTokens, outputTokens, latencyMs },
  };
}
