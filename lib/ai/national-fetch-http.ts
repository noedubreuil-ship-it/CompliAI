/**
 * En-têtes HTTP pour fetch des portails législatifs nationaux.
 * Node fetch exige des ByteStrings (Latin-1) : pas de tiret long Unicode, accents, etc.
 */

/** UA navigateur ASCII — certains portails (Légifrance, gesetze-im-internet) bloquent les bots exotiques. */
export const NATIONAL_FETCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 CompliAINationalCorpus/1.0";

export function nationalFetchRequestHeaders(): Record<string, string> {
  return {
    Accept: "text/html, text/plain, application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr,en;q=0.9,de;q=0.8",
    "User-Agent": NATIONAL_FETCH_USER_AGENT,
  };
}

/** Vérifie que toutes les valeurs d'en-têtes sont encodables en Latin-1 (exigence fetch Node). */
export function assertAsciiHttpHeaders(headers: Record<string, string>): void {
  for (const [k, v] of Object.entries(headers)) {
    for (let i = 0; i < k.length; i++) {
      if (k.charCodeAt(i) > 255) throw new Error(`Header name non Latin-1: ${k}`);
    }
    for (let i = 0; i < v.length; i++) {
      if (v.charCodeAt(i) > 255) {
        throw new Error(`Header "${k}" contient un caractère non Latin-1 (U+${v.charCodeAt(i).toString(16)})`);
      }
    }
  }
}
