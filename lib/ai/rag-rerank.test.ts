import { describe, it, expect } from "vitest";
import { rerankChunks as rerank } from "./rag-rerank";
import type { LegalChunk } from "@/lib/types/legal";

function chunk(regulation: string, similarity: number): LegalChunk {
  return {
    id: regulation + similarity,
    regulation,
    article_number: null,
    article_title: null,
    chapter: null,
    content: "contenu sur les transferts internationaux de données",
    eurlex_url: null,
    similarity,
  };
}

describe("rerankChunks — démotion des décisions nationales", () => {
  it("à similarité égale, le droit UE passe devant une décision nationale", () => {
    const eu = chunk("Règlement (UE) 2016/679", 0.8);
    const nat = chunk("AEPD — Resolución R/00123/2026", 0.8);
    const out = rerank("transferts internationaux de données", [nat, eu]);
    expect(out[0].regulation).toBe("Règlement (UE) 2016/679");
  });

  it("une décision nationale nettement plus pertinente reste en tête (démotion douce, pas filtre)", () => {
    const eu = chunk("Règlement (UE) 2016/679", 0.55);
    const nat = chunk("CNIL — Délibération SAN-2026-001", 0.95);
    const out = rerank("sanction CNIL transferts", [eu, nat]);
    expect(out[0].regulation).toContain("CNIL");
  });

  it("reconnaît les autorités par préfixe et par séparateur", () => {
    const garante = chunk("Garante — Provvedimento 2026", 0.8);
    const eu = chunk("Directive (UE) 2022/2555", 0.8);
    const out = rerank("données", [garante, eu]);
    expect(out[0].regulation).toContain("Directive");
  });

  it("ne démote pas les sources européennes citant une autorité dans le titre", () => {
    // Un avis EDPB « sur le projet de décision de l'AEPD » ne doit PAS être démoté :
    // c'est une source EDPB, pas une décision nationale. Son regulation ne commence
    // pas par un nom d'autorité.
    const edpb = chunk("Opinion 18/2026 EDPB sur projet AEPD", 0.8);
    const nat = chunk("AEPD — Resolución 2026", 0.8);
    const out = rerank("BCR", [nat, edpb]);
    expect(out[0].regulation).toContain("Opinion");
  });
});
