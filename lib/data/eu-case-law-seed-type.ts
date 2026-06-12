/** Graine d’entrée CJUE/EUTJ indexée sous `national_legal_texts` (country EU, domain `eu_case_law`). */

export interface EuCaseLawSeed {
  celex: string;
  title: string;
  reference_line: string;
  source_url: string;
  language: string;
  body: string;
  ecli?: string;
  court?: string;
  /** ISO YYYY-MM-DD si connu */
  judgment_date?: string | null;
}
