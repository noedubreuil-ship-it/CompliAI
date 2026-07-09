/**
 * Tests du validateur post-parsing Phase 2.
 *
 * Couvre :
 * - Validation des champs obligatoires
 * - Détection des chunks vides
 * - Détection des doublons internes (chunk_hash)
 * - Cohérence des numéros d'articles
 * - Champs text_type invalides
 * - Cas nominal (tous les chunks valides)
 */

import { describe, expect, it } from "vitest";
import { createHash } from "crypto";

import { validateChunks } from "./validator";
import type { StagingChunkInsert } from "./parsers/types";

function makeChunk(overrides: Partial<StagingChunkInsert> = {}): StagingChunkInsert {
  const content = overrides.content ?? "Texte juridique de test suffisamment long pour être valide.";
  return {
    document_id: "doc-uuid-1234",
    regulation: "Règlement (UE) 2024/1689",
    article_number: "1",
    paragraph_number: null,
    point_letter: null,
    article_title: "Objet",
    chapter: "CHAPITRE I",
    content,
    language: "fr",
    country: "EU",
    text_type: "reglement_ue",
    source_type: "eu_regulation",
    source_url: "https://eur-lex.europa.eu/test",
    eurlex_url: null,
    publication_date: "2024-07-12",
    chunk_hash: createHash("sha256").update(content.trim()).digest("hex"),
    ...overrides,
  };
}

describe("validateChunks", () => {
  // ─── Cas nominal ──────────────────────────────────────────────────────────

  it("valide un tableau de chunks corrects", () => {
    const chunks = [
      makeChunk({ article_number: "1", article_title: "Objet" }),
      makeChunk({
        article_number: "2",
        article_title: "Champ d'application",
        content: "Le présent règlement s'applique aux opérateurs et fournisseurs d'IA.",
        chunk_hash: createHash("sha256")
          .update("Le présent règlement s'applique aux opérateurs et fournisseurs d'IA.")
          .digest("hex"),
      }),
    ];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // ─── Tableau vide ─────────────────────────────────────────────────────────

  it("rejette un tableau de chunks vide", () => {
    const result = validateChunks([]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("vide");
  });

  // ─── Champs obligatoires manquants ───────────────────────────────────────

  it("détecte un document_id manquant", () => {
    const chunks = [makeChunk({ document_id: "" })];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "document_id")).toBe(true);
  });

  it("détecte un regulation vide", () => {
    const chunks = [makeChunk({ regulation: "" })];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "regulation")).toBe(true);
  });

  it("détecte un language manquant", () => {
    const chunks = [makeChunk({ language: "" })];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "language")).toBe(true);
  });

  it("détecte un country manquant", () => {
    const chunks = [makeChunk({ country: "" })];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "country")).toBe(true);
  });

  it("détecte un chunk_hash manquant", () => {
    const chunks = [makeChunk({ chunk_hash: "" })];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "chunk_hash")).toBe(true);
  });

  // ─── Contenu vide ou trop court ───────────────────────────────────────────

  it("rejette un chunk avec contenu vide", () => {
    const chunks = [makeChunk({ content: "", chunk_hash: createHash("sha256").update("").digest("hex") })];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "content")).toBe(true);
  });

  it("rejette un chunk avec contenu trop court (< 50 caractères)", () => {
    const shortContent = "Trop court.";
    const chunks = [
      makeChunk({ content: shortContent, chunk_hash: createHash("sha256").update(shortContent).digest("hex") }),
    ];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "content" && e.message.includes("court"))).toBe(true);
  });

  // ─── Duplication interne ─────────────────────────────────────────────────

  it("détecte une duplication interne par chunk_hash", () => {
    const content = "Contenu identique pour les deux chunks de test.";
    const hash = createHash("sha256").update(content).digest("hex");
    const chunks = [
      makeChunk({ content, chunk_hash: hash, article_number: "1" }),
      makeChunk({ content, chunk_hash: hash, article_number: "2" }),
    ];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "chunk_hash" && e.message.includes("Duplication"))).toBe(true);
  });

  it("accepte des chunks différents avec des hashs différents", () => {
    const content1 = "Premier contenu juridique suffisamment long pour les tests.";
    const content2 = "Deuxième contenu juridique différent et suffisamment long.";
    const chunks = [
      makeChunk({ content: content1, chunk_hash: createHash("sha256").update(content1).digest("hex") }),
      makeChunk({ content: content2, chunk_hash: createHash("sha256").update(content2).digest("hex"), article_number: "2" }),
    ];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(true);
  });

  // ─── text_type invalide ───────────────────────────────────────────────────

  it("rejette un text_type invalide", () => {
    const chunks = [makeChunk({ text_type: "type_inconnu_invalid" })];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "text_type")).toBe(true);
  });

  it("accepte tous les text_type valides", () => {
    const validTypes = [
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
    ];
    for (const textType of validTypes) {
      const chunks = [makeChunk({ text_type: textType })];
      const result = validateChunks(chunks);
      expect(result.valid, `text_type "${textType}" devrait être valide`).toBe(true);
    }
  });

  // ─── Avertissements (pas des erreurs) ────────────────────────────────────

  it("génère un avertissement pour un chunk très long (> 10 000 chars)", () => {
    const longContent = "x".repeat(10001);
    const chunks = [
      makeChunk({
        content: longContent,
        chunk_hash: createHash("sha256").update(longContent).digest("hex"),
      }),
    ];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(true); // Pas une erreur bloquante
    expect(result.warnings.some((w) => w.includes("long"))).toBe(true);
  });

  it("génère un avertissement pour un article avec un paragraphe > 20", () => {
    const content = "Contenu d'un article avec un numéro de paragraphe anormalement élevé.";
    const chunks = [
      makeChunk({
        article_number: "53",
        paragraph_number: "25",
        content,
        chunk_hash: createHash("sha256").update(content).digest("hex"),
      }),
    ];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(true); // Warning seulement
    expect(result.warnings.some((w) => w.includes("53") && w.includes("25"))).toBe(true);
  });

  // ─── Cas limites ──────────────────────────────────────────────────────────

  it("accepte article_number = null", () => {
    const chunks = [makeChunk({ article_number: null })];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(true);
  });

  it("rejette article_number = '' (chaîne vide)", () => {
    const chunks = [makeChunk({ article_number: "" })];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "article_number")).toBe(true);
  });

  it("valide correctement un chunk de jurisprudence CJUE avec article_number = 'DISPOSITIF'", () => {
    const content =
      "Par ces motifs, la Cour dit pour droit : L'article 82, paragraphe 1, du RGPD doit être interprété en ce sens que la simple violation ne suffit pas.";
    const chunks = [
      makeChunk({
        article_number: "DISPOSITIF",
        text_type: "jurisprudence_cjue",
        content,
        chunk_hash: createHash("sha256").update(content).digest("hex"),
      }),
    ];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(true);
  });

  it("valide un lot mixte (EU regulation + CJUE) avec types différents", () => {
    const content1 = "Contenu article règlement UE avec texte suffisamment long.";
    const content2 = "Contenu dispositif arrêt CJUE avec texte suffisamment long.";
    const chunks = [
      makeChunk({
        text_type: "reglement_ue",
        content: content1,
        chunk_hash: createHash("sha256").update(content1).digest("hex"),
      }),
      makeChunk({
        text_type: "jurisprudence_cjue",
        article_number: "DISPOSITIF",
        content: content2,
        chunk_hash: createHash("sha256").update(content2).digest("hex"),
      }),
    ];
    const result = validateChunks(chunks);
    expect(result.valid).toBe(true);
  });
});
