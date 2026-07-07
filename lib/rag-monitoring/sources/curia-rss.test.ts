import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fetchCuriaRss } from "./curia-rss";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../tests/fixtures/rag_monitoring/curia-rss.xml"
);

function makeMockFetcher(content: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(content),
  });
}

describe("fetchCuriaRss", () => {
  it("parse le flux RSS Curia et retourne uniquement les arrêts pertinents", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchCuriaRss({ fetcher: makeMockFetcher(xml) });

    // La fixture a 3 arrêts pertinents et 1 non-pertinent (TVA)
    expect(docs.length).toBeGreaterThanOrEqual(2);
  });

  it("filtre les arrêts non pertinents (fiscal, TVA)", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchCuriaRss({ fetcher: makeMockFetcher(xml) });

    const titles = docs.map((d) => d.title.toLowerCase());
    const hasTva = titles.some((t) => t.includes("tva") || t.includes("fiscal"));
    expect(hasTva).toBe(false);
  });

  it("affecte toujours le type cjeu_judgment", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchCuriaRss({ fetcher: makeMockFetcher(xml) });

    expect(docs.every((d) => d.documentType === "cjeu_judgment")).toBe(true);
  });

  it("retourne une langue 'fr' sur tous les documents", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchCuriaRss({ fetcher: makeMockFetcher(xml) });

    expect(docs.every((d) => d.language === "fr")).toBe(true);
  });

  it("extrait le CELEX depuis l'URL du lien", async () => {
    const xml = readFileSync(FIXTURE_PATH, "utf-8");
    const docs = await fetchCuriaRss({ fetcher: makeMockFetcher(xml) });

    const withCelex = docs.filter((d) => d.celex);
    expect(withCelex.length).toBeGreaterThan(0);
    expect(withCelex[0].celex).toMatch(/^6\d{4}CJ/);
  });

  it("retourne un tableau vide si le flux est vide", async () => {
    const emptyXml = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Curia</title></channel></rss>`;
    const docs = await fetchCuriaRss({ fetcher: makeMockFetcher(emptyXml) });
    expect(docs).toEqual([]);
  });

  it("lance une erreur si le serveur retourne HTTP 500", async () => {
    await expect(
      fetchCuriaRss({ fetcher: makeMockFetcher("Server Error", 500) })
    ).rejects.toThrow("HTTP 500");
  });
});
