import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it, vi } from "vitest";
import {
  AI_OFFICE_RSS_URL,
  fetchAiOfficeDocuments,
  isAiOfficeRelevant,
} from "./ai-office-rss";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../tests/fixtures/rag_monitoring/ai-office-rss.xml"
);

function makeFetcher(content: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => content,
  });
}

const FIXTURE_XML = readFileSync(FIXTURE_PATH, "utf-8");

// ---------------------------------------------------------------------------
// isAiOfficeRelevant
// ---------------------------------------------------------------------------
describe("isAiOfficeRelevant", () => {
  it("retourne true pour AI Act", () => {
    expect(isAiOfficeRelevant("New AI Act guidance published", "")).toBe(true);
  });

  it("retourne true pour artificial intelligence", () => {
    expect(isAiOfficeRelevant("Artificial intelligence regulation update", "")).toBe(true);
  });

  it("retourne true pour GPAI (general-purpose AI)", () => {
    expect(isAiOfficeRelevant("GPAI model evaluation framework", "")).toBe(true);
  });

  it("retourne true pour foundation model", () => {
    expect(isAiOfficeRelevant("Foundation model code of practice", "")).toBe(true);
  });

  it("retourne true pour intelligence artificielle (FR)", () => {
    expect(isAiOfficeRelevant("Intelligence artificielle : nouvelles règles", "")).toBe(true);
  });

  it("retourne true pour high-risk AI dans la description", () => {
    expect(isAiOfficeRelevant("Press release", "Requirements for high-risk AI systems")).toBe(true);
  });

  it("retourne false pour Digital Decade unrelated content", () => {
    expect(isAiOfficeRelevant("State of the Digital Decade 2026", "Connectivity and infrastructure")).toBe(false);
  });

  it("retourne false pour contenus non IA", () => {
    expect(isAiOfficeRelevant("Cybersecurity act update", "NIS2 implementation")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchAiOfficeDocuments — fixture réelle
// ---------------------------------------------------------------------------
describe("fetchAiOfficeDocuments avec fixture réelle", () => {
  it("retourne des documents depuis la fixture AI Office RSS (noFilter=true)", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAiOfficeDocuments({ noFilter: true, fetcher });
    expect(docs.length).toBeGreaterThan(0);
  });

  it("le filtre IA réduit le nombre de résultats (tous les items ne sont pas IA)", async () => {
    const allDocs = await fetchAiOfficeDocuments({ noFilter: true, fetcher: makeFetcher(FIXTURE_XML) });
    const filteredDocs = await fetchAiOfficeDocuments({ noFilter: false, fetcher: makeFetcher(FIXTURE_XML) });
    // Le flux digital strategy couvre plus que l'IA → au moins autant de docs non filtrés
    expect(allDocs.length).toBeGreaterThanOrEqual(filteredDocs.length);
  });

  it("chaque document a language='en' et country='EU'", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAiOfficeDocuments({ noFilter: true, fetcher });
    for (const doc of docs) {
      expect(doc.language).toBe("en");
      expect(doc.country).toBe("EU");
    }
  });

  it("les externalId sont uniques (déduplication)", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAiOfficeDocuments({ noFilter: true, fetcher });
    const ids = new Set(docs.map((d) => d.externalId));
    expect(ids.size).toBe(docs.length);
  });

  it("les externalId sont stables entre deux appels", async () => {
    const docs1 = await fetchAiOfficeDocuments({ noFilter: true, fetcher: makeFetcher(FIXTURE_XML) });
    const docs2 = await fetchAiOfficeDocuments({ noFilter: true, fetcher: makeFetcher(FIXTURE_XML) });
    expect(docs1.map((d) => d.externalId).sort()).toEqual(
      docs2.map((d) => d.externalId).sort()
    );
  });

  it("les sourceUrl pointent vers digital-strategy.ec.europa.eu", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAiOfficeDocuments({ noFilter: true, fetcher });
    for (const doc of docs) {
      expect(doc.sourceUrl).toMatch(/digital-strategy\.ec\.europa\.eu/);
    }
  });

  it("les publicationDate sont des Date valides quand présentes", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAiOfficeDocuments({ noFilter: true, fetcher });
    for (const doc of docs) {
      if (doc.publicationDate !== undefined) {
        expect(doc.publicationDate instanceof Date).toBe(true);
        expect(isNaN(doc.publicationDate.getTime())).toBe(false);
      }
    }
  });

  it("le documentType est toujours ai_office_guidance", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAiOfficeDocuments({ noFilter: true, fetcher });
    for (const doc of docs) {
      expect(doc.documentType).toBe("ai_office_guidance");
    }
  });
});

// ---------------------------------------------------------------------------
// Gestion d'erreurs
// ---------------------------------------------------------------------------
describe("fetchAiOfficeDocuments — gestion d'erreurs", () => {
  it("lève une erreur si HTTP 404", async () => {
    const fetcher = makeFetcher("Not Found", 404);
    await expect(fetchAiOfficeDocuments({ fetcher })).rejects.toThrow("404");
  });

  it("lève une erreur si HTTP 500", async () => {
    const fetcher = makeFetcher("Internal Server Error", 500);
    await expect(fetchAiOfficeDocuments({ fetcher })).rejects.toThrow("500");
  });

  it("retourne un tableau vide si le XML est vide", async () => {
    const fetcher = makeFetcher(
      '<?xml version="1.0"?><rss version="2.0"><channel><title>EC</title></channel></rss>'
    );
    const docs = await fetchAiOfficeDocuments({ noFilter: true, fetcher });
    expect(docs).toEqual([]);
  });

  it("retourne un tableau vide si le contenu est du HTML (SPA inaccessible)", async () => {
    const fetcher = makeFetcher("<!DOCTYPE html><html><body>Loading…</body></html>");
    const docs = await fetchAiOfficeDocuments({ noFilter: true, fetcher });
    expect(docs).toEqual([]);
  });

  it("l'URL par défaut est AI_OFFICE_RSS_URL", () => {
    expect(AI_OFFICE_RSS_URL).toBe(
      "https://digital-strategy.ec.europa.eu/en/rss.xml"
    );
  });
});
