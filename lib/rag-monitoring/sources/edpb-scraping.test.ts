import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fetchEdpbDocuments, checkMarkupIntegrity, hashPageStructure } from "./edpb-scraping";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../tests/fixtures/rag_monitoring/edpb-documents.html"
);

function makeMockFetcher(content: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(content),
  });
}

describe("fetchEdpbDocuments", () => {
  it("détecte des documents dans le vrai HTML EDPB", async () => {
    const html = readFileSync(FIXTURE_PATH, "utf-8");
    const result = await fetchEdpbDocuments({ fetcher: makeMockFetcher(html) });

    expect(result.documents.length).toBeGreaterThan(0);
  });

  it("retourne un pageHash non vide", async () => {
    const html = readFileSync(FIXTURE_PATH, "utf-8");
    const result = await fetchEdpbDocuments({ fetcher: makeMockFetcher(html) });

    expect(result.pageHash).toBeTruthy();
    expect(result.pageHash).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it("chaque document a une sourceUrl qui commence par https", async () => {
    const html = readFileSync(FIXTURE_PATH, "utf-8");
    const result = await fetchEdpbDocuments({ fetcher: makeMockFetcher(html) });

    for (const doc of result.documents) {
      expect(doc.sourceUrl.startsWith("https://")).toBe(true);
    }
  });

  it("chaque document a un externalId non vide", async () => {
    const html = readFileSync(FIXTURE_PATH, "utf-8");
    const result = await fetchEdpbDocuments({ fetcher: makeMockFetcher(html) });

    for (const doc of result.documents) {
      expect(doc.externalId).toBeTruthy();
    }
  });

  it("reconnaît les avis du comité (article 64) comme edpb_guideline", async () => {
    const html = readFileSync(FIXTURE_PATH, "utf-8");
    const result = await fetchEdpbDocuments({ fetcher: makeMockFetcher(html) });

    const opinions = result.documents.filter((d) => d.documentType === "edpb_guideline");
    expect(opinions.length).toBeGreaterThan(0);
  });

  it("retourne la langue 'fr' sur tous les documents", async () => {
    const html = readFileSync(FIXTURE_PATH, "utf-8");
    const result = await fetchEdpbDocuments({ fetcher: makeMockFetcher(html) });

    expect(result.documents.every((d) => d.language === "fr")).toBe(true);
  });

  it("ne génère pas d'alerte markup si la page est valide", async () => {
    const html = readFileSync(FIXTURE_PATH, "utf-8");
    const result = await fetchEdpbDocuments({ fetcher: makeMockFetcher(html) });

    expect(result.markupAlerts).toHaveLength(0);
  });

  it("lance une erreur si le serveur retourne HTTP 403", async () => {
    await expect(
      fetchEdpbDocuments({ fetcher: makeMockFetcher("Forbidden", 403) })
    ).rejects.toThrow("HTTP 403");
  });
});

describe("checkMarkupIntegrity", () => {
  it("retourne SCRAPING_ERROR si itemCount = 0 sans hash précédent", () => {
    const alerts = checkMarkupIntegrity("<html></html>", undefined, 0);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("SCRAPING_ERROR");
  });

  it("retourne MARKUP_CHANGE si itemCount = 0 et le hash a changé", () => {
    const alerts = checkMarkupIntegrity(
      "<html><main>new content</main></html>",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      0
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe("MARKUP_CHANGE");
  });

  it("ne retourne aucune alerte si des items sont trouvés", () => {
    const html = readFileSync(FIXTURE_PATH, "utf-8");
    const hash = hashPageStructure(html);
    const alerts = checkMarkupIntegrity(html, hash, 5);
    expect(alerts).toHaveLength(0);
  });
});

describe("hashPageStructure", () => {
  it("retourne un hash SHA-256 stable pour le même input", () => {
    const html = readFileSync(FIXTURE_PATH, "utf-8");
    expect(hashPageStructure(html)).toBe(hashPageStructure(html));
  });

  it("retourne un hash différent pour un HTML différent", () => {
    const hash1 = hashPageStructure("<main>v1</main>");
    const hash2 = hashPageStructure("<main>v2</main>");
    expect(hash1).not.toBe(hash2);
  });
});
