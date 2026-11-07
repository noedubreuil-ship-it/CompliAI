import { describe, it, expect } from "vitest";
import { verifyGeneratedDocument } from "./generated-document-verification";

describe("verifyGeneratedDocument", () => {
  it("accepte un document propre dont les citations viennent du contexte", () => {
    const ctx = "=== SOURCE === ECLI:EU:C:2020:559 Schrems II … article 46 RGPD === FIN ===";
    const doc = '{"analyse":"En application de l\'article 46 du RGPD, voir l\'arrêt ECLI:EU:C:2020:559."}';
    const r = verifyGeneratedDocument(doc, ctx);
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it("détecte un ECLI inventé absent du contexte", () => {
    const ctx = "=== SOURCE === article 35 RGPD === FIN ===";
    const doc = '{"analyse":"La CJUE a jugé dans ECLI:EU:C:2099:123 que…"}';
    const r = verifyGeneratedDocument(doc, ctx);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.startsWith("ecli_not_in_rag"))).toBe(true);
  });

  it("détecte un numéro d'article AI Act hors plage (> 113)", () => {
    const doc = '{"analyse":"Conformément à l\'article 152 de l\'AI Act (règlement 2024/1689)…"}';
    const r = verifyGeneratedDocument(doc, "");
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.startsWith("suspicious_article_number_ai_act"))).toBe(true);
  });

  it("détecte un numéro d'article RGPD hors plage (> 99)", () => {
    const doc = '{"analyse":"L\'article 142 du RGPD (2016/679) impose…"}';
    const r = verifyGeneratedDocument(doc, "");
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.startsWith("suspicious_article_number_rgpd"))).toBe(true);
  });

  it("signale l'en-tête interdit « Jurisprudence applicable »", () => {
    const doc = "Jurisprudence applicable : CJUE…";
    const r = verifyGeneratedDocument(doc, "");
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.includes("jurisprudence_applicable"))).toBe(true);
  });

  it("rejette une sortie vide", () => {
    const r = verifyGeneratedDocument("", "");
    expect(r.ok).toBe(false);
  });
});
