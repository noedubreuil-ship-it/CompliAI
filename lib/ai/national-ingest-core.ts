/**
 * Découpe et nettoyage du texte juridique pour `national_legal_texts`
 * (ingestion manuelle, auto-fetch, ou scripts).
 */

export interface NationalTextChunk {
  label: string;
  content: string;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const cp = parseInt(hex, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const cp = parseInt(dec, 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : "";
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&uuml;/gi, "ü")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&auml;/gi, "ä")
    .replace(/&Auml;/g, "Ä")
    .replace(/&ouml;/gi, "ö")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&szlig;/gi, "ß");
}

export function stripHtml(text: string): string {
  if (!text.includes("<") && !/&#?\w+;/.test(text)) return text;
  return decodeHtmlEntities(
    text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<\/?(p|div|br|h[1-6]|li|tr|td|th|blockquote|section|article|main|header|footer|nav)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function windowChunk(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const paragraphs = text.split(/\n{2,}/);
  const out: string[] = [];
  let buf = "";

  function flush(force?: boolean) {
    if (!buf.trim()) return;
    if (buf.length >= maxChars * 0.55 || force) {
      out.push(buf.trim());
      buf = "";
    }
  }

  for (const p of paragraphs) {
    const chunk = p.trim();
    if (!chunk) continue;
    if ((buf + "\n\n" + chunk).length <= maxChars) {
      buf = buf ? `${buf}\n\n${chunk}` : chunk;
    } else {
      flush(true);
      if (chunk.length <= maxChars) buf = chunk;
      else hardSplit(chunk, maxChars).forEach((h) => out.push(h));
    }
  }
  flush(true);
  return out;
}

function hardSplit(chunk: string, maxChars: number): string[] {
  const slices: string[] = [];
  for (let i = 0; i < chunk.length; i += maxChars) {
    slices.push(chunk.slice(i, i + maxChars).trim());
  }
  return slices.filter(Boolean);
}

/** Découpe « article » puis § (all.), sinon fenêtres par paragraphes. */
export function chunkLegalText(text: string, maxChars: number): NationalTextChunk[] {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (t.length === 0) return [];

  const articleSplitRegex =
    /(?=(?:^|\n)\s*(?:Article|Artikel|Art\.)\s+(?:\d+[a-z]*|[IVXLCDM]+|premier|first)\b)/gi;
  let parts = t.split(articleSplitRegex).map((p) => p.trim()).filter((p) => p.length >= 80);

  if (parts.length <= 1) {
    const paraSplit = /(?=(?:^|\n)\s*§\s*\d+[a-z]?\b)/g;
    parts = t.split(paraSplit).map((p) => p.trim()).filter((p) => p.length >= 60);
  }

  const chunks: NationalTextChunk[] = [];

  if (parts.length > 1) {
    let idx = 0;
    for (const part of parts) {
      idx += 1;
      let label = `partie_${idx}`;
      const art = part.match(/^(?:Article|Artikel|Art\.)\s+([\w.-]+)|^§\s*(\d+[a-z]?)/i);
      if (art) label = art[1] || `§${art[2]}`;

      for (const window of windowChunk(part, maxChars)) {
        chunks.push({ label, content: window });
      }
    }
    return chunks;
  }

  for (const window of windowChunk(t, maxChars)) {
    chunks.push({ label: "extrait", content: window });
  }
  return chunks;
}
