/**
 * Recherche de commentaires de doctrine sur une décision judiciaire ou réglementaire.
 *
 * Sources utilisées (APIs publiques) :
 * 1. EUR-Lex — textes qui citent la décision (références croisées)
 * 2. CURIA — informations sur l'arrêt (parties, rapporteur, AG opinion)
 * 3. EUR-Lex full-text — recherche par numéro de cas ou ECLI
 *
 * Note : Les bases de doctrine payantes (Dalloz, LGDJ, Lexis) ne sont pas
 * accessibles via API publique. On s'appuie sur les sources EUR-Lex / CURIA
 * et les revues en accès libre (RTDE, AJDA…) indexées sur EUR-Lex.
 */

import type { CalendarDecision } from "./calendar-context";

export interface DoctrineResult {
  title: string;
  source: "eurlex" | "curia" | "openjur";
  docType: string;        // "Opinion AG", "Arrêt lié", "Commentaire", "Note de doctrine"
  date?: string;
  url: string;
  excerpt?: string;
  celex?: string;
}

// ─── EUR-Lex SPARQL / search endpoint ────────────────────────────────────────
const EURLEX_SEARCH = "https://eur-lex.europa.eu/search.html";
const EURLEX_API = "https://eur-lex.europa.eu/eurlex-ws?wsdl";

