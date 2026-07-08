/**
 * Validateur post-parsing pour le pipeline RAG Phase 2.
 *
 * Vérifie les règles non-négociables pour chaque lot de chunks avant
 * insertion dans staging_chunks :
 * 1. Présence de tous les champs obligatoires
 * 2. Contenu non vide (≥ 50 caractères)
 * 3. Pas de duplication interne (hash unique dans le document)
 * 4. Cohérence des numéros d'articles avec la structure documentaire
 * 5. Champs de type valides (text_type, language, country)
 */

import type { StagingChunkInsert } from "./parsers/types";

// ─── Constantes de validation ─────────────────────────────────────────────────

const MIN_CONTENT_LENGTH = 50;
const MAX_CONTENT_LENGTH = 10_000;

const VALID_TEXT_TYPES = new Set([
  "reglement_ue",
  "directive_ue",
  "jurisprudence_cjue",
  "lignes_directrices",
  "recommandation_edpb",
  "decision_edpb_art65",
  "decision_autorite_nationale",
  "traite_fondateur",
  "droits_fondamentaux",
  "code_pratiques",
  "guidance_ai_office",
]);

// Noms des mois et patterns suspects dans les numéros d'article
// (détecte des numéros aberrants comme "article 53 §17" dans un article de 5 §)
const ARTICLE_PARAGRAPH_PATTERN = /^(\d+)$/;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ValidationError {
  chunkIndex: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// ─── Validation principale ────────────────────────────────────────────────────

/**
 * Valide un lot de chunks avant insertion dans staging_chunks.
 *
 * @param chunks - tableau de StagingChunkInsert à valider
 * @returns ValidationResult avec les erreurs et avertissements
 */
export function validateChunks(chunks: StagingChunkInsert[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (chunks.length === 0) {
    errors.push({ chunkIndex: -1, field: "chunks", message: "Le tableau de chunks est vide." });
    return { valid: false, errors, warnings };
  }

  // Tracking pour la déduplication interne
  const seenHashes = new Set<string>();
  // Tracking pour la cohérence des paragraphes par article
  const paragraphsByArticle = new Map<string, Set<string>>();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // 1. Champs obligatoires
    if (!chunk.document_id || typeof chunk.document_id !== "string") {
      errors.push({ chunkIndex: i, field: "document_id", message: "document_id manquant ou invalide." });
    }
    if (!chunk.regulation || typeof chunk.regulation !== "string" || chunk.regulation.trim() === "") {
      errors.push({ chunkIndex: i, field: "regulation", message: "regulation manquant ou vide." });
    }
    if (!chunk.content || typeof chunk.content !== "string") {
      errors.push({ chunkIndex: i, field: "content", message: "content manquant." });
    } else {
      const trimmed = chunk.content.trim();
      if (trimmed.length < MIN_CONTENT_LENGTH) {
        errors.push({
          chunkIndex: i,
          field: "content",
          message: `Chunk trop court : ${trimmed.length} caractères (minimum ${MIN_CONTENT_LENGTH}).`,
        });
      }
      if (trimmed.length > MAX_CONTENT_LENGTH) {
        warnings.push(
          `Chunk ${i} très long : ${trimmed.length} caractères (>${MAX_CONTENT_LENGTH}). Vérifier si un découpage supplémentaire est souhaitable.`
        );
      }
    }
    if (!chunk.language || typeof chunk.language !== "string") {
      errors.push({ chunkIndex: i, field: "language", message: "language manquant." });
    }
    if (!chunk.country || typeof chunk.country !== "string") {
      errors.push({ chunkIndex: i, field: "country", message: "country manquant." });
    }
    if (!chunk.text_type || typeof chunk.text_type !== "string") {
      errors.push({ chunkIndex: i, field: "text_type", message: "text_type manquant." });
    } else if (!VALID_TEXT_TYPES.has(chunk.text_type)) {
      errors.push({
        chunkIndex: i,
        field: "text_type",
        message: `text_type invalide : "${chunk.text_type}". Valeurs acceptées : ${[...VALID_TEXT_TYPES].join(", ")}.`,
      });
    }
    if (!chunk.chunk_hash || typeof chunk.chunk_hash !== "string") {
      errors.push({ chunkIndex: i, field: "chunk_hash", message: "chunk_hash manquant." });
    }

    // 2. Déduplication interne (dans le même document)
    if (chunk.chunk_hash) {
      if (seenHashes.has(chunk.chunk_hash)) {
        errors.push({
          chunkIndex: i,
          field: "chunk_hash",
          message: `Duplication interne : hash "${chunk.chunk_hash.slice(0, 16)}..." déjà présent dans ce lot.`,
        });
      } else {
        seenHashes.add(chunk.chunk_hash);
      }
    }

    // 3. Cohérence des numéros d'articles/paragraphes
    // Règle : tracker les paragraphes vus par article pour détecter les incohérences
    if (chunk.article_number && chunk.paragraph_number) {
      const artKey = `${chunk.regulation}::${chunk.article_number}`;
      if (!paragraphsByArticle.has(artKey)) {
        paragraphsByArticle.set(artKey, new Set());
      }
      paragraphsByArticle.get(artKey)!.add(chunk.paragraph_number);
    }

    // 4. Vérification du format du numéro d'article (doit être une string non vide si présent)
    if (chunk.article_number !== null && chunk.article_number !== undefined) {
      if (typeof chunk.article_number !== "string" || chunk.article_number.trim() === "") {
        errors.push({
          chunkIndex: i,
          field: "article_number",
          message: "article_number doit être une string non vide ou null.",
        });
      }
    }
  }

  // 5. Cohérence structurelle des paragraphes par article
  // Détecter les articles avec trop de paragraphes (signe d'hallucination)
  for (const [artKey, paragraphs] of paragraphsByArticle.entries()) {
    const numericParagraphs = [...paragraphs]
      .filter((p) => ARTICLE_PARAGRAPH_PATTERN.test(p))
      .map(Number);

    if (numericParagraphs.length > 0) {
      const maxParagraph = Math.max(...numericParagraphs);
      // Alerte si un article a plus de 20 paragraphes (cas exceptionnels seulement)
      if (maxParagraph > 20) {
        warnings.push(
          `Article "${artKey}" : paragraphe numéro ${maxParagraph} détecté. Vérifier la cohérence avec la structure du document source.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Version stricte : lance une exception si des erreurs sont présentes.
 * Utilisée dans le pipeline pour bloquer l'insertion des chunks invalides.
 */
export function assertChunksValid(chunks: StagingChunkInsert[], documentId: string): void {
  const result = validateChunks(chunks);
  if (!result.valid) {
    const errorMessages = result.errors
      .map((e) => `  [chunk ${e.chunkIndex}] ${e.field}: ${e.message}`)
      .join("\n");
    throw new Error(
      `Validation des chunks échouée pour le document ${documentId} :\n${errorMessages}`
    );
  }
}
