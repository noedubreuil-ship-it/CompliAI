/**
 * Fetch HTTPS allowlisté pour l'ingestion du droit national (pages HTML consolidées).
 */

import { stripHtml } from "@/lib/ai/national-ingest-core";
import { isNationalFetchHostnameAllowed } from "@/lib/ai/national-fetch-allowlist";
import { nationalFetchRequestHeaders } from "@/lib/ai/national-fetch-http";

const HTTP_TIMEOUT_MS = Number(process.env.NATIONAL_AUTO_INGEST_HTTP_TIMEOUT_MS) || 20000;
const MAX_RESPONSE_BYTES = Number(process.env.NATIONAL_AUTO_INGEST_MAX_BYTES) || 2_000_000;

export async function fetchAllowlistedNationalHttpsPage(
  urlStr: string,
  countryCode: string
): Promise<{ text: string; finalUrl: string } | null> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (!isNationalFetchHostnameAllowed(parsed.hostname, countryCode)) return null;

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), HTTP_TIMEOUT_MS);

  try {
    const res = await fetch(urlStr, {
      redirect: "follow",
      signal: ac.signal,
      headers: nationalFetchRequestHeaders(),
    });
    const finalUrl = res.url;
    const finalParsed = new URL(finalUrl);
    if (finalParsed.protocol !== "https:") return null;
    if (!isNationalFetchHostnameAllowed(finalParsed.hostname, countryCode)) return null;

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/pdf") || ct.includes("application/octet-stream")) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_RESPONSE_BYTES) return null;
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    if (/just a moment|challenges\.cloudflare\.com|cf-browser-verification/i.test(raw.slice(0, 4000))) {
      return null;
    }
    const text = stripHtml(raw);
    return { text, finalUrl };
  } catch (e) {
    console.warn("[national-fetch-page] fetch", countryCode, urlStr, e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(to);
  }
}
