/**
 * Validation post-génération des citations jurisprudentielles (consultant chat).
 * Détecte en-têtes interdits, ECLI absents du contexte RAG et incohérences date/ECLI.
 */

const ECLI_RE = /ECLI:EU:[CFT]:\d{4}:\d+/gi;
const CASE_NUM_RE = /\bC-\d{1,4}\/\d{1,2}\b/gi;
const FRENCH_DATE_RE =
  /\b(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})\b/gi;

export interface ConsultantCitationValidation {
  ok: boolean;
  issues: string[];
  /** Déclenche une réécriture automatique */
  needsRewrite: boolean;
}

function extractEclis(text: string): Set<string> {
  return new Set((text.match(ECLI_RE) ?? []).map((e) => e.toUpperCase()));
}

function ecliYear(ecli: string): number | null {
  const m = ecli.match(/ECLI:EU:[CFT]:(\d{4}):/i);
  return m ? Number(m[1]) : null;
}

/** Repère une date française dans ±400 caractères d'un ECLI. */
function findEcliDateMismatches(text: string): string[] {
  const issues: string[] = [];
  const upper = text.toUpperCase();
  let m: RegExpExecArray | null;
  const re = new RegExp(ECLI_RE.source, "gi");
  while ((m = re.exec(text)) !== null) {
    const ecli = m[0].toUpperCase();
    const year = ecliYear(ecli);
    if (!year) continue;
    const windowStart = Math.max(0, m.index - 400);
    const windowEnd = Math.min(text.length, m.index + ecli.length + 400);
    const slice = text.slice(windowStart, windowEnd);
    let dm: RegExpExecArray | null;
    const dateRe = new RegExp(FRENCH_DATE_RE.source, "gi");
    while ((dm = dateRe.exec(slice)) !== null) {
      const statedYear = Number(dm[3]);
      if (Math.abs(statedYear - year) >= 1) {
        issues.push(`ecli_date_mismatch:${ecli}_stated_${statedYear}_ecli_${year}`);
      }
    }
  }
  if (issues.length === 0 && upper.includes("ECLI:EU:C:2017:981") && /\b2019\b/.test(text)) {
    issues.push("ecli_date_mismatch:elite_taxi_2019_vs_ecli_2017");
  }
  return [...new Set(issues)];
}

/** Arrêt cité (numéro d'affaire ou nom connu) sans ECLI présent dans le contexte RAG. */
function findUncitedCaseReferences(answer: string, contextEclis: Set<string>): string[] {
  const issues: string[] = [];
  const answerEclis = extractEclis(answer);
  const contextHasAnyEcli = contextEclis.size > 0;

  for (const ecli of answerEclis) {
    if (!contextEclis.has(ecli)) {
      issues.push(`ecli_not_in_rag:${ecli}`);
    }
  }

  const caseNums = [...new Set(answer.match(CASE_NUM_RE) ?? [])];
  for (const cn of caseNums) {
    if (answerEclis.size === 0 && contextHasAnyEcli) {
      issues.push(`case_number_without_ecli:${cn}`);
    }
  }

  const memoryOnlyPatterns: ReadonlyArray<{ id: string; re: RegExp }> = [
    { id: "schecke", re: /schecke|c-92\/09|c-93\/09/i },
    { id: "elite_taxi", re: /elite taxi|c-434\/15/i },
    { id: "orange_romania", re: /orange rom[aâ]nia/i },
    { id: "kommission_allemagne", re: /kommission.*allemagne|c-100\/13/i },
  ];

  for (const { id, re } of memoryOnlyPatterns) {
    if (!re.test(answer)) continue;
    const citesFromRag = [...answerEclis].some((e) => contextEclis.has(e));
    if (!citesFromRag && contextEclis.size === 0) {
      issues.push(`memory_case_no_rag_corpus:${id}`);
    } else if (!citesFromRag) {
      issues.push(`memory_case_without_rag_ecli:${id}`);
    }
  }

  return [...new Set(issues)];
}

export function validateConsultantCitations(
  answer: string,
  ragContext: string
): ConsultantCitationValidation {
  const issues: string[] = [];
  const contextEclis = extractEclis(ragContext);

  if (/jurisprudence applicable/i.test(answer)) {
    issues.push("forbidden_header_jurisprudence_applicable");
  }

  issues.push(...findEcliDateMismatches(answer));
  issues.push(...findUncitedCaseReferences(answer, contextEclis));

  const headerHits = (answer.match(/jurisprudence applicable/gi) ?? []).length;
  if (headerHits >= 2) {
    issues.push(`repeated_jurisprudence_header:${headerHits}`);
  }

  const needsRewrite =
    issues.some((i) =>
      i.startsWith("forbidden_header") ||
      i.startsWith("ecli_date_mismatch") ||
      i.startsWith("ecli_not_in_rag") ||
      i.startsWith("memory_case") ||
      i.startsWith("repeated_jurisprudence")
    );

  return { ok: issues.length === 0, issues, needsRewrite };
}

export function buildConsultantRewritePrompt(
  originalAnswer: string,
  issues: string[]
): string {
  return [
    "La réponse ci-dessous viole les règles de production. Réécris-la **intégralement** en français juridique.",
    "",
    "Corrections obligatoires :",
    "- **Jamais** le libellé « Jurisprudence applicable » (ni variante) comme en-tête ou intertitre.",
    "- **Aucun arrêt** dont l'ECLI n'apparaît pas textuellement dans les blocs === SOURCE === fournis au message utilisateur.",
    "- Si tu ne peux pas citer depuis les sources : « à vérifier sur EUR-Lex » — pas de nom d'arrêt inventé.",
    "- **Aucune** signature de marque (pas de « élaborée par CompliAI » ou équivalent).",
    "- Prose continue (pas de I/II/III, pas de liste 1–7 sous chaque article AI Act).",
    "- Conserve qualification, échéances (art. 113) et clôture légale.",
    "",
    `Problèmes détectés : ${issues.join(", ")}`,
    "",
    "--- RÉPONSE À CORRIGER ---",
    originalAnswer,
  ].join("\n");
}
