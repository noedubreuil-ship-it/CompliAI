/**
 * Tests unitaires — API /api/admin/rag-validation
 * Phase 3 : interface admin de validation RAG
 *
 * Ces tests couvrent :
 * - rag-types.ts : helpers de classification (ECLI, CELEX, plages §)
 * - La logique de traitement des chunks (format, identifiants)
 *
 * Les routes Next.js App Router (GET/POST) sont testées via les helpers
 * purs exportés de rag-types.ts et les logiques métier isolées.
 */

import { describe, it, expect } from "vitest";
import {
  isEcliChunk,
  isParagraphRange,
  buildChunkRef,
  getDocumentId,
  DOC_TYPE_LABELS,
  DOC_TYPE_COLORS,
} from "../../../(app)/dashboard/admin/rag-validation/components/rag-types";
import type {
  StagingChunkRow,
  DocumentWithStats,
} from "../../../(app)/dashboard/admin/rag-validation/components/rag-types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeChunk(overrides: Partial<StagingChunkRow> = {}): StagingChunkRow {
  return {
    id: "chunk-1",
    document_id: "doc-1",
    regulation: "Règlement (UE) 2024/1689",
    article_number: "53",
    paragraph_number: "1",
    point_letter: "a",
    article_title: "Obligations des fournisseurs",
    chapter: "Chapitre V",
    content: "Les fournisseurs de systèmes d'IA à haut risque doivent...",
    language: "fr",
    country: "EU",
    text_type: "reglement_ue",
    source_type: "eur-lex-rss",
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=OJ:L_202401689",
    eurlex_url: null,
    publication_date: "2024-07-12",
    validation_status: "pending",
    rejection_reason: null,
    chunk_hash: "abc123",
    parsed_at: "2026-06-25T10:00:00Z",
    ...overrides,
  };
}

function makeDoc(overrides: Partial<DocumentWithStats> = {}): DocumentWithStats {
  return {
    id: "doc-1",
    title: "Règlement IA (AI Act)",
    document_type: "eu_regulation",
    celex: "32024R1689",
    ecli: null,
    source_url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=OJ:L_202401689",
    publication_date: "2024-07-12",
    detected_at: "2026-06-25T08:00:00Z",
    language: "fr",
    country: "EU",
    total_chunks: 120,
    pending_chunks: 115,
    approved_chunks: 5,
    rejected_chunks: 0,
    ...overrides,
  };
}

// ─── isEcliChunk ─────────────────────────────────────────────────────────────

describe("isEcliChunk()", () => {
  it("retourne true si regulation commence par ECLI:", () => {
    const chunk = makeChunk({ regulation: "ECLI:EU:C:2023:634" });
    expect(isEcliChunk(chunk)).toBe(true);
  });

  it("retourne false si regulation est un titre de règlement UE", () => {
    const chunk = makeChunk({ regulation: "Règlement (UE) 2016/679" });
    expect(isEcliChunk(chunk)).toBe(false);
  });

  it("retourne false si regulation est vide (via CELEX)", () => {
    const chunk = makeChunk({ regulation: "32016R0679" });
    expect(isEcliChunk(chunk)).toBe(false);
  });

  it("retourne false si regulation est une directive", () => {
    const chunk = makeChunk({ regulation: "Directive (UE) 2016/680" });
    expect(isEcliChunk(chunk)).toBe(false);
  });
});

// ─── isParagraphRange ────────────────────────────────────────────────────────

describe("isParagraphRange()", () => {
  it("retourne true pour §5-§6 (plage EDPB)", () => {
    expect(isParagraphRange("§5-§6")).toBe(true);
  });

  it("retourne true pour §12-§14", () => {
    expect(isParagraphRange("§12-§14")).toBe(true);
  });

  it("retourne true pour §55 (paragraphe unique CJUE)", () => {
    expect(isParagraphRange("§55")).toBe(true);
  });

  it("retourne false pour '53' (article classique)", () => {
    expect(isParagraphRange("53")).toBe(false);
  });

  it("retourne false pour null", () => {
    expect(isParagraphRange(null)).toBe(false);
  });

  it("retourne false pour string vide", () => {
    expect(isParagraphRange("")).toBe(false);
  });

  it("retourne false pour 'Art. 9' sans préfixe §", () => {
    expect(isParagraphRange("Art. 9")).toBe(false);
  });
});

// ─── buildChunkRef ───────────────────────────────────────────────────────────

