/**
 * Manifeste P1 — textes manquants prioritaires (branche 3).
 * Aucune exécution sans feu vert explicite.
 *
 * Ordre de préparation validé le 2026-07-01.
 */

export type P1DocumentKind =
  | "edpb_guideline"
  | "edpb_opinion"
  | "cjeu_judgment"
  | "ai_office_guidance"
  | "eu_regulation";

export interface P1CorpusDocument {
  id: string;
  title: string;
  kind: P1DocumentKind;
  language: "fr" | "en";
  celex?: string;
  ecli?: string;
  officialUrl: string;
  /** URL directe vers le texte brut (HTML EUR-Lex, PDF direct, etc.) pour le pipeline. */
  rawContentUrl?: string;
  localTxtPath?: string;
  estimatedChunks: [number, number];
  priority: "P1";
}

export const P1_CORPUS_MANIFEST: P1CorpusDocument[] = [
  {
    id: "edpb-03-2023-art15",
    title: "EDPB Guidelines 03/2023 — Droit d'accès (Art. 15 RGPD)",
    kind: "edpb_guideline",
    language: "en",
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032023-right-access_en",
    estimatedChunks: [60, 100],
    priority: "P1",
  },
  {
    id: "edpb-02-2023-eprivacy-5-3",
    title: "EDPB Guidelines 02/2023 — Portée technique Art. 5(3) ePrivacy",
    kind: "edpb_guideline",
    language: "en",
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-022023-technical-scope-art-53-eprivacy_en",
    estimatedChunks: [60, 100],
    priority: "P1",
  },
  {
    id: "edpb-opinion-28-2024-ai",
    title: "EDPB Opinion 28/2024 — IA génératives et modèles de fondation",
    kind: "edpb_opinion",
    language: "en",
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-282024-certain-data-protection-aspects_en",
    estimatedChunks: [80, 130],
    priority: "P1",
  },
  {
    id: "edpb-01-2024-legitimate-interest",
    title: "EDPB Guidelines 01/2024 — Intérêt légitime (Art. 6(1)(f) RGPD)",
    kind: "edpb_guideline",
    language: "en",
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-012024-legitimate-interest_en",
    estimatedChunks: [80, 130],
    priority: "P1",
  },
  {
    id: "edpb-01-2025-pseudonymisation",
    title: "EDPB Guidelines 01/2025 — Pseudonymisation",
    kind: "edpb_guideline",
    language: "en",
    officialUrl:
      "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-012025-pseudonymisation_en",
    estimatedChunks: [70, 110],
    priority: "P1",
  },
  {
    id: "cjeu-c-311-18-schrems-ii",
    title: "CJUE Schrems II (C-311/18)",
    kind: "cjeu_judgment",
    language: "fr",
    ecli: "ECLI:EU:C:2020:559",
    celex: "62018CJ0311",
    officialUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-311/18",
    rawContentUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62018CJ0311",
    estimatedChunks: [180, 280],
    priority: "P1",
  },
  {
    id: "cjeu-c-131-12-costeja",
    title: "CJUE Costeja González / Google Spain (C-131/12)",
    kind: "cjeu_judgment",
    language: "fr",
    ecli: "ECLI:EU:C:2014:317",
    celex: "62012CJ0131",
    officialUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-131/12",
    rawContentUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62012CJ0131",
    estimatedChunks: [100, 180],
    priority: "P1",
  },
  {
    id: "cjeu-c-582-14-breyer",
    title: "CJUE Breyer (C-582/14) — adresses IP dynamiques",
    kind: "cjeu_judgment",
    language: "fr",
    ecli: "ECLI:EU:C:2016:779",
    celex: "62014CJ0582",
    officialUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-582/14",
    rawContentUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62014CJ0582",
    estimatedChunks: [60, 100],
    priority: "P1",
  },
  {
    id: "commission-ai-act-art5-guidelines",
    title: "Commission — Guidelines on prohibited AI practices (Art. 5 AI Act)",
    kind: "ai_office_guidance",
    language: "en",
    officialUrl:
      "https://digital-strategy.ec.europa.eu/en/library/guidelines-prohibitions-artificial-intelligence-practices",
    estimatedChunks: [80, 140],
    priority: "P1",
  },
  {
    id: "commission-ai-act-annex-iii-guidelines",
    title: "Commission — Guidelines on high-risk AI systems (Annexe III AI Act)",
    kind: "ai_office_guidance",
    language: "en",
    officialUrl:
      "https://digital-strategy.ec.europa.eu/en/library/guidelines-classification-high-risk-ai-systems-under-eu-ai-act",
    estimatedChunks: [60, 100],
    priority: "P1",
  },
  {
    id: "dora-2022-2554",
    title: "DORA — Règlement (UE) 2022/2554",
    kind: "eu_regulation",
    language: "fr",
    celex: "32022R2554",
    officialUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022R2554",
    rawContentUrl: "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32022R2554",
    estimatedChunks: [120, 200],
    priority: "P1",
  },
];

export function getP1Document(id: string): P1CorpusDocument | undefined {
  return P1_CORPUS_MANIFEST.find((d) => d.id === id);
}