// On utilise l'API REST informelle d'EUR-Lex (celle utilisée par leur interface web)
async function searchEurLexByRef(ref: string, limit = 5): Promise<DoctrineResult[]> {
  const params = new URLSearchParams({
    scope: "EURLEX",
    text: `"${ref}"`,
    lang: "fr",
    type: "quick",
    qid: Date.now().toString(),
  });

  try {
    const url = `${EURLEX_SEARCH}?${params}`;
    const res = await fetch(url, {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "CompliAI/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const html = await res.text();

    // Extrait les résultats depuis le HTML EUR-Lex (scraping léger)
    const results: DoctrineResult[] = [];
    // Extrait les liens titres avec une regex simple (sans flag /s)
    const anchorRe = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let m: RegExpExecArray | null;
    while ((m = anchorRe.exec(html)) !== null) {
      if (results.length >= limit) break;
      const href = m[1]?.trim();
      const title = m[2]?.trim();
      // Filtre : ne garde que les liens vers des documents légaux EUR-Lex
      if (!href || !title || !href.includes("legal-content")) continue;

      const fullUrl = href.startsWith("http") ? href : `https://eur-lex.europa.eu${href}`;
      results.push({
        title,
        source: "eurlex",
        docType: inferDocType(title, href),
        url: fullUrl,
      });
    }

    return results;
  } catch {
    return [];
  }
}

// ─── CURIA — Opinion de l'Avocat Général + résumé ────────────────────────────
async function fetchCuriaInfo(caseRef: string): Promise<DoctrineResult[]> {
  // CURIA n'a pas d'API JSON publique, mais on peut construire des URLs directes
  const results: DoctrineResult[] = [];

  // URL de recherche CURIA par référence
  const searchUrl = `https://curia.europa.eu/juris/liste.jsf?language=fr&jur=C,T,F&num=${encodeURIComponent(caseRef)}&parties=&dates=&pcs=Oor&nat=or&cit=none&procedureType=&oqp=&for=&from=&to=&filter=&avg=&mat=or&etat=clot&jge=&td=%3BALL&lg=&pro=&nd=&dates=&lg=&pro=&nd=`;

  results.push({
    title: `Affaire ${caseRef} — Fiche CURIA (jugements, ordonnances, conclusions)`,
    source: "curia",
    docType: "Dossier CURIA",
    url: searchUrl,
    excerpt: `Accès direct au dossier CURIA de l'affaire ${caseRef} : arrêt, conclusions de l'avocat général, ordonnances et documents de procédure.`,
  });

  // Opinion Avocat Général (URL standard CURIA)
  const agOpinionUrl = `https://curia.europa.eu/juris/liste.jsf?language=fr&num=${encodeURIComponent(caseRef)}&type=CC`;
  results.push({
    title: `Affaire ${caseRef} — Conclusions de l'Avocat Général`,
    source: "curia",
    docType: "Opinion AG",
    url: agOpinionUrl,
    excerpt: `Conclusions de l'Avocat Général dans l'affaire ${caseRef}. Les conclusions de l'AG analysent les questions de droit soulevées et proposent une solution à la Cour — elles constituent une source doctrinale majeure.`,
  });

  return results;
}

// ─── Recherche EUR-Lex par ECLI ───────────────────────────────────────────────
async function searchByEcli(ecli: string): Promise<DoctrineResult[]> {
  const url = `https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=${encodeURIComponent(ecli)}`;
  return [
    {
      title: `Texte intégral — ${ecli}`,
      source: "eurlex",
      docType: "Arrêt / Décision",
      url,
      excerpt: "Accès au texte intégral de la décision sur EUR-Lex via son identifiant ECLI.",
    },
  ];
}

// ─── Recherche EUR-Lex de doctrine (revues, commentaires indexés) ─────────────
async function searchEurLexDoctrine(query: string): Promise<DoctrineResult[]> {
  // EUR-Lex indexe quelques publications officielles (JO, COM, etc.)
  // On cible les "Actes non législatifs" qui incluent parfois des notes
  try {
    const params = new URLSearchParams({
      scope: "EURLEX",
      text: query,
      lang: "fr",
      type: "quick",
    });

    const url = `https://eur-lex.europa.eu/search.html?${params}&SUBDOM_INIT=EU_CASE_LAW&DTS_SUBDOM=EU_CASE_LAW`;

    return [
      {
        title: `Jurisprudence EUR-Lex — Recherche : "${query.slice(0, 60)}"`,
        source: "eurlex",
        docType: "Jurisprudence liée",
        url,
        excerpt: "Recherche dans la jurisprudence EUR-Lex pour trouver les décisions qui citent ou appliquent cette affaire.",
      },
    ];
  } catch {
    return [];
  }
}

// ─── Helper : inférer le type de document depuis titre/URL ──────────────────
function inferDocType(title: string, url: string): string {
  const t = title.toLowerCase();
  const u = url.toLowerCase();
  if (t.includes("avocat général") || t.includes("conclusions") || u.includes("cc")) return "Conclusions AG";
  if (t.includes("arrêt") || t.includes("judgment")) return "Arrêt";
  if (t.includes("ordonnance")) return "Ordonnance";
  if (t.includes("règlement")) return "Règlement";
  if (t.includes("directive")) return "Directive";
  if (t.includes("décision")) return "Décision";
  if (t.includes("communication")) return "Communication COM";
  if (t.includes("avis")) return "Avis";
  return "Document EUR-Lex";
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────
export async function searchDoctrineForDecision(
  decision: CalendarDecision,
  query: string
): Promise<DoctrineResult[]> {
  const results: DoctrineResult[] = [];

  // 1. Si référence CJUE connue → dossier CURIA + opinions AG
  if (decision.cjueRef) {
    const curiaResults = await fetchCuriaInfo(decision.cjueRef);
    results.push(...curiaResults);
  }

  // 2. Si ECLI connu → texte intégral sur EUR-Lex
  if (decision.ecli) {
    const ecliResults = await searchByEcli(decision.ecli);
    results.push(...ecliResults);
  }

  // 3. Recherche EUR-Lex par référence (textes qui la citent)
  const searchQuery = decision.cjueRef ?? decision.title.slice(0, 60);
  const eurLexResults = await searchEurLexByRef(searchQuery, 4);
  results.push(...eurLexResults);

  // 4. Lien jurisprudence liée sur EUR-Lex
  const relatedJurisprudence = await searchEurLexDoctrine(
    `${decision.cjueRef ?? ""} ${decision.regulation} ${query}`.trim()
  );
  results.push(...relatedJurisprudence);

  // Déduplique par URL
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

/**
 * Formate les résultats doctrine en bloc de contexte pour Claude.
 */
export function buildDoctrineContext(
  decision: CalendarDecision,
  doctrineResults: DoctrineResult[]
): string {
  if (doctrineResults.length === 0) return "";

  const lines = doctrineResults.map((d) => {
    const date = d.date ? ` (${d.date})` : "";
    const excerpt = d.excerpt ? `\n    → ${d.excerpt.slice(0, 200)}` : "";
    return `• [${d.docType}] ${d.title}${date}\n    Lien : ${d.url}${excerpt}`;
  });

  return [
    `Commentaires de doctrine et sources liées pour "${decision.title}" :`,
    ...lines,
  ].join("\n\n");
}
