import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it, vi } from "vitest";
import {
  IPSI_NOVICE_URL,
  decodeIpsiProxyUrl,
  fetchIpsiDocuments,
  inferIpsiDocumentType,
  ipsiUrlToExternalId,
  parseIpsiDate,
  parseIpsiHtml,
} from "./ipsi-scraping";

const FIXTURE_PATH = resolve(
  __dirname,
  "../../../tests/fixtures/rag_monitoring/ipsi-novice.html"
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
// parseIpsiDate
// ---------------------------------------------------------------------------
describe("parseIpsiDate", () => {
  it("parse '24.06.2026' (JJ.MM.AAAA) correctement", () => {
    const date = parseIpsiDate("24.06.2026");
    expect(date).toBeDefined();
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(5); // juin = 5
    expect(date!.getDate()).toBe(24);
  });

  it("parse '01.01.2025' correctement", () => {
    const date = parseIpsiDate("01.01.2025");
    expect(date).toBeDefined();
    expect(date!.getFullYear()).toBe(2025);
    expect(date!.getMonth()).toBe(0);
    expect(date!.getDate()).toBe(1);
  });

  it("retourne undefined pour une chaîne vide", () => {
    expect(parseIpsiDate("")).toBeUndefined();
  });

  it("retourne undefined pour un en-tête de tableau 'Datum'", () => {
    expect(parseIpsiDate("Datum")).toBeUndefined();
  });

  it("retourne undefined pour un format non slovène (YYYY-MM-DD)", () => {
    expect(parseIpsiDate("2026-06-24")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// decodeIpsiProxyUrl
// ---------------------------------------------------------------------------
describe("decodeIpsiProxyUrl", () => {
  it("décode un lien via proxy go?u=", () => {
    const href = "https://www.ip-rs.si/go?u=%2Fnovice%2Fjesenski-delavnici-za";
    const decoded = decodeIpsiProxyUrl(href);
    expect(decoded).toBe("https://www.ip-rs.si/novice/jesenski-delavnici-za");
  });

  it("retourne l'URL directe si pas de proxy", () => {
    const href = "https://www.ip-rs.si/novice/article-slug";
    expect(decodeIpsiProxyUrl(href)).toBe(href);
  });

  it("retourne l'URL absolue si chemin relatif", () => {
    const href = "/novice/article-slug";
    expect(decodeIpsiProxyUrl(href)).toContain("ip-rs.si");
  });
});

// ---------------------------------------------------------------------------
// ipsiUrlToExternalId
// ---------------------------------------------------------------------------
describe("ipsiUrlToExternalId", () => {
  it("extrait le slug depuis l'URL décodée", () => {
    const id = ipsiUrlToExternalId("https://www.ip-rs.si/novice/jesenski-delavnici");
    expect(id).toBe("jesenski-delavnici");
  });

  it("deux URLs identiques → même externalId", () => {
    const url = "https://www.ip-rs.si/novice/article-abc";
    expect(ipsiUrlToExternalId(url)).toBe(ipsiUrlToExternalId(url));
  });

  it("deux URLs différentes → externalId différents", () => {
    expect(ipsiUrlToExternalId("https://www.ip-rs.si/novice/a")).not.toBe(
      ipsiUrlToExternalId("https://www.ip-rs.si/novice/b")
    );
  });
});

// ---------------------------------------------------------------------------
// inferIpsiDocumentType
// ---------------------------------------------------------------------------
describe("inferIpsiDocumentType", () => {
  it("classe 'odločba' (décision SL) comme national_decision", () => {
    expect(inferIpsiDocumentType("Odločba o prekršku")).toBe("national_decision");
  });

  it("classe 'sklep' (arrêté SL) comme national_decision", () => {
    expect(inferIpsiDocumentType("Sklep Informacijskega pooblaščenca")).toBe("national_decision");
  });

  it("classe 'smernice' (directives SL) comme national_guideline", () => {
    expect(inferIpsiDocumentType("Smernice za obdelavo osebnih podatkov")).toBe("national_guideline");
  });

  it("classe 'priporočilo' (recommandation SL) comme national_guideline", () => {
    expect(inferIpsiDocumentType("Priporočilo glede umetne inteligence")).toBe("national_guideline");
  });
});

// ---------------------------------------------------------------------------
// parseIpsiHtml — fixture réelle
// ---------------------------------------------------------------------------
describe("parseIpsiHtml avec fixture réelle", () => {
  it("extrait au moins 15 articles depuis la fixture IP SI", () => {
    const docs = parseIpsiHtml(FIXTURE_HTML);
    expect(docs.length).toBeGreaterThan(15);
  });

  it("chaque article a un titre non vide", () => {
    const docs = parseIpsiHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.title.length).toBeGreaterThan(0);
    }
  });

  it("chaque article a une sourceUrl vers ip-rs.si (URL décodée)", () => {
    const docs = parseIpsiHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.sourceUrl).toContain("ip-rs.si");
      // Les URLs doivent être décodées (pas de "go?u=")
      expect(doc.sourceUrl).not.toContain("go?u=");
    }
  });

  it("les externalId sont uniques (déduplication)", () => {
    const docs = parseIpsiHtml(FIXTURE_HTML);
    const ids = new Set(docs.map((d) => d.externalId));
    expect(ids.size).toBe(docs.length);
  });

  it("les externalId sont stables entre deux appels", () => {
    const docs1 = parseIpsiHtml(FIXTURE_HTML);
    const docs2 = parseIpsiHtml(FIXTURE_HTML);
    expect(docs1.map((d) => d.externalId).sort()).toEqual(
      docs2.map((d) => d.externalId).sort()
    );
  });

  it("chaque article a language='sl' et country='SI'", () => {
    const docs = parseIpsiHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.language).toBe("sl");
      expect(doc.country).toBe("SI");
    }
  });

  it("toutes les publicationDate sont des dates valides (format JJ.MM.AAAA fiable)", () => {
    const docs = parseIpsiHtml(FIXTURE_HTML);
    const withDate = docs.filter((d) => d.publicationDate !== undefined);
    expect(withDate.length).toBeGreaterThan(0);
    for (const doc of withDate) {
      expect(isNaN(doc.publicationDate!.getTime())).toBe(false);
    }
  });

  it("les dates de la fixture sont de juin 2026 (fixture récente)", () => {
    const docs = parseIpsiHtml(FIXTURE_HTML);
    const juinDocs = docs.filter(
      (d) =>
        d.publicationDate !== undefined &&
        d.publicationDate.getFullYear() === 2026 &&
        d.publicationDate.getMonth() === 5
    );
    expect(juinDocs.length).toBeGreaterThan(0);
  });

  it("les externalId ne contiennent pas '%' (URLs bien décodées)", () => {
    const docs = parseIpsiHtml(FIXTURE_HTML);
    for (const doc of docs) {
      expect(doc.externalId).not.toContain("%");
    }
  });
});

