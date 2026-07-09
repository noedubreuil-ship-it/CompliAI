/**
 * Manifeste CJUE — vague corpus-mass-cjue
 *
 * Docs déjà en pending_documents (insérés lors de P1 le 2026-07-03) :
 *   - cjeu-c-311-18-schrems-ii   (Schrems II)
 *   - cjeu-c-131-12-costeja      (Costeja González / Google Spain)
 *   - cjeu-c-582-14-breyer       (Breyer — IP dynamiques)
 *
 * Ce manifeste contient UNIQUEMENT les nouveaux arrêts CJUE.
 * Tous les textes via EUR-Lex HTML (fiabilité maximale, CELEX confirmé).
 */

import type { MassDocument } from "./types";

export const CJUE_MASS_MANIFEST: MassDocument[] = [
  // ─── P2 ─────────────────────────────────────────────────────────────────────

  {
    id: "cjeu-c-362-14-schrems-i",
    title: "CJUE Schrems I (C-362/14) — Invalidation du Safe Harbor",
    kind: "cjeu_judgment",
    wave: "cjue",
    priority: "P2",
    language: "fr",
    ecli: "ECLI:EU:C:2015:650",
    celex: "62014CJ0362",
    officialUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-362/14",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62014CJ0362",
    estimatedChunks: [100, 160],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "cjeu-c-673-17-planet49",
    title: "CJUE Planet49 (C-673/17) — Consentement précoché et cookies",
    kind: "cjeu_judgment",
    wave: "cjue",
    priority: "P2",
    language: "fr",
    ecli: "ECLI:EU:C:2019:801",
    celex: "62017CJ0673",
    officialUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-673/17",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62017CJ0673",
    estimatedChunks: [60, 100],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "cjeu-c-40-17-fashion-id",
    title: "CJUE Fashion ID (C-40/17) — Co-responsabilité boutons Like / plugins sociaux",
    kind: "cjeu_judgment",
    wave: "cjue",
    priority: "P2",
    language: "fr",
    ecli: "ECLI:EU:C:2019:629",
    celex: "62017CJ0040",
    officialUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-40/17",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62017CJ0040",
    estimatedChunks: [60, 100],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "cjeu-c-210-16-wirtschaftsakademie",
    title: "CJUE Wirtschaftsakademie (C-210/16) — Co-responsabilité pages Facebook",
    kind: "cjeu_judgment",
    wave: "cjue",
    priority: "P2",
    language: "fr",
    ecli: "ECLI:EU:C:2018:388",
    celex: "62016CJ0210",
    officialUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-210/16",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62016CJ0210",
    estimatedChunks: [60, 100],
    sizeRisk: "low",
    urlConfidence: "high",
  },

  {
    id: "cjeu-c-293-12-digital-rights-ireland",
    title: "CJUE Digital Rights Ireland (C-293/12 + C-594/12) — Invalidation directive conservation données",
    kind: "cjeu_judgment",
    wave: "cjue",
    priority: "P2",
    language: "fr",
    ecli: "ECLI:EU:C:2014:238",
    celex: "62012CJ0293",
    officialUrl: "https://curia.europa.eu/juris/liste.jsf?num=C-293/12",
    rawContentUrl:
      "https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:62012CJ0293",
    estimatedChunks: [80, 140],
    sizeRisk: "low",
    urlConfidence: "high",
  },
];
