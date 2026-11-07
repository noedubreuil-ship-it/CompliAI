/**
 * Provenance et auditabilité des documents générés (Axe 2).
 *
 * Un document de conformité (DPIA, FRIA, mémoire…) doit être OPPOSABLE : daté,
 * rattaché à l'état du droit à une date précise, et accompagné des sources sur
 * lesquelles il s'appuie. Ce module produit cette annexe de provenance, sans
 * toucher au corps du document.
 *
 * Pur (aucun import serveur) : utilisable en route API comme en test.
 */

const ECLI_RE = /ECLI:EU:[CFT]:\d{4}:\d+/gi;
const CELEX_RE = /\b[0-9][0-9]{4}[A-Z]{1,2}[0-9]{4}\b/g;
const REGULATION_RE =
  /(Règlement|Directive)\s+\(UE\)\s+\d{4}\/\d+/gi;

export interface GroundedSources {
  regulations: string[];
  eclis: string[];
  celex: string[];
}

/** Extrait les sources juridiques réellement présentes dans le contexte fourni au modèle. */
export function extractGroundedSources(sourceContext: string): GroundedSources {
  const regulations = [...new Set((sourceContext.match(REGULATION_RE) ?? []).map((s) => s.replace(/\s+/g, " ").trim()))];
  const eclis = [...new Set((sourceContext.match(ECLI_RE) ?? []).map((s) => s.toUpperCase()))];
  const celex = [...new Set(sourceContext.match(CELEX_RE) ?? [])];
  return { regulations, eclis, celex };
}

function formatFrenchDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export interface ProvenanceOptions {
  generatedAt?: Date;
  /** Contexte (prompt + RAG) ayant servi à la génération, pour lister les sources. */
  sourceContext?: string;
  /** Outil à l'origine du document (ex. "DPIA Art. 35"). */
  toolLabel?: string;
}

/**
 * Construit le corps texte de l'annexe de provenance.
 * Toujours : date de génération + droit arrêté à cette date + réserve.
 * Si des sources sont détectées dans le contexte, elles sont listées.
 */
export function buildProvenanceBody(opts: ProvenanceOptions = {}): string {
  const when = opts.generatedAt ?? new Date();
  const dateStr = formatFrenchDate(when);
  const lines: string[] = [];

  if (opts.toolLabel) lines.push(`Outil : ${opts.toolLabel}.`);
  lines.push(`Document généré le ${dateStr}.`);
  lines.push(
    `Droit applicable arrêté à cette date. Les textes européens et nationaux évoluant, ` +
      `il convient de vérifier les éventuelles modifications postérieures sur EUR-Lex et auprès des autorités compétentes.`
  );

  if (opts.sourceContext && opts.sourceContext.trim().length > 0) {
    const { regulations, eclis } = extractGroundedSources(opts.sourceContext);
    if (regulations.length > 0) {
      lines.push("");
      lines.push("Textes mobilisés :");
      for (const r of regulations) lines.push(`— ${r}`);
    }
    if (eclis.length > 0) {
      lines.push("");
      lines.push("Jurisprudence citée (ECLI) :");
      for (const e of eclis) lines.push(`— ${e}`);
    }
  }

  lines.push("");
  lines.push(
    `Cette analyse est établie à titre informatif et ne se substitue pas à une consultation juridique personnalisée.`
  );

  return lines.join("\n");
}

/** Section prête à être annexée à un export PDF (structure { heading, body }). */
export function buildProvenanceSection(opts: ProvenanceOptions = {}): { heading: string; body: string } {
  return { heading: "Provenance et références", body: buildProvenanceBody(opts) };
}
