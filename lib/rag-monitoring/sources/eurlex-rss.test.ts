import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fetchEurlexRss , extractCelex } from "./eurlex-rss";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../tests/fixtures/rag_monitoring/eurlex-rss.xml"
);

function makeMockFetcher(content: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(content),
  });
}

describe("fetchEurlexRss", () => {
  it("parse le flux RSS et retourne uniquement les documents pertinents", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const mockFetcher = makeMockFetcher(xml);

    const docs = await fetchEurlexRss({ fetcher: mockFetcher });

    // La fixture contient 3 docs pertinents et 1 non-pertinent (agriculture)
    expect(docs.length).toBeGreaterThanOrEqual(2);
    expect(docs.length).toBeLessThan(4); // le doc agricole doit être filtré
  });

  it("filtre les documents non pertinents (agriculture)", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchEurlexRss({ fetcher: makeMockFetcher(xml) });

    const titles = docs.map((d) => d.title.toLowerCase());
    const hasAgriculture = titles.some((t) => t.includes("agricole") || t.includes("subvention"));
    expect(hasAgriculture).toBe(false);
  });

  it("extrait le CELEX correctement depuis le lien", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchEurlexRss({ fetcher: makeMockFetcher(xml) });

    const withCelex = docs.filter((d) => d.celex);
    expect(withCelex.length).toBeGreaterThan(0);
    expect(withCelex[0].celex).toMatch(/^3\d{4}[RL]/);
  });

  it("retourne eu_regulation pour un CELEX de type règlement (R)", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchEurlexRss({ fetcher: makeMockFetcher(xml) });

    const regulations = docs.filter((d) => d.celex?.includes("R"));
    expect(regulations.every((d) => d.documentType === "eu_regulation")).toBe(true);
  });

  it("retourne eu_directive pour un CELEX de type directive (L)", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchEurlexRss({ fetcher: makeMockFetcher(xml) });

    const directives = docs.filter((d) => d.celex?.includes("L") && !d.celex?.includes("R"));
    expect(directives.every((d) => d.documentType === "eu_directive")).toBe(true);
  });

  it("retourne une langue 'fr' sur tous les documents", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchEurlexRss({ fetcher: makeMockFetcher(xml) });

    expect(docs.every((d) => d.language === "fr")).toBe(true);
  });

  it("retourne un tableau vide si le flux est vide", async () => {
    const emptyXml = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Test</title></channel></rss>`;
    const docs = await fetchEurlexRss({ fetcher: makeMockFetcher(emptyXml) });
    expect(docs).toEqual([]);
  });

  it("lance une erreur si le serveur retourne HTTP 503", async () => {
    const mockFetcher = makeMockFetcher("Service Unavailable", 503);
    await expect(fetchEurlexRss({ fetcher: mockFetcher })).rejects.toThrow("HTTP 503");
  });

  it("appelle la bonne URL par défaut", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const mockFetcher = makeMockFetcher(xml);
    await fetchEurlexRss({ fetcher: mockFetcher });
    expect(mockFetcher).toHaveBeenCalledWith(
      expect.stringContaining("eur-lex.europa.eu")
    );
  });
});

describe("extractCelex — flux display-feed.rss (2026-07-18)", () => {
  it("lit le CELEX depuis le titre quand le lien ne le porte pas", () => {
    // Nouveau flux : « CELEX:32026R1778: Règlement d'exécution… »
    expect(
      extractCelex(
        "https://eur-lex.europa.eu/legal-content/FR/TXT/",
        "",
        "CELEX:32026R1778: Règlement d'exécution (UE) 2026/1778"
      )
    ).toBe("32026R1778");
  });

  it("privilégie toujours le lien quand il porte le CELEX", () => {
    expect(
      extractCelex(
        "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024R1689",
        "",
        "CELEX:99999R9999: autre"
      )
    ).toBe("32024R1689");
  });

  it("renvoie undefined quand aucun CELEX n'est présent", () => {
    expect(extractCelex("https://example.org/doc", "", "Un titre")).toBeUndefined();
  });
});
