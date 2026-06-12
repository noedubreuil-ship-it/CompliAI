/**
 * Tentative de téléchargement du corps (TXT/HTML) d’un arrêt CJUE depuis l’EUR-Lex.
 * Nombreuses IP / backends reçoivent HTTP 202 (WAF) : prévoir systématiquement un corps de repli (seeds).
 */

import { stripHtml } from "@/lib/ai/national-ingest-core";

const FETCH_TIMEOUT_MS = 25_000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

/** Construit le CELEX type « CJ » à partir du numéro de cause et du millésime après le slash (ex. 582 + 14 → 62014CJ0582). */
export function inferCjeuCelex(caseNumber: number, proceduralYearDigits: number): string {
  const yy = proceduralYearDigits % 100;
  const yyStr = yy.toString().padStart(2, "0");
  const numPart = Math.max(0, Math.floor(caseNumber)).toString().padStart(4, "0");
  return `620${yyStr}CJ${numPart}`;
}

export function eurLexCelexDocumentUrls(celex: string): string[] {
  const c = celex.trim().replace(/\s/g, "");
  const encoded = encodeURIComponent(`CELEX:${c}`);
  return [
    `https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=${encoded}`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=${encoded}`,
    `https://eur-lex.europa.eu/legal-content/FR/HTML/?uri=${encoded}`,
    `https://eur-lex.europa.eu/legal-content/EN/HTML/?uri=${encoded}`,
    `https://eur-lex.europa.eu/legal-content/AUTO/AUTO/?uri=${encoded}`,
    `https://eur-lex.europa.eu/legal-content/AUTO/AUTO/HTML/?uri=${encoded}`,
  ];
}

async function fetchOne(url: string): Promise<{ ok: boolean; text: string }> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,text/plain,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr,en;q=0.9",
        "User-Agent": UA,
      },
    });
    if (res.status !== 200) return { ok: false, text: "" };
    const raw = await res.text();
    if (raw.length < 400) return { ok: false, text: "" };
    return { ok: true, text: stripHtml(raw).trim() };
  } catch {
    return { ok: false, text: "" };
  } finally {
    clearTimeout(t);
  }
}

/** Retourne le texte lisible si l’EUR-Lex répond sans challenge WAF ; sinon null. */
export async function fetchEurLexJudgmentPlaintext(celex: string): Promise<{ text: string; url_used: string } | null> {
  for (const url of eurLexCelexDocumentUrls(celex)) {
    const { ok, text } = await fetchOne(url);
    if (ok && text.length >= 800) return { text, url_used: url };
  }
  return null;
}
