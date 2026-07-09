/**
 * Manifeste Règlements & Directives — vague corpus-mass-regulations
 *
 * Docs déjà en pending_documents (insérés lors de P1 le 2026-07-03) :
 *   - dora-2022-2554                     (DORA)
 *   - commission-ai-act-art5-guidelines  (Commission Guidelines Art. 5 AI Act)
 *   - commission-ai-act-annex-iii-guidelines (Commission Guidelines Annexe III)
 *
 * Ce manifeste contient UNIQUEMENT les nouveaux règlements et directives.
 *
 * AVERTISSEMENT sizeRisk :
 *   "high"   = > 200 pages → risque fort max_tokens=8192 bug → sera en erreur
 *              Fix requis dans lib/rag-ingestion/parsers/types.ts avant parsing
 *   "medium" = 50-200 pages → risque modéré selon le contenu
 *   "low"    = < 50 pages → risque faible
 *
 * Les docs "high" seront insérés en pending_documents mais resteront en erreur
 * jusqu'à l'application du fix max_tokens (chantier dédié).
 * Voir RAG_INGESTION_BATCH_EDPB_REPORT_2026-07-02.md pour le contexte.
 */

import type { MassDocument } from "./types";

export const REGULATIONS_MASS_MANIFEST: MassDocument[] = [
  // ─── P2 — Commission AI Office (soft law) ───────────────────────────────────

  {
    id: "commission-ai-act-gpai-guidelines",
    title: "Commission — Guidelines GPAI models (Art. 51-56 AI Act)",
    kind: "ai_office_guidance",
    wave: "regulations",
    priority: "P2",
    language: "fr",
    officialUrl:
      "https://digital-strategy.ec.europa.eu/fr/policies/gpai-models-guidelines",
    estimatedChunks: [50, 90],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  // ─── P2 — Directives et Règlements UE (EUR-Lex) ─────────────────────────────

  {
    id: "directive-led-2016-680",
    title: "Directive (UE) 2016/680 — Police et justice (LED)",
    kind: "eu_directive",
    wave: "regulations",
    priority: "P2",
    language: "fr",
    celex: "32016L0680",
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2016/680/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32016L0680",
    estimatedChunks: [70, 110],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "reg-2018-1725-eu-institutions",
    title: "Règlement (UE) 2018/1725 — Protection des données par les institutions UE",
    kind: "eu_regulation",
    wave: "regulations",
    priority: "P2",
    language: "fr",
    celex: "32018R1725",
    officialUrl: "https://eur-lex.europa.eu/eli/reg/2018/1725/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32018R1725",
    estimatedChunks: [80, 130],
    sizeRisk: "medium",
    urlConfidence: "high",
  },

  {
    id: "reg-p2b-2019-1150",
    title: "Règlement (UE) 2019/1150 — Platform-to-Business (P2B)",
    kind: "eu_regulation",
    wave: "regulations",
    priority: "P2",
    language: "fr",
    celex: "32019R1150",
    officialUrl: "https://eur-lex.europa.eu/eli/reg/2019/1150/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32019R1150",
    estimatedChunks: [50, 80],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "directive-product-liability-2024-2853",
    title: "Directive (UE) 2024/2853 — Responsabilité du fait des produits (nouvelle PLD)",
    kind: "eu_directive",
    wave: "regulations",
    priority: "P2",
    language: "fr",
    celex: "32024L2853",
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2024/2853/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024L2853",
    estimatedChunks: [50, 90],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "reg-cybersecurity-act-2019-881",
    title: "Règlement (UE) 2019/881 — Cybersecurity Act (ENISA et certification)",
    kind: "eu_regulation",
    wave: "regulations",
    priority: "P2",
    language: "fr",
    celex: "32019R0881",
    officialUrl: "https://eur-lex.europa.eu/eli/reg/2019/881/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32019R0881",
    estimatedChunks: [80, 130],
    sizeRisk: "medium",
    urlConfidence: "high",
  },

  {
    id: "directive-dcd-2019-770",
    title: "Directive (UE) 2019/770 — Contrats de fourniture de contenus et services numériques (DCD)",
    kind: "eu_directive",
    wave: "regulations",
    priority: "P2",
    language: "fr",
    celex: "32019L0770",
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2019/770/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32019L0770",
    estimatedChunks: [50, 80],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "reg-ehds-2025-327",
    title: "Règlement (UE) 2025/327 — Espace européen des données de santé (EHDS)",
    kind: "eu_regulation",
    wave: "regulations",
    priority: "P2",
    language: "fr",
    celex: "32025R0327",
    officialUrl: "https://eur-lex.europa.eu/eli/reg/2025/327/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32025R0327",
    estimatedChunks: [100, 180],
    sizeRisk: "high",
    urlConfidence: "high",
  },

  // ─── P3 — Règlements et Directives ──────────────────────────────────────────

  {
    id: "reg-gpsr-2023-988",
    title: "Règlement (UE) 2023/988 — Sécurité générale des produits (GPSR)",
    kind: "eu_regulation",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32023R0988",
    officialUrl: "https://eur-lex.europa.eu/eli/reg/2023/988/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32023R0988",
    estimatedChunks: [70, 120],
    sizeRisk: "medium",
    urlConfidence: "high",
  },

  {
    id: "directive-csddd-2024-1760",
    title: "Directive (UE) 2024/1760 — Devoir de vigilance des entreprises (CSDDD)",
    kind: "eu_directive",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32024L1760",
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2024/1760/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024L1760",
    estimatedChunks: [80, 130],
    sizeRisk: "medium",
    urlConfidence: "high",
  },

  {
    id: "reg-mica-2023-1114",
    title: "Règlement (UE) 2023/1114 — Marchés de crypto-actifs (MiCA)",
    kind: "eu_regulation",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32023R1114",
    officialUrl: "https://eur-lex.europa.eu/eli/reg/2023/1114/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32023R1114",
    estimatedChunks: [120, 220],
    sizeRisk: "high",
    urlConfidence: "high",
  },

  {
    id: "directive-csrd-2022-2464",
    title: "Directive (UE) 2022/2464 — Rapportage sur la durabilité des entreprises (CSRD)",
    kind: "eu_directive",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32022L2464",
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2022/2464/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32022L2464",
    estimatedChunks: [50, 90],
    sizeRisk: "medium",
    urlConfidence: "high",
  },

  {
    id: "directive-sale-goods-2019-771",
    title: "Directive (UE) 2019/771 — Vente de biens (SVG)",
    kind: "eu_directive",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32019L0771",
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2019/771/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32019L0771",
    estimatedChunks: [40, 70],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "reg-geoblocking-2018-302",
    title: "Règlement (UE) 2018/302 — Géoblocage injustifié",
    kind: "eu_regulation",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32018R0302",
    officialUrl: "https://eur-lex.europa.eu/eli/reg/2018/302/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32018R0302",
    estimatedChunks: [25, 40],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "reg-tco-2021-784",
    title: "Règlement (UE) 2021/784 — Contenus terroristes en ligne (TCO)",
    kind: "eu_regulation",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32021R0784",
    officialUrl: "https://eur-lex.europa.eu/eli/reg/2021/784/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32021R0784",
    estimatedChunks: [30, 50],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "directive-sma-2018-1808",
    title: "Directive (UE) 2018/1808 — Services de médias audiovisuels (SMA)",
    kind: "eu_directive",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32018L1808",
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2018/1808/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32018L1808",
    estimatedChunks: [50, 80],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "directive-accessibility-2019-882",
    title: "Directive (UE) 2019/882 — Accessibilité des produits et services",
    kind: "eu_directive",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32019L0882",
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2019/882/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32019L0882",
    estimatedChunks: [60, 100],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "directive-open-data-2019-1024",
    title: "Directive (UE) 2019/1024 — Données ouvertes et réutilisation informations secteur public",
    kind: "eu_directive",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32019L1024",
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2019/1024/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32019L1024",
    estimatedChunks: [50, 90],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "directive-platform-work-2024-2831",
    title: "Directive (UE) 2024/2831 — Travail via plateforme numérique (Platform Work)",
    kind: "eu_directive",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    celex: "32024L2831",
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2024/2831/oj",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024L2831",
    estimatedChunks: [50, 90],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "commission-ai-act-transparency-art50",
    title: "Commission — Guidelines transparence Art. 50 AI Act (chatbots et IA générative)",
    kind: "ai_office_guidance",
    wave: "regulations",
    priority: "P3",
    language: "fr",
    officialUrl:
      "https://digital-strategy.ec.europa.eu/fr/policies/ai-act-guidelines",
    estimatedChunks: [30, 50],
    sizeRisk: "low",
    urlConfidence: "medium",
  },
];
