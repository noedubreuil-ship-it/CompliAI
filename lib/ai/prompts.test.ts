import { describe, expect, it } from "vitest";
import {
  MASTER_SYSTEM_PROMPT,
  UNIVERSAL_CONSULTANT_PROTOCOL,
  JURISPRUDENCE_VERIFICATION_PROTOCOL,
  TOOL_PROMPTS,
  buildSystemPrompt,
  type ToolName,
} from "./prompts/index";

describe("MASTER_SYSTEM_PROMPT", () => {
  it("définit l'identité juriste senior parisien", () => {
    expect(MASTER_SYSTEM_PROMPT).toMatch(/juriste senior parisien/);
    expect(MASTER_SYSTEM_PROMPT).toMatch(/Règlement \(UE\) 2024\/1689/);
  });

  it("contient la pyramide inversée", () => {
    expect(MASTER_SYSTEM_PROMPT).toMatch(/Qualification juridique/);
    expect(MASTER_SYSTEM_PROMPT).toMatch(/Fondement textuel/);
    expect(MASTER_SYSTEM_PROMPT).toMatch(/Recommandation/);
  });

  it("contient la clôture obligatoire", () => {
    expect(MASTER_SYSTEM_PROMPT).toMatch(/CLÔTURE OBLIGATOIRE/);
    expect(MASTER_SYSTEM_PROMPT).toMatch(/avocat spécialisé en droit européen du numérique/);
  });

  it("contient le protocole anti-hallucination", () => {
    expect(MASTER_SYSTEM_PROMPT).toMatch(/PROTOCOLE ANTI-HALLUCINATION/);
  });

  it("impose une jurisprudence sous chaque article cité", () => {
    expect(MASTER_SYSTEM_PROMPT).toMatch(/JURISPRUDENCE OBLIGATOIRE SOUS CHAQUE ARTICLE/);
    expect(MASTER_SYSTEM_PROMPT).toMatch(/Jurisprudence applicable :/);
    expect(MASTER_SYSTEM_PROMPT).toMatch(/§ 4 bis/);
  });

  it("exception article 35 AIPD : pas Schrems I\/II ; WP248 ou repli", () => {
    expect(MASTER_SYSTEM_PROMPT).toMatch(/Exception — article 35 du RGPD \(AIPD\)/);
    expect(MASTER_SYSTEM_PROMPT).toMatch(/WP248 rev\.01/);
  });
});

describe("TOOL_PROMPTS", () => {
  it("expose exactement 8 outils", () => {
    const keys = Object.keys(TOOL_PROMPTS).sort();
    expect(keys).toEqual(
      [
        "arrets_guide",
        "cerveau",
        "consultant",
        "doc_art11",
        "doc_fria",
        "doc_memoire",
        "quiz",
        "scanner",
      ].sort()
    );
  });

  it("chaque prompt outil est non vide (sauf aucun hors liste)", () => {
    for (const k of Object.keys(TOOL_PROMPTS) as ToolName[]) {
      expect(TOOL_PROMPTS[k].length).toBeGreaterThan(200);
    }
  });
});

describe("UNIVERSAL_CONSULTANT_PROTOCOL", () => {
  it("contient le protocole de qualification universel", () => {
    expect(UNIVERSAL_CONSULTANT_PROTOCOL).toMatch(/PROTOCOLE UNIVERSEL/);
    expect(UNIVERSAL_CONSULTANT_PROTOCOL).toMatch(/ratione materiae/);
    expect(UNIVERSAL_CONSULTANT_PROTOCOL).toMatch(/ratione personae/);
    expect(UNIVERSAL_CONSULTANT_PROTOCOL).toMatch(/ratione temporis/);
  });

  it("liste les plafonds de sanction des principaux textes", () => {
    expect(UNIVERSAL_CONSULTANT_PROTOCOL).toMatch(/35 M€ ou 7 %/);
    expect(UNIVERSAL_CONSULTANT_PROTOCOL).toMatch(/20 M€ ou 4 %/);
  });

  it("contient la checklist finale et la règle de jurisprudence", () => {
    expect(UNIVERSAL_CONSULTANT_PROTOCOL).toMatch(/CHECKLIST FINALE AVANT ENVOI/);
    expect(UNIVERSAL_CONSULTANT_PROTOCOL).toMatch(/§ 4 bis/);
  });
});

