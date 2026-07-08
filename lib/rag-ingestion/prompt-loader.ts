/**
 * Chargeur de prompts versionnés pour le pipeline RAG Phase 2.
 *
 * Chaque prompt est stocké sous lib/rag-ingestion/prompts/*.md.
 * À chaque chargement, un SHA-256 est calculé sur le contenu du fichier
 * et documenté dans chaque appel Claude (traçabilité des versions).
 *
 * Format attendu du prompt : contient {{DOCUMENT_TEXT}} comme placeholder.
 */

import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

import type { SupportedDocumentType } from "./parsers/types";

const PROMPTS_DIR = join(__dirname, "prompts");

// Mapping document_type → fichier prompt
const PROMPT_FILES: Record<SupportedDocumentType, string> = {
  eu_regulation: "parse_eu_regulation.md",
  eu_directive: "parse_eu_directive.md",
  cjeu_judgment: "parse_cjeu_judgment.md",
  cjeu_order: "parse_cjeu_judgment.md", // même structure qu'un arrêt
  edpb_guideline: "parse_edpb_guideline.md",
  edpb_recommendation: "parse_edpb_guideline.md",
  edpb_binding_decision: "parse_edpb_guideline.md",
  ai_office_guidance: "parse_ai_office_guidance.md",
  national_decision: "parse_national_decision.md",
  national_guideline: "parse_national_decision.md",
};

export interface LoadedPrompt {
  /** Contenu du prompt avec {{DOCUMENT_TEXT}} remplacé */
  content: string;
  /** SHA-256 hex du fichier prompt source (sans substitution) */
  hash: string;
  /** Nom du fichier source */
  filename: string;
}

// Cache en mémoire des prompts chargés (pour éviter les lectures disque répétées)
const promptCache = new Map<string, { raw: string; hash: string }>();

function loadRawPrompt(filename: string): { raw: string; hash: string } {
  if (promptCache.has(filename)) {
    return promptCache.get(filename)!;
  }

  const filePath = join(PROMPTS_DIR, filename);
  const raw = readFileSync(filePath, "utf-8");
  const hash = createHash("sha256").update(raw).digest("hex");

  promptCache.set(filename, { raw, hash });
  return { raw, hash };
}

/**
 * Charge un prompt pour un type de document donné et substitue le texte.
 *
 * @param documentType  - type de document à parser
 * @param documentText  - texte brut du document (remplace {{DOCUMENT_TEXT}})
 * @returns LoadedPrompt avec le contenu final et le hash de traçabilité
 */
export function loadPromptForDocumentType(
  documentType: SupportedDocumentType,
  documentText: string
): LoadedPrompt {
  const filename = PROMPT_FILES[documentType];
  if (!filename) {
    throw new Error(`Aucun prompt défini pour le type : ${documentType}`);
  }

  const { raw, hash } = loadRawPrompt(filename);
  const content = raw.replace("{{DOCUMENT_TEXT}}", documentText);

  return { content, hash, filename };
}

/**
 * Retourne le hash SHA-256 d'un prompt sans le charger avec un document.
 * Utile pour la traçabilité dans les logs.
 */
export function getPromptHash(documentType: SupportedDocumentType): string {
  const filename = PROMPT_FILES[documentType];
  if (!filename) {
    throw new Error(`Aucun prompt défini pour le type : ${documentType}`);
  }
  return loadRawPrompt(filename).hash;
}

/** Vide le cache (utile en tests) */
export function clearPromptCache(): void {
  promptCache.clear();
}
