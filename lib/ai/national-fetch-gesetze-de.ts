/**
 * Agrège le texte des lois fédérales allemandes sur gesetze-im-internet.de
 * (pages __N.html liées depuis index.html).
 */

import { fetchAllowlistedNationalHttpsPage } from "@/lib/ai/national-fetch-page";
import { isExploitableStatutePlaintext } from "@/lib/ai/national-statute-plaintext";
import { stripHtml } from "@/lib/ai/national-ingest-core";
import { isNationalFetchHostnameAllowed } from "@/lib/ai/national-fetch-allowlist";
import { nationalFetchRequestHeaders } from "@/lib/ai/national-fetch-http";

const MAX_SECTION_PAGES = 48;

export async function fetchGesetzeImInternetStatute(
  baseUrl: string,
  countryCode = "DE"
): Promise<{ text: string; finalUrl: string } | null> {
  const normalized = baseUrl.replace(/\/?$/, "/");
  const indexUrl = normalized.endsWith("index.html") ? normalized : `${normalized}index.html`;

  let indexHtml = "";
  try {
    const res = await fetch(indexUrl, { headers: nationalFetchRequestHeaders() });
    if (!res.ok) return null;
    const host = new URL(res.url).hostname;
    if (!isNationalFetchHostnameAllowed(host, countryCode)) return null;
    indexHtml = await res.text();
  } catch {
    return null;
  }

  const indexText = stripHtml(indexHtml);
  const sectionPaths = new Set<string>();
  const re = /href="([^"]*__\d+\.html)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(indexHtml)) !== null) {
    const href = m[1];
    try {
      const abs = new URL(href, indexUrl).toString();
      sectionPaths.add(abs);
    } catch {
      /* skip */
    }
  }

  const parts: string[] = [indexText];
  const sorted = [...sectionPaths].sort((a, b) => a.localeCompare(b, "de")).slice(0, MAX_SECTION_PAGES);

  for (const sectionUrl of sorted) {
    const page = await fetchAllowlistedNationalHttpsPage(sectionUrl, countryCode);
    if (page?.text && page.text.length > 200) parts.push(page.text);
  }

  const text = parts.join("\n\n---\n\n");
  if (!isExploitableStatutePlaintext(text)) return null;

  return { text, finalUrl: indexUrl };
}
