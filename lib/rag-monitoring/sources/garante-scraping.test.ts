import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it, vi } from "vitest";
import {
  GARANTE_RICERCA_URL,
  GARANTE_SELECTORS,
  extractGaranteDocwId,
  fetchGaranteDocuments,
  inferGaranteDocumentType,
  parseGaranteDate,
  parseGaranteHtml,
} from "./garante-scraping";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../tests/fixtures/rag_monitoring/garante-ricerca.html"
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
// extractGaranteDocwId
// ---------------------------------------------------------------------------
describe("extractGaranteDocwId", () => {
  it("extrait le DocwID depuis une URL complète", () => {
    expect(
      extractGaranteDocwId(
        "/web/guest/home/docweb/-/docweb-display/docweb/10259569"
      )
    ).toBe("10259569");
  });

  it("extrait le DocwID depuis une URL absolue", () => {
    expect(
      extractGaranteDocwId(
        "https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9720532"
      )
    ).toBe("9720532");
  });

  it("retourne undefined pour une URL sans DocwID", () => {
    expect(extractGaranteDocwId("https://www.garanteprivacy.it/home")).toBeUndefined();
  });

  it("deux URLs avec le même DocwID retournent le même ID", () => {
    expect(extractGaranteDocwId("/docweb/12345")).toBe(
      extractGaranteDocwId("/docweb-display/docweb/12345")
    );
  });
});

// ---------------------------------------------------------------------------
// parseGaranteDate
// ---------------------------------------------------------------------------
describe("parseGaranteDate", () => {
  it("parse '28/05/2026' correctement", () => {
    const date = parseGaranteDate("28/05/2026");
    expect(date).toBeDefined();
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(4); // mai = 4
    expect(date!.getDate()).toBe(28);
  });

  it("parse '01/01/2025' correctement", () => {
    const date = parseGaranteDate("01/01/2025");
    expect(date).toBeDefined();
    expect(date!.getFullYear()).toBe(2025);
  });

  it("retourne undefined pour une chaîne vide", () => {
    expect(parseGaranteDate("")).toBeUndefined();
  });

  it("retourne undefined pour un format invalide (YYYY-MM-DD)", () => {
    expect(parseGaranteDate("2026-05-28")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// inferGaranteDocumentType
// ---------------------------------------------------------------------------
describe("inferGaranteDocumentType", () => {
  it("classe 'Provvedimento' comme national_decision (IT)", () => {
    expect(inferGaranteDocumentType("Provvedimento del 28 maggio 2026")).toBe("national_decision");
  });

  it("classe 'Sanzione' comme national_decision (IT)", () => {
    expect(inferGaranteDocumentType("Sanzione per violazione del GDPR")).toBe("national_decision");
  });

  it("classe 'Parere' comme national_guideline (IT)", () => {
    expect(inferGaranteDocumentType("Parere su istanza di accesso civico")).toBe("national_guideline");
  });

  it("classe 'Linee guida' comme national_guideline (IT)", () => {
    expect(inferGaranteDocumentType("Linee guida sull'intelligenza artificiale")).toBe("national_guideline");
  });

  it("classe 'Deliberazione' comme national_guideline (IT)", () => {
    expect(inferGaranteDocumentType("Deliberazione n°1/2026")).toBe("national_guideline");
  });
});

// ---------------------------------------------------------------------------
// parseGaranteHtml — fixture réelle
// ---------------------------------------------------------------------------
describe("parseGaranteHtml avec fixture réelle", () => {
  it("extrait au moins 5 documents depuis la fixture Garante", () => {
    const docs = parseGaranteHtml(FIXTURE_HTML);
    expect(docs.length).toBeGreaterThan(5);
  });

  it("chaque document a un externalId = DocwID numérique", () => {
    const docs = parseGaranteHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.externalId).toMatch(/^\d+$/);
    }
  });

  it("les externalId sont uniques (déduplication par DocwID)", () => {
    const docs = parseGaranteHtml(FIXTURE_HTML);
    const ids = new Set(docs.map((d) => d.externalId));
    expect(ids.size).toBe(docs.length);
  });

  it("les externalId sont stables entre deux appels", () => {
    const docs1 = parseGaranteHtml(FIXTURE_HTML);
    const docs2 = parseGaranteHtml(FIXTURE_HTML);
    expect(docs1.map((d) => d.externalId).sort()).toEqual(
      docs2.map((d) => d.externalId).sort()
    );
  });

  it("chaque document a une sourceUrl vers garanteprivacy.it", () => {
    const docs = parseGaranteHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.sourceUrl).toContain("garanteprivacy.it");
    }
  });

  it("chaque document a language='it' et country='IT'", () => {
    const docs = parseGaranteHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.language).toBe("it");
      expect(doc.country).toBe("IT");
    }
  });

  it("les titres sont non vides", () => {
    const docs = parseGaranteHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.title.length).toBeGreaterThan(0);
    }
  });

  it("les DocwIDs de la fixture correspondent aux IDs réels", () => {
    const docs = parseGaranteHtml(FIXTURE_HTML);
    const ids = docs.map((d) => d.externalId);
    // Les IDs réels de la fixture (vérifiés le 2026-06-25)
    expect(ids).toContain("10259569");
    expect(ids).toContain("10259894");
  });
});

// ---------------------------------------------------------------------------
// Gestion d'erreurs
// ---------------------------------------------------------------------------
describe("fetchGaranteDocuments — gestion d'erreurs", () => {
  it("lève une erreur si HTTP 404", async () => {
    const fetcher = makeFetcher("Not Found", 404);
    await expect(fetchGaranteDocuments({ fetcher })).rejects.toThrow("404");
  });

  it("lève une erreur si HTTP 503 (Liferay surchargé)", async () => {
    const fetcher = makeFetcher("Service Unavailable", 503);
    await expect(fetchGaranteDocuments({ fetcher })).rejects.toThrow("503");
  });

  it("retourne un tableau vide si la page ne contient aucun provvedimento", async () => {
    const fetcher = makeFetcher("<html><body><main>Nessun risultato</main></body></html>");
    const docs = await fetchGaranteDocuments({ fetcher });
    expect(docs).toEqual([]);
  });

  it("retourne un tableau vide sur une page vide", async () => {
    const fetcher = makeFetcher("");
    const docs = await fetchGaranteDocuments({ fetcher });
    expect(docs).toEqual([]);
  });

  it("l'URL par défaut est GARANTE_RICERCA_URL", () => {
    expect(GARANTE_RICERCA_URL).toContain("garanteprivacy.it");
    expect(GARANTE_RICERCA_URL).toContain("Provvedimenti");
  });

  it("le sélecteur titolo-risultato existe dans la fixture", () => {
    expect(FIXTURE_HTML).toContain("titolo-risultato");
  });
});
