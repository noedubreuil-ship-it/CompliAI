import { describe, expect, it } from "vitest";
import { buildDPIAPrompt } from "./generators";

const sampleIntake = {
  treatment_name: "Profiling clients IA — scoring churn",
  controller: "ACME SaaS SAS",
  purposes: "Prédiction de churn et segmentation marketing",
  data_types: "Identité, comportement produit, logs connexion",
  data_subjects: "Clients professionnels UE",
  retention: "24 mois",
  recipients: "Hébergeur EU, équipe CRM",
  automated_decisions: true,
  large_scale: true,
  sensitive_data: false,
  sector: "Tech / SaaS",
};

describe("buildDPIAPrompt (DPIA Art. 35 + WP248)", () => {
  it("mentionne cadre légal UE 2016/679 et EDPB WP248", () => {
    const prompt = buildDPIAPrompt(sampleIntake);
    expect(prompt).toMatch(/Article 35|\bRGPD\b|2016\/679/i);
    expect(prompt).toMatch(/WP248|EDPB/i);
    expect(prompt).toMatch(/Guidelines on Data Protection Impact Assessment|WP248 rev\.01/i);
  });

  it("rappelle de ne pas confondre Art. 35 avec transferts (Schrems)", () => {
    const prompt = buildDPIAPrompt(sampleIntake);
    expect(prompt).toMatch(/Schrems/i);
  });

  it("injecte tous les faits dossier sans altérer le schéma JSON attendu", () => {
    const prompt = buildDPIAPrompt(sampleIntake);
    expect(prompt).toContain(sampleIntake.treatment_name);
    expect(prompt).toContain(sampleIntake.controller);
    expect(prompt).toContain("Décisions automatisées : Oui");
    expect(prompt).toContain("Traitement à grande échelle : Oui");
    expect(prompt).toContain("Données sensibles (Art. 9) : Non");
    expect(prompt).toMatch(/\{\s*"title"/s);
    expect(prompt).toMatch(/"overall_risk_level"/);
    expect(prompt).toMatch(/consultation_required/);
  });

  it("demande uniquement JSON structuré (pas de markdown libre après le gabarit)", () => {
    const prompt = buildDPIAPrompt(sampleIntake);
    expect(prompt).toMatch(/Réponds UNIQUEMENT avec ce JSON/i);
    expect(prompt).toMatch(/"action_plan"\s*:\s*\[/);
    expect(prompt).toMatch(/"data_subject_rights"/);
  });
});
