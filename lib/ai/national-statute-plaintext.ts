/** Heuristiques : le texte extrait d'une page HTML est-il un acte législatif exploitable ? */

const MIN_CHARS = 800;

const SPA_MARKERS =
  /just a moment|challenges\.cloudflare|enable javascript|se încarcă|loading\.\.\.|__next_data__|webpack|noscript>/i;

const LEGAL_SIGNAL =
  /(?:§\s*\d+[a-z]?|\b(?:art\.|article|artículo|artigo|paragraphe|paragraf|chapitre|chapter|section|alínea|str\.|člen|paragraaf|preambul)\b)/gi;

export function isExploitableStatutePlaintext(text: string): boolean {
  const t = text.trim();
  if (t.length < MIN_CHARS) return false;
  if (SPA_MARKERS.test(t.slice(0, 6000))) return false;

  const words = t.split(/\s+/).filter(Boolean).length;
  if (t.length > 2500 && words < 100) return false;

  const legalHits = (t.match(LEGAL_SIGNAL) || []).length;
  if (t.length > 4000 && legalHits < 2) return false;

  return true;
}
