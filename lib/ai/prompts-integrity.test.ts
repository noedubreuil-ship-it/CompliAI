import { describe, expect, it, beforeEach } from "vitest";
import {
  PROMPT_INTEGRITY,
  assertPromptIntegrity,
  clearPromptMarkdownCache,
  loadPromptMarkdown,
} from "./prompts/load-prompt-markdown";
import { getResumeArretsEtudiantsMarkdown } from "./prompts/arrets-guide";
import { getQuizEuEtudiantsMarkdown } from "./prompts/quiz-eu-etudiants";
import { getRechercheJurisprudentielleMarkdown } from "./prompts/recherche-jurisprudentielle";
import { getScannerWebMarkdown } from "./prompts/scanner-web";
import { getRopaMarkdown } from "./prompts/ropa-art30";
import { getJurisprudenceEuCommentaireMarkdown } from "./prompts/jurisprudence-eu-analyzer";
import { getAiActClassifierMarkdown } from "./prompts/ai-act-classifier";
import { getSimulateurCasPratiqueMarkdown } from "./prompts/simulateur-cas-pratique";
import { getComparateurLegislationsMarkdown } from "./prompts/comparateur-legislations";
import { getGenerateurClausesIaMarkdown } from "./prompts/generateur-clauses-ia";
import { getAnalyseurDecisionsAutoritesMarkdown } from "./prompts/analyseur-decisions-autorites";
import {
  getMemoireConformiteUserMarkdown,
  getAuditQrUserMarkdown,
  getPlanMemoireUserMarkdown,
  getExplicationArticleUserMarkdown,
  getInvestorReportUserMarkdown,
} from "./prompts/tool-user-prompts";

describe("prompts métier — intégrité cahier utilisateur", () => {
  beforeEach(() => {
    clearPromptMarkdownCache();
  });

  it("tous les fichiers référencés dans PROMPT_INTEGRITY passent les contrôles", () => {
    for (const filename of Object.keys(PROMPT_INTEGRITY)) {
      expect(() => loadPromptMarkdown(filename)).not.toThrow();
    }
  });

  it("résumé d'arrêts — prompt complet v2", () => {
    const md = getResumeArretsEtudiantsMarkdown();
    expect(md.length).toBeGreaterThan(20_000);
    expect(md).toMatch(/sens · valeur · portée/i);
    expect(md).toMatch(/MODE F/i);
    expect(md).toMatch(/RÈGLE N1/i);
  });

  it("quiz étudiants — banque et règles de génération", () => {
    const md = getQuizEuEtudiantsMarkdown();
    expect(md.length).toBeGreaterThan(15_000);
    expect(md).toMatch(/examinateur pédagogique/i);
    expect(md).toMatch(/RÈGLE G1/i);
    expect(md).toMatch(/PARTIE 4/i);
  });

  it("recherche jurisprudentielle — panorama complet", () => {
    const md = getRechercheJurisprudentielleMarkdown();
    expect(md.length).toBeGreaterThan(10_000);
    expect(md).toMatch(/CJUE/i);
  });

  it("scanner — limites et grille", () => {
    const md = getScannerWebMarkdown();
    expect(md.length).toBeGreaterThan(10_000);
    expect(md).toMatch(/LIMITES ABSOLUES/i);
  });

  it("RoPA — article 30", () => {
    const md = getRopaMarkdown();
    expect(md.length).toBeGreaterThan(10_000);
    expect(md).toMatch(/article 30|Art\. 30/i);
  });

  it("jurisprudence addendum — sens valeur portée", () => {
    const md = getJurisprudenceEuCommentaireMarkdown();
    expect(md.length).toBeGreaterThan(10_000);
    expect(md).toMatch(/VALEUR/i);
    expect(md).toMatch(/PORTÉE/i);
  });

  it("classifieur AI Act — arbre de décision", () => {
    const md = getAiActClassifierMarkdown();
    expect(md.length).toBeGreaterThan(20_000);
    expect(md).toMatch(/CLASSIFIEUR AI ACT/i);
  });

  it("simulateur cas pratique — méthode et barème", () => {
    const md = getSimulateurCasPratiqueMarkdown();
    expect(md.length).toBeGreaterThan(20_000);
    expect(md).toMatch(/RÈGLE E1/i);
    expect(md).toMatch(/SCORE TOTAL/i);
    expect(md).toMatch(/SCÉNARIO R-01/i);
  });

  it("comparateur législations — registre UE-27", () => {
    const md = getComparateurLegislationsMarkdown();
    expect(md.length).toBeGreaterThan(8_000);
    expect(md).toMatch(/RÈGLE N1/i);
    expect(md).toMatch(/TABLEAU DES 27 DPA/i);
  });

  it("générateur clauses IA — catalogue et checklist", () => {
    const md = getGenerateurClausesIaMarkdown();
    expect(md.length).toBeGreaterThan(15_000);
    expect(md).toMatch(/Art\. 28 RGPD/i);
    expect(md).toMatch(/CHECKLIST/i);
  });

  it("analyseur décisions autorités — sanctions et profils", () => {
    const md = getAnalyseurDecisionsAutoritesMarkdown();
    expect(md.length).toBeGreaterThan(12_000);
    expect(md).toMatch(/RÈGLE D1/i);
    expect(md).toMatch(/Art\. 83\(2\)/i);
    expect(md).toMatch(/PROFIL PROFESSIONNEL/i);
  });

  it("mémoire conformité — schéma JSON utilisateur", () => {
    const md = getMemoireConformiteUserMarkdown();
    expect(md).toMatch(/synthese_executive/i);
    expect(md).toMatch(/tableau_risques/i);
  });

  it("audit QR — questions auditeur", () => {
    const md = getAuditQrUserMarkdown();
    expect(md).toMatch(/auditeur réglementaire/i);
    expect(md).toMatch(/preparation_conseils/i);
  });

  it("plan mémoire — structure académique", () => {
    const md = getPlanMemoireUserMarkdown();
    expect(md).toMatch(/bibliographie/i);
    expect(md).toMatch(/conseils_directeur/i);
  });

  it("explication article — trois niveaux", () => {
    const md = getExplicationArticleUserMarkdown();
    expect(md).toMatch(/niveau_3/i);
    expect(md).toMatch(/jurisprudence_cle/i);
  });

  it("rapport investisseurs — due diligence", () => {
    const md = getInvestorReportUserMarkdown();
    expect(md).toMatch(/due diligence/i);
    expect(md).toMatch(/key_risks/i);
  });

  it("rejette un prompt tronqué", () => {
    expect(() =>
      assertPromptIntegrity("quiz-eu-etudiants-v1.md", "court texte sans examinateur")
    ).toThrow(/trop court|incomplet/i);
  });
});