describe("JURISPRUDENCE_VERIFICATION_PROTOCOL", () => {
  it("définit les quatre contrôles J1 à J4", () => {
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/Contrôle J1 — Objet de la décision/);
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/Contrôle J2 — Concordance date \/ ECLI/);
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/Contrôle J3 — Cohérence nom \/ affaire/);
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/Contrôle J4 — Pertinence du raisonnement/);
  });

  it("encadre l'article 35 RGPD (AIPD) — EDPB WP248, pas Schrems sous l'art. 35", () => {
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/WP248 rev\.01/);
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/ARTICLE 35 DU RGPD/);
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/Schrems II/);
  });

  it("liste les affaires fréquemment mal utilisées", () => {
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/C-434\/15.*Elite Taxi/s);
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/C-131\/12.*Google Spain/s);
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/Schrems II/);
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/Glukhin c\. Russie/);
  });

  it("distingue les séries SAN et délibérations CNIL", () => {
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/SAN-AAAA-NNN/);
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/n° AAAA-NNN/);
  });

  it("contient la formule de repli en cas d'incertitude", () => {
    expect(JURISPRUDENCE_VERIFICATION_PROTOCOL).toMatch(/À notre connaissance/);
  });
});

describe("buildSystemPrompt", () => {
  it("concatène master + universel + jurisprudence + outil dans l'ordre", () => {
    const sys = buildSystemPrompt("consultant");
    const idxMaster = sys.indexOf(MASTER_SYSTEM_PROMPT);
    const idxUniversal = sys.indexOf(UNIVERSAL_CONSULTANT_PROTOCOL);
    const idxJurisprudence = sys.indexOf(JURISPRUDENCE_VERIFICATION_PROTOCOL);
    const idxConsultant = sys.indexOf("CONSULTANT EN CONFORMITÉ EUROPÉENNE");
    expect(idxMaster).toBe(0);
    expect(idxUniversal).toBeGreaterThan(idxMaster);
    expect(idxJurisprudence).toBeGreaterThan(idxUniversal);
    expect(idxConsultant).toBeGreaterThan(idxJurisprudence);
  });

  it("injecte les trois protocoles transverses pour les outils consultant / docs / scanner / cerveau", () => {
    const withConsultantProtocols: ToolName[] = [
      "consultant",
      "scanner",
      "doc_art11",
      "doc_fria",
      "doc_memoire",
      "cerveau",
    ];
    for (const tool of withConsultantProtocols) {
      const sys = buildSystemPrompt(tool);
      expect(sys).toMatch(/PROTOCOLE UNIVERSEL/);
      expect(sys).toMatch(/JURISPRUDENCE OBLIGATOIRE SOUS CHAQUE ARTICLE/);
      expect(sys).toMatch(/PROTOCOLE DE VÉRIFICATION DES CITATIONS JURISPRUDENTIELLES/);
    }
  });

  it("arrets_guide : prompt pédagogique autonome sans empiler le master consultant", () => {
    const sys = buildSystemPrompt("arrets_guide");
    expect(sys).toMatch(/professeur de droit européen/i);
    expect(sys).toMatch(/sens · valeur · portée/i);
    expect(sys).not.toMatch(/PROTOCOLE UNIVERSEL/);
    expect(sys).not.toMatch(/JURISPRUDENCE OBLIGATOIRE SOUS CHAQUE ARTICLE/);
  });

  it("quiz : prompt examinateur sans empiler le master consultant", () => {
    const sys = buildSystemPrompt("quiz");
    expect(sys).toMatch(/examinateur pédagogique/i);
    expect(sys).toMatch(/sens · valeur · portée/i);
    expect(sys).not.toMatch(/PROTOCOLE UNIVERSEL/);
    expect(sys).not.toMatch(/JURISPRUDENCE OBLIGATOIRE SOUS CHAQUE ARTICLE/);
  });
});
