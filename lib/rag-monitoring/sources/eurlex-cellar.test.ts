import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fetchEurlexCellar } from "./eurlex-cellar";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../tests/fixtures/rag_monitoring/eurlex-cellar.json"
);

function makeMockFetcher(content: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(content),
  });
}

describe("fetchEurlexCellar", () => {
  it("parse la réponse SPARQL et retourne les documents", async () => {
    const json = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchEurlexCellar({ fetcher: makeMockFetcher(json) });

    expect(docs.length).toBe(3);
  });

  it("extrait le CELEX correctement", async () => {
    const json = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchEurlexCellar({ fetcher: makeMockFetcher(json) });

    const celexValues = docs.map((d) => d.celex);
    expect(celexValues).toContain("32026R1234");
    expect(celexValues).toContain("32026L0789");
  });

  it("reconnaît un CELEX consolidé (format 0YYYYRNNNN-YYYYMMDD)", async () => {
    const json = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchEurlexCellar({ fetcher: makeMockFetcher(json) });

    const consolidated = docs.find((d) => d.celex === "02024R1689-20260601");
    expect(consolidated).toBeDefined();
    expect(consolidated?.documentType).toBe("eu_regulation");
  });

  it("génère une sourceUrl EUR-Lex valide si absente de la réponse", async () => {
    const minimalJson = JSON.stringify({
      results: {
        bindings: [
          {
            celex: { value: "32026R9999" },
            title: { value: "Test Regulation" },
            date: { value: "2026-01-01" },
          },
        ],
      },
    });
    const docs = await fetchEurlexCellar({ fetcher: makeMockFetcher(minimalJson) });
    expect(docs[0].sourceUrl).toBe(
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32026R9999"
    );
  });

  it("retourne eu_regulation pour les règlements", async () => {
    const json = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchEurlexCellar({ fetcher: makeMockFetcher(json) });

    const regs = docs.filter((d) => d.celex?.match(/^3\d{4}R/));
    expect(regs.every((d) => d.documentType === "eu_regulation")).toBe(true);
  });

  it("retourne eu_directive pour les directives", async () => {
    const json = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchEurlexCellar({ fetcher: makeMockFetcher(json) });

    const dirs = docs.filter((d) => d.celex?.match(/^3\d{4}L/) && !d.celex?.match(/R/));
    expect(dirs.every((d) => d.documentType === "eu_directive")).toBe(true);
  });

  it("retourne un tableau vide si la réponse SPARQL ne contient pas de bindings", async () => {
    const emptyJson = JSON.stringify({ results: { bindings: [] } });
    const docs = await fetchEurlexCellar({ fetcher: makeMockFetcher(emptyJson) });
    expect(docs).toEqual([]);
  });

  it("lance une erreur si le serveur retourne HTTP 429", async () => {
    await expect(
      fetchEurlexCellar({ fetcher: makeMockFetcher("Too Many Requests", 429) })
    ).rejects.toThrow("HTTP 429");
  });

  it("construit la requête SPARQL avec la date fromDate fournie", async () => {
    const json = readFileSync(FIXTURE_PATH, "utf-8");
    const mockFetcher = makeMockFetcher(json);
    await fetchEurlexCellar({ fromDate: "2025-01-01", fetcher: mockFetcher });

    const calledUrl = mockFetcher.mock.calls[0][0] as string;
    expect(calledUrl).toContain("2025-01-01");
  });
});
