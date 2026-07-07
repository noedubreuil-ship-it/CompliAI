import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it, vi } from "vitest";
import {
  AEPD_RSS_URL,
  fetchAepdDocuments,
  inferAepdDocumentType,
  isAepdRelevant,
} from "./aepd-rss";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../tests/fixtures/rag_monitoring/aepd-rss.xml"
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
// isAepdRelevant
// ---------------------------------------------------------------------------
describe("isAepdRelevant", () => {
  it("retourne true pour protección de datos (ES)", () => {
    expect(isAepdRelevant("Protección de datos en el sector sanitario", "")).toBe(true);
  });

  it("retourne true pour resolución (ES)", () => {
    expect(isAepdRelevant("Resolución contra empresa X", "")).toBe(true);
  });

  it("retourne true pour RGPD (ES)", () => {
    expect(isAepdRelevant("Nuevo procedimiento RGPD 2026", "")).toBe(true);
  });

  it("retourne true pour inteligencia artificial", () => {
    expect(isAepdRelevant("Guía sobre inteligencia artificial", "")).toBe(true);
  });

  it("retourne true pour sanción dans la description", () => {
    expect(isAepdRelevant("Nota de prensa", "sanción impuesta a operador de telecomunicaciones")).toBe(true);
  });

  it("retourne false pour contenu non pertinent", () => {
    expect(isAepdRelevant("Evento celebrado en Madrid", "Conferencia anual")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// inferAepdDocumentType
// ---------------------------------------------------------------------------
describe("inferAepdDocumentType", () => {
  it("classe resolución comme national_decision", () => {
    expect(inferAepdDocumentType("Resolución R/01234/2026")).toBe("national_decision");
  });

  it("classe sanción comme national_decision", () => {
    expect(inferAepdDocumentType("Sanción impuesta a operador")).toBe("national_decision");
  });

  it("classe expediente comme national_decision", () => {
    expect(inferAepdDocumentType("Expediente sancionador")).toBe("national_decision");
  });

  it("classe guía comme national_guideline", () => {
    expect(inferAepdDocumentType("Guía práctica para cumplimiento del RGPD")).toBe("national_guideline");
  });

  it("classe directrices comme national_guideline", () => {
    expect(inferAepdDocumentType("Directrices sobre tratamiento de datos")).toBe("national_guideline");
  });

  it("classe recomendación comme national_guideline", () => {
    expect(inferAepdDocumentType("Recomendación sobre inteligencia artificial")).toBe("national_guideline");
  });
});

// ---------------------------------------------------------------------------
// fetchAepdDocuments — fixture réelle
// ---------------------------------------------------------------------------
describe("fetchAepdDocuments avec fixture réelle", () => {
  it("retourne des documents depuis la fixture AEPD RSS", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAepdDocuments({ noFilter: true, fetcher });
    expect(docs.length).toBeGreaterThan(0);
  });

  it("chaque document a language='es' et country='ES'", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAepdDocuments({ noFilter: true, fetcher });
    for (const doc of docs) {
      expect(doc.language).toBe("es");
      expect(doc.country).toBe("ES");
    }
  });

  it("les externalId sont uniques (déduplication)", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAepdDocuments({ noFilter: true, fetcher });
    const ids = new Set(docs.map((d) => d.externalId));
    expect(ids.size).toBe(docs.length);
  });

  it("les externalId sont stables entre deux appels", async () => {
    const docs1 = await fetchAepdDocuments({ noFilter: true, fetcher: makeFetcher(FIXTURE_XML) });
    const docs2 = await fetchAepdDocuments({ noFilter: true, fetcher: makeFetcher(FIXTURE_XML) });
    expect(docs1.map((d) => d.externalId).sort()).toEqual(
      docs2.map((d) => d.externalId).sort()
    );
  });

  it("les sourceUrl pointent vers aepd.es", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAepdDocuments({ noFilter: true, fetcher });
    for (const doc of docs) {
      expect(doc.sourceUrl).toMatch(/aepd\.es/);
    }
  });

  it("les publicationDate sont des Date valides quand présentes", async () => {
    const fetcher = makeFetcher(FIXTURE_XML);
    const docs = await fetchAepdDocuments({ noFilter: true, fetcher });
    for (const doc of docs) {
      if (doc.publicationDate !== undefined) {
        expect(doc.publicationDate instanceof Date).toBe(true);
        expect(isNaN(doc.publicationDate.getTime())).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Gestion d'erreurs
// ---------------------------------------------------------------------------
describe("fetchAepdDocuments — gestion d'erreurs", () => {
  it("lève une erreur si HTTP 404", async () => {
    const fetcher = makeFetcher("Not Found", 404);
    await expect(fetchAepdDocuments({ fetcher })).rejects.toThrow("404");
  });

  it("lève une erreur si HTTP 503 (rate limit)", async () => {
    const fetcher = makeFetcher("Service Unavailable", 503);
    await expect(fetchAepdDocuments({ fetcher })).rejects.toThrow("503");
  });

  it("retourne un tableau vide si le XML est vide", async () => {
    const fetcher = makeFetcher(
      '<?xml version="1.0"?><rss version="2.0"><channel><title>AEPD</title></channel></rss>'
    );
    const docs = await fetchAepdDocuments({ noFilter: true, fetcher });
    expect(docs).toEqual([]);
  });

  it("retourne un tableau vide si le contenu est du HTML (format inattendu)", async () => {
    const fetcher = makeFetcher("<!DOCTYPE html><html><body>Error</body></html>");
    const docs = await fetchAepdDocuments({ noFilter: true, fetcher });
    expect(docs).toEqual([]);
  });

  it("l'URL par défaut est AEPD_RSS_URL", () => {
    expect(AEPD_RSS_URL).toBe("https://www.aepd.es/noticias/feed.xml");
  });
});