describe("buildChunkRef()", () => {
  it("construit 'Art. 53 §1 (a)' pour un chunk de règlement complet", () => {
    const chunk = makeChunk({ article_number: "53", paragraph_number: "1", point_letter: "a" });
    expect(buildChunkRef(chunk)).toBe("Art. 53 §1 (a)");
  });

  it("construit 'Art. 9 §2' sans point lettré", () => {
    const chunk = makeChunk({ article_number: "9", paragraph_number: "2", point_letter: null });
    expect(buildChunkRef(chunk)).toBe("Art. 9 §2");
  });

  it("retourne l'article seul si pas de paragraphe", () => {
    const chunk = makeChunk({ article_number: "5", paragraph_number: null, point_letter: null });
    expect(buildChunkRef(chunk)).toBe("Art. 5");
  });

  it("retourne la plage §5-§6 telle quelle pour EDPB (isParagraphRange = true)", () => {
    const chunk = makeChunk({
      article_number: "§5-§6",
      paragraph_number: null,
      point_letter: null,
    });
    expect(buildChunkRef(chunk)).toBe("§5-§6");
  });

  it("retourne le chapter si pas d'article ni paragraphe", () => {
    const chunk = makeChunk({
      article_number: null,
      paragraph_number: null,
      point_letter: null,
      chapter: "Introduction",
    });
    expect(buildChunkRef(chunk)).toBe("Introduction");
  });

  it("retourne '—' si aucun identifiant disponible", () => {
    const chunk = makeChunk({
      article_number: null,
      paragraph_number: null,
      point_letter: null,
      chapter: null,
    });
    expect(buildChunkRef(chunk)).toBe("—");
  });
});

// ─── getDocumentId ───────────────────────────────────────────────────────────

describe("getDocumentId()", () => {
  it("préfère CELEX sur ECLI et source_url", () => {
    const doc = makeDoc({ celex: "32024R1689", ecli: "ECLI:EU:C:2023:634" });
    expect(getDocumentId(doc)).toBe("32024R1689");
  });

  it("préfère ECLI sur source_url quand pas de CELEX", () => {
    const doc = makeDoc({ celex: null, ecli: "ECLI:EU:C:2023:634" });
    expect(getDocumentId(doc)).toBe("ECLI:EU:C:2023:634");
  });

  it("retourne source_url si aucun identifiant", () => {
    const doc = makeDoc({ celex: null, ecli: null });
    expect(getDocumentId(doc)).toBe(doc.source_url);
  });
});

// ─── DOC_TYPE_LABELS ─────────────────────────────────────────────────────────

describe("DOC_TYPE_LABELS", () => {
  const EXPECTED: Record<string, string> = {
    eu_regulation: "Règlement UE",
    eu_directive: "Directive UE",
    cjeu_judgment: "Arrêt CJUE",
    edpb_guideline: "Lignes directrices EDPB",
    national_decision: "Décision nationale",
    ai_office_guidance: "Guidance AI Office",
  };

  for (const [type, label] of Object.entries(EXPECTED)) {
    it(`associe "${type}" → "${label}"`, () => {
      expect(DOC_TYPE_LABELS[type]).toBe(label);
    });
  }

  it("chaque type a une couleur CSS définie dans DOC_TYPE_COLORS", () => {
    for (const type of Object.keys(DOC_TYPE_LABELS)) {
      expect(DOC_TYPE_COLORS[type]).toBeDefined();
      expect(typeof DOC_TYPE_COLORS[type]).toBe("string");
    }
  });
});

// ─── Cas métier Phase 3 ───────────────────────────────────────────────────────

describe("Cas métier Phase 3 — ECLI vs CELEX", () => {
  it("un arrêt CJUE SCHUFA : regulation = ECLI, document = cjeu_judgment", () => {
    const chunk = makeChunk({
      regulation: "ECLI:EU:C:2023:634",
      text_type: "jurisprudence_cjue",
      article_number: "§55",
    });
    const doc = makeDoc({ document_type: "cjeu_judgment", ecli: "ECLI:EU:C:2023:634", celex: null });

    expect(isEcliChunk(chunk)).toBe(true);
    expect(isParagraphRange(chunk.article_number)).toBe(true);
    expect(buildChunkRef(chunk)).toBe("§55");
    expect(getDocumentId(doc)).toBe("ECLI:EU:C:2023:634");
  });

  it("un chunk EDPB guidelines : §5-§6 n'est pas un article au sens strict", () => {
    const chunk = makeChunk({
      regulation: "Lignes directrices EDPB 06/2020",
      text_type: "lignes_directrices",
      article_number: "§5-§6",
      paragraph_number: null,
    });

    expect(isParagraphRange(chunk.article_number)).toBe(true);
    expect(buildChunkRef(chunk)).toBe("§5-§6");
    // Ce n'est pas un ECLI
    expect(isEcliChunk(chunk)).toBe(false);
  });

  it("un chunk RGPD Art 9 §2 (k) : article classique, pas de plage", () => {
    const chunk = makeChunk({
      regulation: "Règlement (UE) 2016/679",
      article_number: "9",
      paragraph_number: "2",
      point_letter: "k",
    });

    expect(isParagraphRange(chunk.article_number)).toBe(false);
    expect(isEcliChunk(chunk)).toBe(false);
    expect(buildChunkRef(chunk)).toBe("Art. 9 §2 (k)");
  });
});
