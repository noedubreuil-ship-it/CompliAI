/** Graine de synthèse DPA / tribunaux nationaux (`national_case_law`). */

export interface NationalCaseLawSeed {
  country_code: string;
  country_name: string;
  title: string;
  reference_line: string;
  source_url: string;
  language: string;
  body: string;
  ecli?: string | null;
  court?: string | null;
  judgment_date?: string | null;
}
