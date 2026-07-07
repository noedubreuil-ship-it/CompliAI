import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it, vi } from "vitest";
import {
  AP_ACTUEEL_URL,
  AP_SELECTORS,
  apUrlToExternalId,
  fetchApDocuments,
  inferApDocumentType,
  parseApDate,
  parseApHtml,
} from "./ap-scraping";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../tests/fixtures/rag_monitoring/ap-actueel.html"
);

function makeFetcher(content: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => content,
  });
}

const FIXTURE_HTML = readFileSync(FIXTURE_PATH, "utf-8");

// ---------------------------------------------------------------------------
// parseApDate — mois néerlandais
// ---------------------------------------------------------------------------
describe("parseApDate", () => {
  it("parse '24 juni 2026' (NL: juin) correctement", () => {
    const date = parseApDate("24 juni 2026");
    expect(date).toBeDefined();
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(5); // juin = 5
    expect(date!.getDate()).toBe(24);
  });

  it("parse '08 juni 2026' correctement", () => {
    const date = parseApDate("08 juni 2026");
    expect(date).toBeDefined();
    expect(date!.getMonth()).toBe(5);
    expect(date!.getDate()).toBe(8);
  });

  it("parse 'januari' (janvier NL)", () => {
    const date = parseApDate("15 januari 2025");
    expect(date).toBeDefined();
    expect(date!.getMonth()).toBe(0);
  });

  it("parse 'december' (décembre NL)", () => {
    const date = parseApDate("01 december 2025");
    expect(date).toBeDefined();
    expect(date!.getMonth()).toBe(11);
  });

  it("retourne undefined pour une chaîne vide", () => {
    expect(parseApDate("")).toBeUndefined();
  });

  it("retourne undefined pour un format inconnu", () => {
    expect(parseApDate("2026-06-24")).toBeUndefined();
  });

  it("retourne undefined si le mois NL est inconnu", () => {
    expect(parseApDate("24 june 2026")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// apUrlToExternalId
// ---------------------------------------------------------------------------
describe("apUrlToExternalId", () => {
  it("extrait le slug depuis l'URL AP", () => {
    const id = apUrlToExternalId("/actueel/ap-grote-toename-van-privacyklachten");
    expect(id).toBe("ap-grote-toename-van-privacyklachten");
  });

  it("deux URLs identiques → même externalId", () => {
    const href = "/actueel/ap-stelt-procesbeschrijving-voor";
    expect(apUrlToExternalId(href)).toBe(apUrlToExternalId(href));
  });

  it("deux URLs différentes → externalId différents", () => {
    const id1 = apUrlToExternalId("/actueel/ap-besluit-a");
    const id2 = apUrlToExternalId("/actueel/ap-besluit-b");
    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// inferApDocumentType
// ---------------------------------------------------------------------------
describe("inferApDocumentType", () => {
  it("classe 'boete' (amende NL) comme national_decision", () => {
    expect(inferApDocumentType("AP legt boete op aan bedrijf X")).toBe("national_decision");
  });

  it("classe 'handhaving' (enforcement NL) comme national_decision", () => {
    expect(inferApDocumentType("AP start handhavingsprocedure")).toBe("national_decision");
  });

  it("classe 'besluit' (décision NL) comme national_decision", () => {
    expect(inferApDocumentType("Besluit over verwerking persoonsgegevens")).toBe("national_decision");
  });

  it("classe 'richtsnoer' (directive NL) comme national_guideline", () => {
    expect(inferApDocumentType("Richtsnoer privacy by design")).toBe("national_guideline");
  });

  it("classe 'aanbeveling' (recommandation NL) comme national_guideline", () => {
    expect(inferApDocumentType("Aanbeveling inzake biometrie")).toBe("national_guideline");
  });
});

// ---------------------------------------------------------------------------
// parseApHtml — fixture réelle
// ---------------------------------------------------------------------------
describe("parseApHtml avec fixture réelle", () => {
  it("extrait au moins 5 articles depuis la fixture AP", () => {
    const docs = parseApHtml(FIXTURE_HTML);
    expect(docs.length).toBeGreaterThan(4);
  });

  it("chaque article a un titre non vide", () => {
    const docs = parseApHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.title.length).toBeGreaterThan(0);
    }
  });

  it("chaque article a une sourceUrl vers autoriteitpersoonsgegevens.nl", () => {
    const docs = parseApHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.sourceUrl).toContain("autoriteitpersoonsgegevens.nl");
    }
  });

  it("les externalId sont uniques (déduplication)", () => {
    const docs = parseApHtml(FIXTURE_HTML);
    const ids = new Set(docs.map((d) => d.externalId));
    expect(ids.size).toBe(docs.length);
  });

  it("les externalId sont stables entre deux appels", () => {
    const docs1 = parseApHtml(FIXTURE_HTML);
    const docs2 = parseApHtml(FIXTURE_HTML);
    expect(docs1.map((d) => d.externalId).sort()).toEqual(
      docs2.map((d) => d.externalId).sort()
    );
  });

  it("chaque article a language='nl' et country='NL'", () => {
    const docs = parseApHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.language).toBe("nl");
      expect(doc.country).toBe("NL");
    }
  });

  it("au moins un article a une publicationDate valide (dates NL parsées)", () => {
    const docs = parseApHtml(FIXTURE_HTML);
    const withDate = docs.filter((d) => d.publicationDate !== undefined);
    expect(withDate.length).toBeGreaterThan(0);
    for (const doc of withDate) {
      expect(isNaN(doc.publicationDate!.getTime())).toBe(false);
    }
  });

  it("le premier article contient 'DPIA' ou 'privacyklachten' (titres réels de la fixture)", () => {
    const docs = parseApHtml(FIXTURE_HTML);
    const titles = docs.map((d) => d.title);
    const hasKnownTitle = titles.some(
      (t) => t.includes("DPIA") || t.includes("privacyklachten")
    );
    expect(hasKnownTitle).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Gestion d'erreurs
// ---------------------------------------------------------------------------
describe("fetchApDocuments — gestion d'erreurs", () => {
  it("lève une erreur si HTTP 404", async () => {
    const fetcher = makeFetcher("Not Found", 404);
    await expect(fetchApDocuments({ fetcher })).rejects.toThrow("404");
  });

  it("lève une erreur si HTTP 503 (Drupal surchargé)", async () => {
    const fetcher = makeFetcher("Service Unavailable", 503);
    await expect(fetchApDocuments({ fetcher })).rejects.toThrow("503");
  });

  it("retourne un tableau vide si le HTML ne contient aucun article AP", async () => {
    const fetcher = makeFetcher("<html><body><main>Geen resultaten</main></body></html>");
    const docs = await fetchApDocuments({ fetcher });
    expect(docs).toEqual([]);
  });

  it("retourne un tableau vide sur une page vide", async () => {
    const fetcher = makeFetcher("");
    const docs = await fetchApDocuments({ fetcher });
    expect(docs).toEqual([]);
  });

  it("l'URL par défaut est AP_ACTUEEL_URL", () => {
    expect(AP_ACTUEEL_URL).toBe(
      "https://www.autoriteitpersoonsgegevens.nl/actueel"
    );
  });

  it("le sélecteur node-article-teaser existe dans la fixture", () => {
    expect(FIXTURE_HTML).toContain("node-article-teaser");
  });
});