// ---------------------------------------------------------------------------
// Gestion d'erreurs
// ---------------------------------------------------------------------------
describe("fetchIpsiDocuments — gestion d'erreurs", () => {
  it("lève une erreur si HTTP 404", async () => {
    const fetcher = makeFetcher("Not Found", 404);
    await expect(fetchIpsiDocuments({ fetcher })).rejects.toThrow("404");
  });

  it("lève une erreur si HTTP 503 (source indisponible)", async () => {
    const fetcher = makeFetcher("Service Unavailable", 503);
    await expect(fetchIpsiDocuments({ fetcher })).rejects.toThrow("503");
  });

  it("retourne un tableau vide si le HTML ne contient aucun tableau", async () => {
    const fetcher = makeFetcher("<html><body><p>Ni novosti</p></body></html>");
    const docs = await fetchIpsiDocuments({ fetcher });
    expect(docs).toEqual([]);
  });

  it("retourne un tableau vide si le tableau n'a que des en-têtes", async () => {
    const fetcher = makeFetcher(
      "<html><body><table><thead><tr><th>Datum</th><th>Naslov</th></tr></thead></table></body></html>"
    );
    const docs = await fetchIpsiDocuments({ fetcher });
    expect(docs).toEqual([]);
  });

  it("l'URL par défaut est IPSI_NOVICE_URL", () => {
    expect(IPSI_NOVICE_URL).toBe("https://www.ip-rs.si/novice/");
  });
});
