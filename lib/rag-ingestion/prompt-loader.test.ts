/**
 * Tests du chargeur de prompts versionnés.
 *
 * Couvre :
 * - Chargement de chaque prompt pour les 6 types de document
 * - Présence du placeholder {{DOCUMENT_TEXT}} remplacé
 * - Hash SHA-256 stable (reproductible)
 * - Cache en mémoire (le même fichier chargé deux fois retourne le même hash)
 * - Erreur pour un type non supporté
 */

import { describe, expect, it, beforeEach } from "vitest";

import { clearPromptCache, getPromptHash, loadPromptForDocumentType } from "./prompt-loader";
import type { SupportedDocumentType } from "./parsers/types";

const ALL_SUPPORTED_TYPES: SupportedDocumentType[] = [
  "eu_regulation",
  "eu_directive",
  "cjeu_judgment",
  "cjeu_order",
  "edpb_guideline",
  "edpb_recommendation",
  "edpb_binding_decision",
  "ai_office_guidance",
  "national_decision",
  "national_guideline",
];

describe("loadPromptForDocumentType", () => {
  beforeEach(() => {
    clearPromptCache();
  });

  it("charge un prompt pour chaque type de document supporté", () => {
    for (const docType of ALL_SUPPORTED_TYPES) {
      const prompt = loadPromptForDocumentType(docType, "texte test");
      expect(prompt.content, `Prompt pour ${docType} devrait avoir du contenu`).toBeTruthy();
      expect(prompt.hash, `Prompt pour ${docType} devrait avoir un hash`).toBeTruthy();
      expect(prompt.filename, `Prompt pour ${docType} devrait avoir un nom de fichier`).toBeTruthy();
    }
  });

  it("substitue {{DOCUMENT_TEXT}} dans le prompt chargé", () => {
    const testText = "Article premier — Texte de test pour la substitution.";
    const prompt = loadPromptForDocumentType("eu_regulation", testText);
    expect(prompt.content).toContain(testText);
    expect(prompt.content).not.toContain("{{DOCUMENT_TEXT}}");
  });

  it("ne modifie pas le hash lors de la substitution", () => {
    const prompt1 = loadPromptForDocumentType("eu_regulation", "texte A");
    const prompt2 = loadPromptForDocumentType("eu_regulation", "texte B");
    // Le hash est calculé sur le fichier source, pas sur le contenu substitué
    expect(prompt1.hash).toBe(prompt2.hash);
  });

  it("retourne un hash SHA-256 stable (64 caractères hexadécimaux)", () => {
    const prompt = loadPromptForDocumentType("cjeu_judgment", "texte test");
    expect(prompt.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("retourne le même hash pour deux chargements du même type", () => {
    const hash1 = loadPromptForDocumentType("national_decision", "texte 1").hash;
    clearPromptCache();
    const hash2 = loadPromptForDocumentType("national_decision", "texte 2").hash;
    expect(hash1).toBe(hash2);
  });

  it("utilise le cache mémoire lors du second chargement", () => {
    // Premier chargement
    const prompt1 = loadPromptForDocumentType("edpb_guideline", "texte A");
    // Deuxième chargement sans vider le cache
    const prompt2 = loadPromptForDocumentType("edpb_guideline", "texte B");
    // Le hash doit être identique (même fichier)
    expect(prompt1.hash).toBe(prompt2.hash);
  });

  it("cjeu_order et cjeu_judgment utilisent le même fichier prompt", () => {
    const hashJudgment = loadPromptForDocumentType("cjeu_judgment", "texte").hash;
    clearPromptCache();
    const hashOrder = loadPromptForDocumentType("cjeu_order", "texte").hash;
    expect(hashJudgment).toBe(hashOrder);
  });

  it("edpb_recommendation et edpb_guideline utilisent le même fichier prompt", () => {
    const hashGuideline = loadPromptForDocumentType("edpb_guideline", "texte").hash;
    clearPromptCache();
    const hashRecommendation = loadPromptForDocumentType("edpb_recommendation", "texte").hash;
    expect(hashGuideline).toBe(hashRecommendation);
  });

  it("national_guideline et national_decision utilisent le même fichier prompt", () => {
    const hashDecision = loadPromptForDocumentType("national_decision", "texte").hash;
    clearPromptCache();
    const hashGuideline = loadPromptForDocumentType("national_guideline", "texte").hash;
    expect(hashDecision).toBe(hashGuideline);
  });
});

describe("getPromptHash", () => {
  beforeEach(() => {
    clearPromptCache();
  });

  it("retourne le même hash que loadPromptForDocumentType", () => {
    const hashFromLoad = loadPromptForDocumentType("ai_office_guidance", "texte").hash;
    clearPromptCache();
    const hashFromGet = getPromptHash("ai_office_guidance");
    expect(hashFromGet).toBe(hashFromLoad);
  });

  it("retourne un hash différent pour chaque fichier prompt distinct", () => {
    const hashes = new Set<string>();
    // Ces types utilisent des fichiers différents
    const distinctTypes: SupportedDocumentType[] = [
      "eu_regulation",
      "eu_directive",
      "cjeu_judgment",
      "edpb_guideline",
      "national_decision",
      "ai_office_guidance",
    ];
    for (const type of distinctTypes) {
      hashes.add(getPromptHash(type));
    }
    // 6 types → 6 fichiers distincts → 6 hashs distincts
    expect(hashes.size).toBe(6);
  });
});
