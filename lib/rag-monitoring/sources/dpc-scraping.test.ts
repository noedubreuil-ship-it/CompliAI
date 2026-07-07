import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it, vi } from "vitest";
import {
  DPC_DECISIONS_URL,
  DPC_SELECTORS,
  dpcUrlToExternalId,
  fetchDpcDecisions,
  parseDpcDate,
  parseDpcDecisionsHtml,
} from "./dpc-scraping";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../tests/fixtures/rag_monitoring/dpc-decisions.html"
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
// parseDpcDate
// ---------------------------------------------------------------------------
describe("parseDpcDate", () => {
  it("parse '10 Dec 2025' correctement", () => {
    const date = parseDpcDate("10 Dec 2025");
    expect(date).toBeDefined();
    expect(date!.getFullYear()).toBe(2025);
    expect(date!.getMonth()).toBe(11); // décembre = 11
    expect(date!.getDate()).toBe(10);
  });

  it("parse '23 Jun 2025' correctement", () => {
    const date = parseDpcDate("23 Jun 2025");
    expect(date).toBeDefined();
    expect(date!.getFullYear()).toBe(2025);
    expect(date!.getMonth()).toBe(5); // juin = 5
  });

  it("retourne undefined pour une chaîne vide", () => {
    expect(parseDpcDate("")).toBeUndefined();
  });

  it("retourne undefined pour une chaîne invalide", () => {
    expect(parseDpcDate("not a date")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// dpcUrlToExternalId
// ---------------------------------------------------------------------------
describe("dpcUrlToExternalId", () => {
  it("extrait le slug depuis l'URL d'une décision", () => {
    const id = dpcUrlToExternalId("/en/dpc-guidance/decisions/inquiry-concerning-university-limerick");
    expect(id).toBe("inquiry-concerning-university-limerick");
  });

  it("deux URLs identiques → même externalId (stabilité)", () => {
    const href = "/en/dpc-guidance/decisions/inquiry-abc-company";
    expect(dpcUrlToExternalId(href)).toBe(dpcUrlToExternalId(href));
  });

  it("deux URLs différentes → externalId différents", () => {
    const id1 = dpcUrlToExternalId("/en/dpc-guidance/decisions/decision-a");
    const id2 = dpcUrlToExternalId("/en/dpc-guidance/decisions/decision-b");
    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// parseDpcDecisionsHtml — fixture réelle
// ---------------------------------------------------------------------------
describe("parseDpcDecisionsHtml avec fixture réelle", () => {
  it("extrait au moins 20 décisions depuis la fixture DPC", () => {
    const docs = parseDpcDecisionsHtml(FIXTURE_HTML);
    expect(docs.length).toBeGreaterThan(20);
  });

  it("chaque décision a un titre non vide", () => {
    const docs = parseDpcDecisionsHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.title.length).toBeGreaterThan(0);
    }
  });

  it("chaque décision a une sourceUrl absolue vers dataprotection.ie", () => {
    const docs = parseDpcDecisionsHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.sourceUrl).toMatch(/https:\/\/www\.dataprotection\.ie\//);
    }
  });

  it("chaque décision a un externalId unique", () => {
    const docs = parseDpcDecisionsHtml(FIXTURE_HTML);
    const ids = new Set(docs.map((d) => d.externalId));
    expect(ids.size).toBe(docs.length);
  });

  it("les externalId sont stables (deux appels identiques)", () => {
    const docs1 = parseDpcDecisionsHtml(FIXTURE_HTML);
    const docs2 = parseDpcDecisionsHtml(FIXTURE_HTML);
    expect(docs1.map((d) => d.externalId).sort()).toEqual(
      docs2.map((d) => d.externalId).sort()
    );
  });

  it("le documentType est national_decision pour toutes les décisions", () => {
    const docs = parseDpcDecisionsHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.documentType).toBe("national_decision");
    }
  });

  it("chaque document a language='en' et country='IE'", () => {
    const docs = parseDpcDecisionsHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.language).toBe("en");
      expect(doc.country).toBe("IE");
    }
  });

  it("au moins une décision a une publicationDate valide", () => {
    const docs = parseDpcDecisionsHtml(FIXTURE_HTML);
    const withDate = docs.filter((d) => d.publicationDate !== undefined);
    expect(withDate.length).toBeGreaterThan(0);
    for (const doc of withDate) {
      expect(isNaN(doc.publicationDate!.getTime())).toBe(false);
    }
  });

  it("la première décision contient 'University of Limerick'", () => {
    const docs = parseDpcDecisionsHtml(FIXTURE_HTML);
    expect(docs[0].title).toContain("Limerick");
  });
});

// ---------------------------------------------------------------------------
// Gestion d'erreurs
// ---------------------------------------------------------------------------
describe("fetchDpcDecisions — gestion d'erreurs", () => {
  it("lève une erreur si HTTP 404", async () => {
    const fetcher = makeFetcher("Not Found", 404);
    await expect(fetchDpcDecisions({ fetcher })).rejects.toThrow("404");
  });

  it("lève une erreur si HTTP 503 (service indisponible)", async () => {
    const fetcher = makeFetcher("Service Unavailable", 503);
    await expect(fetchDpcDecisions({ fetcher })).rejects.toThrow("503");
  });

  it("retourne un tableau vide si le HTML ne contient aucune décision", async () => {
    const fetcher = makeFetcher("<html><body><div>No decisions here</div></body></html>");
    const docs = await fetchDpcDecisions({ fetcher });
    expect(docs).toEqual([]);
  });

  it("retourne un tableau vide sur une page vide", async () => {
    const fetcher = makeFetcher("");
    const docs = await fetchDpcDecisions({ fetcher });
    expect(docs).toEqual([]);
  });

  it("l'URL par défaut est DPC_DECISIONS_URL", () => {
    expect(DPC_DECISIONS_URL).toBe(
      "https://www.dataprotection.ie/en/dpc-guidance/decisions"
    );
  });

  it("les sélecteurs CSS documentés existent dans la fixture réelle", () => {
    expect(FIXTURE_HTML).toContain(DPC_SELECTORS.item.replace(".", ""));
  });
});
