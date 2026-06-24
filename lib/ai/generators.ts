import Anthropic from "@anthropic-ai/sdk";
import type { BillingContext } from "./billing-context";
import { billFromBillingContext } from "./bill-ai-call";
import { resolveModelApiId } from "./model-routing";
import { AI_CONFIG, TOOL_CONFIGS } from "./config";
import { getAiActClassifierSystemPrompt } from "./prompts/ai-act-classifier";
import { getArt11TechnicalDocSystemPrompt } from "./prompts/art11-technical-doc";
import { getEmployeePolicyIaSystemPrompt } from "./prompts/employee-policy-ia";
import { getThirdPartyContractAnalysisSystemPrompt } from "./prompts/third-party-contract-analysis";
import { FRIA_27_OUTPUT_JSON_SPEC, getFRIA27SystemPrompt } from "./prompts/fria-art27";
import {
  COMPLIANCE_CHECKLIST_JSON_SPEC,
  getComplianceChecklistSystemPrompt,
} from "./prompts/compliance-checklist";
import { ROPA_OUTPUT_JSON_SPEC, getRopaSystemPrompt } from "./prompts/ropa-art30";
import { getScannerWebSystemPrompt } from "./prompts/scanner-web";
import type { ScannerHeuristicResult } from "./scanner-heuristics";
import {
  getJurisprudenceAnalyzerSystemPrompt,
  jurisprudenceAnthropicParams,
} from "./prompts/jurisprudence-eu-analyzer";
import {
  buildRechercheJurisprudentielleUserPrompt,
  getRechercheJurisprudentielleSystemPrompt,
  rechercheJpAnthropicParams,
  type RechercheJpIntake,
} from "./prompts/recherche-jurisprudentielle";
import {
  buildResumeArretUserPrompt,
  getArretsGuideSystemPrompt,
  getResumeArretJsonSystemPrompt,
  resumeArretAnthropicParams,
  type ResumeArretMode,
  type ResumeArretNiveau,
} from "./prompts/arrets-guide";

async function messagesCreateWithBilling(
  anthropic: Anthropic,
  params: Anthropic.Messages.MessageCreateParamsNonStreaming,
  ctx?: BillingContext,
): Promise<Anthropic.Message> {
  const tool = ctx?.tool ?? ctx?.endpoint ?? "";
  const model = ctx ? resolveModelApiId({ plan: ctx.plan, tool }) : params.model;
  const message = await anthropic.messages.create({ ...params, model });
  if (ctx) {
    await billFromBillingContext(
      ctx,
      model,
      message.usage?.input_tokens ?? 0,
      message.usage?.output_tokens ?? 0,
    );
  }
  return message;
}

// ─── Art. 11 Technical Documentation ─────────────────────────────────────────
function art11AnthropicParams(): {
  model: string;
  max_tokens: number;
  temperature: number;
} {
  const modelEnv = typeof process.env.AI_ART11_MODEL === "string" ? process.env.AI_ART11_MODEL.trim() : "";
  const mtRaw = typeof process.env.AI_MAX_TOKENS_DOC_ART11 === "string" ? process.env.AI_MAX_TOKENS_DOC_ART11.trim() : "";
  const tempRaw =
    typeof process.env.AI_TEMPERATURE_DOC_ART11 === "string" ? process.env.AI_TEMPERATURE_DOC_ART11.trim() : "";
  const max_tokens = mtRaw ?
      (Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ? Math.floor(Number(mtRaw)) : TOOL_CONFIGS.doc_art11.maxTokens)
    : TOOL_CONFIGS.doc_art11.maxTokens;
  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : TOOL_CONFIGS.doc_art11.temperature;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}

export function buildArt11Prompt(data: {
  system_name: string;
  version: string;
  description: string;
  purpose: string;
  risk_category: string;
  ai_model_type: string;
  training_data: string;
  sector: string;
  provider: string;
}): string {
  const titleEsc = JSON.stringify(`Documentation Technique — ${data.system_name}`);
  const snEsc = JSON.stringify(data.system_name);
  return `# DOSSIER — DOCUMENTATION TECHNIQUE ART. 11 / ANNEXE IV

Ce formulaire nourrit une **première rédaction** structurée. Appliquez le modèle exhaustif du prompt système (Partie 2 : 9 sections Annexe IV) et les règles G1 à G6. Le déploiement produit doit recevoir uniquement du JSON conforme au schéma ci-dessous.

## Données fournies

| Champ | Contenu |
| --- | --- |
| Nom système | ${data.system_name} |
| Version | ${data.version} |
| Fournisseur (tel que saisi) | ${data.provider || "[À COMPLÉTER]"} |
| Secteur | ${data.sector} |
| Catégorie de risque déclarée | ${data.risk_category} |
| Type / techno modèle IA | ${data.ai_model_type || "[À COMPLÉTER]"} |
| Description générale | ${data.description} |
| Objectif et cas d'usage | ${data.purpose} |
| Données entraînement / test | ${data.training_data || "[À COMPLÉTER]"} |

Présumez à défaut de précision contractuelle que l'utilisateur agit comme **fournisseur** pour l'obligation Art. 11, sauf incohérence flagrante — qualifiez dans \`provider_role_note\`.

---

## SORTIE À PRODUIRE

Répondez **uniquement** avec un objet JSON respectant :

- Exactement **9** entrées dans \`sections\`, \`id\` de « 1 » à « 9 », titres officiels Annex IV suivants :

| id | title | article_ref (fixe pour le JSON produit) |
| --- | --- | --- |
| 1 | SECTION 1 — DESCRIPTION GÉNÉRALE DU SYSTÈME | Annexe IV pt. 1 · Règl. (UE) 2024/1689 |
| 2 | SECTION 2 — DESCRIPTION DU DÉVELOPPEMENT | Annexe IV pt. 2 · Règl. (UE) 2024/1689 |
| 3 | SECTION 3 — MONITORING, FONCTIONNEMENT ET CONTRÔLE | Annexe IV pt. 3 · Règl. (UE) 2024/1689 |
| 4 | SECTION 4 — ADÉQUATION DES MÉTRIQUES DE PERFORMANCE | Annexe IV pt. 4 · Art. 15 pertinent |
| 5 | SECTION 5 — SYSTÈME DE GESTION DES RISQUES | Annexe IV pt. 5 · Art. 9 |
| 6 | SECTION 6 — JOURNAL DES MODIFICATIONS | Annexe IV pt. 6 · Règl. (UE) 2024/1689 |
| 7 | SECTION 7 — NORMES ET SPÉCIFICATIONS TECHNIQUES | Annexe IV pt. 7 · Règl. (UE) 2024/1689 |
| 8 | SECTION 8 — DÉCLARATION UE DE CONFORMITÉ | Annexe IV pt. 8 · Art. 47 |
| 9 | SECTION 9 — SURVEILLANCE POST-COMMERCIALISATION | Annexe IV pt. 9 · Arts 72–73 |

Pour chaque \`sections[].content\` :
- Développez le **corps de section** sous forme de texte continu et de tableaux Markdown **dans une seule chaîne** (adaptés au dossier). Recopiez la structure indicative du prompt système § Partie 2 (titres/sous-points 1.1, 2.4, …) ; insérez \`⚠️\` devant toute sous-section critique encore vide ou générique sans faits vérifiables.
- Mentionnez **[À COMPLÉTER]** comme prescrit lorsque nécessaire.
- Réintégrez dans la **section 1** le bloc IDENTIFICATION complété lorsque vous disposez des éléments, sinon **[À COMPLÉTER]**.
- Déclarez \`estimated_incomplete_placeholder_count\` et \`critical_warnings_count\` en cohérence avec vos marqueurs [À COMPLÉTER]/⚠️.

Schéma JSON :

{
  "title": ${titleEsc},
  "system_version": "${data.version}",
  "provider_role_note": "",
  "legal_application_note": "Rappeler notamment entrée en vigueur Art. 11 — 2 août 2026 (Annexe III) et exception Annex I harmonisée.",
  "estimated_incomplete_placeholder_count": 0,
  "critical_warnings_count": 0,
  "sections": [
    {"id": "1", "title": "SECTION 1 — DESCRIPTION GÉNÉRALE DU SYSTÈME", "article_ref": "Annexe IV pt. 1 · Règl. (UE) 2024/1689", "content": "..." },
    {"id": "2", "title": "SECTION 2 — DESCRIPTION DU DÉVELOPPEMENT", "article_ref": "Annexe IV pt. 2 · Règl. (UE) 2024/1689", "content": "..." },
    {"id": "3", "title": "SECTION 3 — MONITORING, FONCTIONNEMENT ET CONTRÔLE", "article_ref": "Annexe IV pt. 3 · Règl. (UE) 2024/1689", "content": "..." },
    {"id": "4", "title": "SECTION 4 — ADÉQUATION DES MÉTRIQUES DE PERFORMANCE", "article_ref": "Annexe IV pt. 4 · Art. 15 pertinent", "content": "..." },
    {"id": "5", "title": "SECTION 5 — SYSTÈME DE GESTION DES RISQUES", "article_ref": "Annexe IV pt. 5 · Art. 9", "content": "..." },
    {"id": "6", "title": "SECTION 6 — JOURNAL DES MODIFICATIONS", "article_ref": "Annexe IV pt. 6 · Règl. (UE) 2024/1689", "content": "..." },
    {"id": "7", "title": "SECTION 7 — NORMES ET SPÉCIFICATIONS TECHNIQUES", "article_ref": "Annexe IV pt. 7 · Règl. (UE) 2024/1689", "content": "..." },
    {"id": "8", "title": "SECTION 8 — DÉCLARATION UE DE CONFORMITÉ", "article_ref": "Annexe IV pt. 8 · Art. 47", "content": "..." },
    {"id": "9", "title": "SECTION 9 — SURVEILLANCE POST-COMMERCIALISATION", "article_ref": "Annexe IV pt. 9 · Arts 72–73", "content": "..." }
  ],
  "professional_disclaimer": "",
  "compliance_checklist": [
    {"item": "Section 1 — Description générale complète", "status": "to_do", "ref": "Annexe IV §1"},
    {"item": "Section 2 — Développement documenté", "status": "to_do", "ref": "Annexe IV §2"},
    {"item": "Section 2.4 — Données d’entraînement (Art. 10)", "status": "to_do", "ref": "Art. 10"},
    {"item": "Section 2.5 — Contrôle humain conception (Art. 14)", "status": "to_do", "ref": "Art. 14"},
    {"item": "Section 3 — Limitations (Art. 13(3)(b))", "status": "to_do", "ref": "Art. 13"},
    {"item": "Section 4 — Métriques d'équité", "status": "to_do", "ref": "Art. 15"},
    {"item": "Section 5 — Gestion des risques (Art. 9)", "status": "to_do", "ref": "Art. 9"},
    {"item": "Section 6 — Journal modifications", "status": "to_do", "ref": "Annexe IV §6"},
    {"item": "Section 7 — Normes ou solutions alternatives", "status": "to_do", "ref": "Annexe IV §7"},
    {"item": "Section 8 — Déclaration UE conformité Art. 47", "status": "to_do", "ref": "Art. 47"},
    {"item": "Section 9 — Surveillance post-marché (Art. 72 / incidents Art. 73)", "status": "to_do", "ref": "Art. 72–73"}
  ],
  "next_steps": []
}

Titres système (${snEsc}). Adaptez \`compliance_checklist[].status\` vers \`compliant\` seulement si la section correspondante du document réellement résulte exhaustive et factuelle avec les données du dossier (sinon \`to_do\`). Répliquez aussi en fin du champ \`professional_disclaimer\` l'avertissement type Partie 2 du prompt.

\`next_steps\` doit lister au moins quatre actions priorisées pour le fournisseur (complétude, juriste IA, mise à jour et Art. 43(4), organisme notifié si pertinent).`;
}

export async function generateArt11TechnicalDocument(prompt: string, ctx?: BillingContext): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = art11AnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getArt11TechnicalDocSystemPrompt(),
    messages: [{ role: "user", content: prompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

// ─── FRIA Art. 27 ─────────────────────────────────────────────────────────────

export interface FRIAIntake27 {
  system_name: string;
  purpose: string;
  affected_population: string;
  fundamental_rights_at_stake: string[];
  sector: string;
  is_public_entity: boolean;
  organisation_name?: string;
  organisation_legal_nature?: string;
  deployment_country?: string;
  mission_sector?: string;
  system_description_io?: string;
  system_provider?: string;
  annex_iii_category?: string;
  decision_role?: string;
  usage_frequency_duration?: string;
  affected_categories?: string;
  volume_band?: string;
  vulnerable_groups?: string;
  personal_data_detail?: string;
  legal_effects_detail?: string;
  remedy_paths?: string;
  intake_notes?: string;
}

function friaOptionalString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function normalizeFRIAIntake(raw: Record<string, unknown>): FRIAIntake27 {
  const stake = raw.fundamental_rights_at_stake;
  return {
    system_name: typeof raw.system_name === "string" ? raw.system_name : "",
    purpose: typeof raw.purpose === "string" ? raw.purpose : "",
    affected_population: typeof raw.affected_population === "string" ? raw.affected_population : "",
    sector: typeof raw.sector === "string" ? raw.sector : "",
    is_public_entity: Boolean(raw.is_public_entity),
    fundamental_rights_at_stake: Array.isArray(stake) ? stake.map(String) : [],
    organisation_name: friaOptionalString(raw.organisation_name),
    organisation_legal_nature: friaOptionalString(raw.organisation_legal_nature),
    deployment_country: friaOptionalString(raw.deployment_country),
    mission_sector: friaOptionalString(raw.mission_sector),
    system_description_io: friaOptionalString(raw.system_description_io),
    system_provider: friaOptionalString(raw.system_provider),
    annex_iii_category: friaOptionalString(raw.annex_iii_category),
    decision_role: friaOptionalString(raw.decision_role),
    usage_frequency_duration: friaOptionalString(raw.usage_frequency_duration),
    affected_categories: friaOptionalString(raw.affected_categories),
    volume_band: friaOptionalString(raw.volume_band),
    vulnerable_groups: friaOptionalString(raw.vulnerable_groups),
    personal_data_detail: friaOptionalString(raw.personal_data_detail),
    legal_effects_detail: friaOptionalString(raw.legal_effects_detail),
    remedy_paths: friaOptionalString(raw.remedy_paths),
    intake_notes: friaOptionalString(raw.intake_notes),
  };
}

function friaAnthropicParams(): { model: string; max_tokens: number; temperature: number } {
  const modelEnv = typeof process.env.AI_FRIA_MODEL === "string" ? process.env.AI_FRIA_MODEL.trim() : "";
  const mtRaw = typeof process.env.AI_MAX_TOKENS_DOC_FRIA === "string" ? process.env.AI_MAX_TOKENS_DOC_FRIA.trim() : "";
  const tempRaw = typeof process.env.AI_TEMPERATURE_DOC_FRIA === "string" ? process.env.AI_TEMPERATURE_DOC_FRIA.trim() : "";

  const max_tokens =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ? Math.floor(Number(mtRaw)) : TOOL_CONFIGS.doc_fria.maxTokens;

  /** FRIA : plancher sous le défaut ancien de 8192 ; plafond 16384 (ajuster si l’API modèle autorise davantage). */
  const max_tokens_eff = Math.min(16384, Math.max(max_tokens, 12288));

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : TOOL_CONFIGS.doc_fria.temperature;

  return { model: modelEnv || AI_CONFIG.model, max_tokens: max_tokens_eff, temperature };
}

export function buildFRIA27UserPrompt(data: FRIAIntake27): string {
  const rightsListed =
    data.fundamental_rights_at_stake.length > 0 ? data.fundamental_rights_at_stake.join("; ")
    : "[non présélectionnés dans l’UI — qualifier selon intake]";
  const titleEsc = JSON.stringify(`FRIA — ${data.system_name}`);
  const ioDesc = data.system_description_io ?? data.purpose;

  return `# DOSSIER — FRIA ARTICLE 27 · Règlement (UE) 2024/1689

## Questionnaire synthétique (sections A à D · ce que fournit le déployeur CompliAI)

| Champ | Valeur |
|:---|:---|
| Organisation / déployeur | ${data.organisation_name ?? "[À COMPLÉTER]"} |
| Nature juridique | ${data.organisation_legal_nature ?? "[À COMPLÉTER]"} |
| Déclaratif entité publique / service public | ${data.is_public_entity ? "Oui" : "Non"} |
| Pays de déploiement | ${data.deployment_country ?? "[À COMPLÉTER]"} |
| Secteur / mission (court) | ${data.sector}${data.mission_sector ? ` — ${data.mission_sector}` : ""} |
| Système IA — nom projet | ${data.system_name} |
| Description fonctionnelle (inputs → outputs) | ${ioDesc} |
| Solution (interne / fournisseur) | ${data.system_provider ?? "[À COMPLÉTER]"} |
| Annexe III / qualification haut risque | ${data.annex_iii_category ?? "[À COMPLÉTER]"} |
| Place dans décision automatique ou assistée | ${data.decision_role ?? "[À COMPLÉTER]"} |
| Fréquence & durée d’usage envisagées | ${data.usage_frequency_duration ?? "[À COMPLÉTER]"} |
| Personnes potentiellement affectées (résumé) | ${data.affected_population} |
| Catégories précises | ${data.affected_categories ?? "[À COMPLÉTER]"} |
| Ordre de grandeur volume déclaratif | ${data.volume_band ?? "[À COMPLÉTER]"} |
| Groupes vulnérables (déclaratif initial) | ${data.vulnerable_groups ?? "[À COMPLÉTER]"} |
| Données personnelles / sensibles potentielles | ${data.personal_data_detail ?? "[À COMPLÉTER]"} |
| Effets juridiques ou significatif sur les personnes | ${data.legal_effects_detail ?? "[À COMPLÉTER]"} |
| Voies de recours | ${data.remedy_paths ?? "[À COMPLÉTER]"} |
| Droits pré-cochés (interface) | ${rightsListed} |

### Notes ou questionnaire libres

${data.intake_notes ?? "[aucune note additionnelle]"}

---

Contrôlez la cohérence avec les **règles G et la checklist §7 du prompt système**. Le JSON doit être **exploitable juridiquement** : aucune section 2.2 creuse ni scores artificiels.

Exigences spécifiques :
- **rights_areas** : n’inclure que les codes **réellement mobilisables** par les faits ; pour le reste, le bloc \`honesty_notes\` peut renvoyer brièvement aux volets hors champ (sans remplir artificiellement 10 sections).
- **rights_assessment** : **au moins 3** entrées pertinentes et distinctes (cible ≥ 5 uniquement si vous restez concis et sans risquer une réponse incomplète).
- Une seule valeur **deployment_recommendation** ; alignée sur **section6.motivated_conclusion_text** et **conclusion**.
- Rappeler **EU AIDA Art. 49** et calendrier **2 août 2026** pour les systèmes haut risque visés comme dans le fichier métier (ne pas extrapoler autres dates infra-légales).
- Titre : ${titleEsc}

---

${FRIA_27_OUTPUT_JSON_SPEC}`;
}

/** Ancienne entrée REST : même corps que formulaire élargi ; reconduit via \`normalizeFRIAIntake\`. */
export function buildFRIAPrompt(data: Record<string, unknown>): string {
  return buildFRIA27UserPrompt(normalizeFRIAIntake(data));
}

export async function generateFRIA27Document(prompt: string, ctx?: BillingContext, systemAddendum = ""): Promise<{ raw: string; stop_reason: string | null }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = friaAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system:
      `${getFRIA27SystemPrompt()}\n\nTu réponds STRICTEMENT avec un unique objet JSON valide selon schéma message utilisateur. N’ajoute aucun bloc markdown.${systemAddendum}`,
    messages: [{ role: "user", content: prompt }],
  }, ctx);
  let combined = "";
  for (const block of message.content) {
    if (block.type === "text") combined += block.text;
  }
  combined = combined.trim();
  if (!combined) throw new Error("Réponse vide du modèle pour la FRIA (aucun bloc texte)");
  return { raw: combined, stop_reason: message.stop_reason ?? null };
}

// ─── Employee AI Policy (Art. 4 AI Act · politique salariés PDF signable) ────

function employeePolicyAnthropicParams(): {
  model: string;
  max_tokens: number;
  temperature: number;
} {
  const modelEnv =
    typeof process.env.AI_POLICY_EMPLOYEE_MODEL === "string" ? process.env.AI_POLICY_EMPLOYEE_MODEL.trim() : "";
  const mtRaw =
    typeof process.env.AI_MAX_TOKENS_POLICY_EMPLOYEE === "string" ? process.env.AI_MAX_TOKENS_POLICY_EMPLOYEE.trim() : "";
  const tempRaw =
    typeof process.env.AI_TEMPERATURE_POLICY_EMPLOYEE === "string" ? process.env.AI_TEMPERATURE_POLICY_EMPLOYEE.trim() : "";

  const max_tokens =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ? Math.floor(Number(mtRaw)) : 4000;

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : 0.15;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}

export function buildEmployeePolicyPrompt(data: {
  company_name: string;
  sector: string;
  ai_tools_used: string;
  employee_count: string;
  country?: string;
  cse_status?: string;
  additional_context?: string;
}): string {
  const country = (data.country?.trim() || "France").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const cse = (data.cse_status?.trim() || "non précisé").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const extra =
    data.additional_context?.trim() ?
      `\n### Contexte additionnel (organisation)\n\n${data.additional_context.trim()}`
    : "";
  const titleExample = JSON.stringify(`Politique d'Usage de l'IA — ${data.company_name}`);

  return `# DOSSIER — POLITIQUE D'USAGE IA POUR EMPLOYÉS

Vous appliquez le prompt système « Politique d'usage IA employés » (Art. 4 AI Act, Art. 26(6), RGPD, droit national). Le formulaire fourni équivalent intake partiel ; complétez avec **[À COMPLÉTER]** et **⚠️** sur les sous-parties critiques (formation, incidents, sanctions, données, outils lists) lorsque nécessaire. Ne **inventez** aucune contrainte de sanction chiffrée ni aucune liste d'outil non citée comme hypothétique sans marque du caractère modèle/exemple entre parenthèses.

## Données configurateur

| Champ | Valeur |
| --- | --- |
| Nom de l'entreprise | ${data.company_name} |
| Secteur | ${data.sector} |
| Effectif déclaratif | ${data.employee_count} salariés (tranche) |
| Pays de déploiement principal | ${country} |
| Représentation du personnel (CSE etc.) — statut tel que renseigné | ${cse} |
| Outils IA utilisés déclarés | ${data.ai_tools_used.replace(/\|/g, "\\|")} |
${extra}

Adaptez les **Parties 3 à 7** du prompt : personnaliser secteur, taille, pays (dont Code du travail français si pertinent), mention CSE (France — conditions de seuils : ne pas généraliser à tort ; voir partie 5 AH4).

---

## SORTIE À PRODUIRE

Une seule réponse JSON, schéma exact :

{
  "title": ${titleExample},
  "version": "1.0",
  "effective_date": "[À COMPLÉTER — date prévue]",
  "header_meta_note": "[Version, entrée en vigueur, responsable désigné, périmètre personnel — lignes titre tel modèle partie 2]",
  "estimated_incomplete_count": 0,
  "key_rules": ["...", "...", "...", "...", "..."],
  "sections": [
    {"id": "1", "title": "PRÉAMBULE", "content": "(texte clair accessible + mention AI Act entrée depuis 02/02/2025 + RGPD + éventuelle phrase CSE / Art. 26(6) si applicable avec nuance AH4)"},
    {"id": "2", "title": "ARTICLE 1 — CHAMP D'APPLICATION", "content": "(3 sous-parties comme modèle — salariés, lieux/matériels, relation avec autres actes)"},
    {"id": "3", "title": "ARTICLE 2 — OUTILS AUTORISÉS", "content": "(table Markdown outils tirés ou dérivés de la liste configurateur + [À COMPLÉTER] si liste floue + procédure approbation + comptes personnels)"},
    {"id": "4", "title": "ARTICLE 3 — RÈGLES D'USAGE", "content": "(3.1 autorisées ✅ liste et 3.2 interdites ❌ — alignées sur données entreprise ou [À COMPLÉTER])"},
    {"id": "5", "title": "ARTICLE 4 — PROTECTION DES DONNÉES PERSONNELLES (RGPD)", "content": "..."},
    {"id": "6", "title": "ARTICLE 5 — PROPRIÉTÉ INTELLECTUELLE ET DROITS D'AUTEUR", "content": "..."},
    {"id": "7", "title": "ARTICLE 6 — VÉRIFICATION HUMAINE ET RESPONSABILITÉ", "content": "(niveaux d'enjeu + transparence + Art. 50 AI Act contextuel 02/08/2026 comme échéance transparence)"},
    {"id": "8", "title": "ARTICLE 7 — LITTÉRATIE IA ET FORMATION (Art. 4 AI Act)", "content": "(programme avec [À COMPLÉTER] si inconnu)"},
    {"id": "9", "title": "ARTICLE 8 — SIGNALEMENT DES INCIDENTS", "content": "(canal contacts [À COMPLÉTER])"},
    {"id": "10", "title": "ARTICLE 9 — SANCTIONS", "content": "(renvoi RINT sans montants fictifs AH2)"},
    {"id": "11", "title": "ARTICLE 10 — MISE À JOUR DE LA POLITIQUE", "content": "..."},
    {"id": "12", "title": "ARTICLE 11 — CONTACTS UTILES", "content": "..."},
    {"id": "13", "title": "BASES LÉGALES DE CETTE POLITIQUE", "content": "(liste articles exacts + dates AH1 où utile)"},
    {"id": "14", "title": "ANNEXE 1 — LISTE DES OUTILS IA APPROUVÉS", "content": "(détail conditions)"},
    {"id": "15", "title": "ANNEXE 2 — EXEMPLES D'USAGES AUTORISÉS ET INTERDITS (+ liste noire si RÈGLE P5)", "content": "(table exemples modèle partie 2)"},
    {"id": "16", "title": "ACCUSÉ DE RÉCEPTION ET ENGAGEMENT", "content": "(bloc signable verbatim structure partie 2 + [À COMPLÉTER] lignes réservées)"}
  ],
  "professional_footer": "(lignes type fin document partie 2 : CompliAI + validation juridique conseillée)"
}

Le titre JSON \`title\` doit suivre exactement la valeur d'exemple donnée (${titleExample}).
Pour chaque \`content\`: **texte prêt diffusion** avec retours ligne et tableaux Markdown si utile. Respecter formulations **positives + négatives**, ton employé-accessible sans jargon inutile.`;
}

export async function generateEmployeePolicyDocument(prompt: string, ctx?: BillingContext, systemAddendum = ""): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = employeePolicyAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getEmployeePolicyIaSystemPrompt() + systemAddendum,
    messages: [{ role: "user", content: prompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

// ─── Contrat tiers / sous-traitance IA · Art. 28 RGPD + AI Act déployeur ──────

export interface ContractAnalysisIntake {
  providerName: string;
  contractText: string;
  /** Option B — précision service */
  serviceDescription?: string;
  contractType?: string;
  contractVersionOrDate?: string;
  roleInRelationship?: string;
  personalDataContext?: string;
  providerTrainingUse?: string;
  serviceCriticality?: string;
  sector?: string;
  companyCountry?: string;
}

function contractAnalysisMaxInputChars(): number {
  const raw = typeof process.env.AI_CONTRACT_ANALYSIS_MAX_INPUT_CHARS === "string" ?
      process.env.AI_CONTRACT_ANALYSIS_MAX_INPUT_CHARS.trim()
    : "";
  if (!raw || !Number.isFinite(Number(raw))) return 16000;
  const n = Math.floor(Number(raw));
  return n > 0 ? n : 16000;
}

function contractAnalysisAnthropicParams(): { model: string; max_tokens: number; temperature: number } {
  const modelEnv =
    typeof process.env.AI_CONTRACT_ANALYSIS_MODEL === "string" ? process.env.AI_CONTRACT_ANALYSIS_MODEL.trim() : "";
  const mtRaw =
    typeof process.env.AI_MAX_TOKENS_CONTRACT_ANALYSIS === "string" ? process.env.AI_MAX_TOKENS_CONTRACT_ANALYSIS.trim() : "";
  const tempRaw =
    typeof process.env.AI_TEMPERATURE_CONTRACT_ANALYSIS === "string" ? process.env.AI_TEMPERATURE_CONTRACT_ANALYSIS.trim()
    : "";
  const max_tokens =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ? Math.floor(Number(mtRaw)) : 3000;

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : 0.05;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}

/** Compatibilité : \`(contractText, providerName)\` équivalent à intake minimal. */
export function buildContractAnalysisPrompt(contractText: string, providerName: string): string {
  return buildThirdPartyContractAnalysisUserPrompt({ providerName, contractText });
}

export function buildThirdPartyContractAnalysisUserPrompt(data: ContractAnalysisIntake): string {
  const maxC = contractAnalysisMaxInputChars();
  const clipped = data.contractText.length > maxC ? data.contractText.slice(0, maxC) : data.contractText;
  const truncationNote =
    data.contractText.length > maxC ?
      `ATTENTION APPLICATION : extrait tronqué à ${maxC} caractères sur ${data.contractText.length} — reflétez-le dans ambiguity_notes avec impact sur les localisations.`
    : "";

  return `# DOSSIER — ANALYSE CONTRAT TIERS

## Contexte métier utilisateur CompliAI (intake — tenir compte pour grilles sectorielles et Clause 9)

| Champ | Valeur |
|:--|:--|
| Prestataire (nom) | ${data.providerName} |
| Service (Option B ou précision) | ${data.serviceDescription || "[non renseigné]"} |
| Type document | ${data.contractType || "[non renseigné]"} |
| Version ou date contrat | ${data.contractVersionOrDate || "[non renseigné]"} |
| Rôle utilisateur dans la chaîne contractuelle | ${data.roleInRelationship || "[non renseigné]"} |
| Données personnelles / sensibles déclarées | ${data.personalDataContext || "[non renseigné]"} |
| Usage données pour entraînement fournisseur déclaré | ${data.providerTrainingUse || "[non renseigné]"} |
| Criticité service | ${data.serviceCriticality || "[non renseigné]"} |
| Secteur | ${data.sector || "[non renseigné]"} |
| Pays entreprise cliente | ${data.companyCountry || "[non renseigné]"} |

---

## TEXTE ANALYSÉ (Option A ou extrait fichier)

${clipped || "[À COMPLÉTER — aucun texte fourni : analyse indicative limitée]"}

${truncationNote}

---

## SORTIE OBLIGATOIRE — OBJET JSON UNIQUE (schéma)

Calculez \`score_rgpd_art28\`, \`score_ai_act\`, \`score_global\`, \`risk_score\` **exactement comme la Partie 4 du prompt système**.
\`risk_score\` = \`score_global\` arrondie entière 0–100.

Statuses par ligne de grille : "present"|"partial"|"absent"|"na".

{
  "provider": "${data.providerName}",
  "score_rgpd_art28": 0,
  "score_ai_act": 0,
  "score_global": 0,
  "risk_score": 0,
  "score_indicator_rgpd": "green|yellow|orange|red",
  "score_indicator_ai_act": "green|yellow|orange|red",
  "risk_level_global": "CRITIQUE|ELEVE|MODERE|FAIBLE",

  "contract_analyzed": {
    "provider": "${data.providerName}",
    "service": "",
    "contract_type": "${data.contractType || ""}",
    "version_or_date": "${data.contractVersionOrDate || ""}"
  },

  "sector_notes": "",
  "sector_checks": [{ "sector": "finance|critical_infra|health|legal_profession|none", "item": "", "status": "present|partial|absent|na", "evaluation": "" }],

  "gdpr_art28_clauses": [
    {"id":"1","title":"Instructions Art.28(3)(a)","status":"present|partial|absent","location":"","evaluation":""},
    {"id":"2","title":"Confidentialité Art.28(3)(b)","status":"","location":"","evaluation":""},
    {"id":"3","title":"Mesures sécurité Art.28(3)(c) / Art.32","status":"","location":"","evaluation":""},
    {"id":"4","title":"Sous-traitants ultérieurs Art.28(2)(4)","status":"","location":"","evaluation":""},
    {"id":"5","title":"Droits des personnes Art.28(3)(e)","status":"","location":"","evaluation":""},
    {"id":"6","title":"Assist. sécurité & violations Art.28(3)(f) / Arts 33-34","status":"","location":"","evaluation":""},
    {"id":"7","title":"Effacement / restitution Art.28(3)(g)","status":"","location":"","evaluation":""},
    {"id":"8","title":"Audit & contrôle Art.28(3)(h)","status":"","location":"","evaluation":""},
    {"id":"9","title":"Transferts hors UE Arts 44-49","status":"","location":"","evaluation":""}
  ],

  "ai_act_deployer_clauses": [
    {"id":"A","title":"Identification rôle chaîne valeur","status":"","location":"","evaluation":""},
    {"id":"B","title":"Instructions d'utilisation / Art.13","status":"","location":"","evaluation":""},
    {"id":"C","title":"Qualité données d'entrée Art.25(4)","status":"","location":"","evaluation":""},
    {"id":"D","title":"Contrôle humain Art.14 + Art.25(2)","status":"","location":"","evaluation":""},
    {"id":"E","title":"Non-entraînement / rétention","status":"","location":"","evaluation":""},
    {"id":"F","title":"Incident grave Art.73","status":"","location":"","evaluation":""},
    {"id":"G","title":"Documentation / journaux déployeur","status":"","location":"","evaluation":""},
    {"id":"H","title":"EU AIDA Art.49","status":"","location":"","evaluation":""}
  ],

  "critical_gaps": [
    {
      "title": "",
      "legal_basis": "",
      "finding": "",
      "risk": "",
      "clause_to_negotiate": ""
    }
  ],
  "moderate_attention_points": [
    {
      "title": "",
      "legal_basis": "",
      "finding": "",
      "recommendation": ""
    }
  ],

  "compliant_highlights": [{ "text": "", "location": "" }],
  "problematic_contract_clauses": [{ "location": "", "summary": "", "concern": "" }],
  "ambiguity_notes": [""],

  "action_plan": {
    "immediate": [""],
    "short_term_30_90_days": [""],
    "at_next_renewal": [""]
  },

  "sanctions_reference": [
    {"foundation":"","max_sanction":"","probability_H_M_L":"H|M|L"}
  ],

  "professional_disclaimer": "",

  "overall_assessment": "",

  "findings": [
    {
      "category": "RGPD|AI Act|DORA|NIS2|Sécurité|Contractuel",
      "type": "compliant|risk|missing|recommendation",
      "title": "",
      "description": "",
      "regulation_ref": "",
      "severity": "low|medium|high|critical"
    }
  ],
  "missing_clauses": [""],
  "recommended_amendments": [""],

  "gdpr_compliant": false,
  "ai_act_compliant": false
}

Contraintes finales :
- Les \`findings\` doivent refléter et **ne pas contredire** les grilles (principaux points + synthèse).
- \`missing_clauses\` : formulation courte liste manques Art.28 majeurs ❌/.
- \`recommended_amendments\` : actions/amendements concrets (dont clauses types § Partie 5 si pertinent).

**Répétez le nom prestataire** dans \`contract_analyzed.provider\`.

Aucun champ ne doit contenir de prose markdown hors chaînes JSON : texte plat uniquement ; échapper correctement les guillemets dans le JSON final.

`;
}

/** Appel Claude pour outil analyse contrat tiers (température très basse, JSON strict utilisateur). */
export async function generateThirdPartyContractAnalysis(userPrompt: string, ctx?: BillingContext): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = contractAnalysisAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system:
      `${getThirdPartyContractAnalysisSystemPrompt()}\n\nTu produis STRICTEMENT du JSON objet selon schéma message utilisateur. Pas de bloc markdown. Débute par { termine }.`,
    messages: [{ role: "user", content: userPrompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}


// ─── DPIA Art. 35 RGPD ───────────────────────────────────────────────────────
export function buildDPIAPrompt(data: {
  treatment_name: string;
  controller: string;
  purposes: string;
  data_types: string;
  data_subjects: string;
  retention: string;
  recipients: string;
  automated_decisions: boolean;
  large_scale: boolean;
  sensitive_data: boolean;
  sector: string;
}): string {
  return `Tu es un DPO expert en RGPD. Génère une Analyse d'Impact sur la Protection des Données (DPIA) complète et conforme à l'Article 35 du RGPD (UE 2016/679) et aux Lignes directrices EDPB WP248.

TRAITEMENT ANALYSÉ :
- Nom du traitement : ${data.treatment_name}
- Responsable de traitement : ${data.controller}
- Finalités : ${data.purposes}
- Catégories de données : ${data.data_types}
- Personnes concernées : ${data.data_subjects}
- Durée de conservation : ${data.retention}
- Destinataires / sous-traitants : ${data.recipients}
- Décisions automatisées : ${data.automated_decisions ? "Oui" : "Non"}
- Traitement à grande échelle : ${data.large_scale ? "Oui" : "Non"}
- Données sensibles (Art. 9) : ${data.sensitive_data ? "Oui" : "Non"}
- Secteur : ${data.sector}

Référence méthodologique prioritaire pour l’analyse du **risque élevé** et la **proportionnalité** : **CEPD / EDPB, Guidelines on Data Protection Impact Assessment, WP248 rev.01** (4 avril 2017 ; révision 4 oct. 2017). Ne mobilise pas *Schrems I* ou *Schrems II* pour commenter l’**article 35** du RGPD (ces arrêts portent sur le chapitre V — transferts). Structure ton raisonnement pratiquement selon WP248 : description du traitement, nécessité / proportionnalité, analyse des risques aux droits et libertés des personnes, mesures envisagées, avis du DPO, consultation de l’autorité lorsque pertinent (Art. 36).

Réponds UNIQUEMENT avec ce JSON (pas de texte avant ou après) :
{
  "title": "DPIA — ${data.treatment_name}",
  "dpia_required": true,
  "necessity_score": <entier 0-100 justifiant la nécessité de la DPIA>,
  "executive_summary": "2-3 phrases de résumé de l'analyse.",
  "processing_description": {
    "purposes_assessment": "Évaluation des finalités et de leur légitimité. 2-3 phrases.",
    "legal_basis": "<Article 6 RGPD applicable et justification>",
    "proportionality": "Évaluation de la proportionnalité du traitement. 2-3 phrases.",
    "necessity": "Évaluation de la nécessité. 2-3 phrases."
  },
  "risks": [
    {
      "risk": "Risque identifié 1",
      "threat": "Menace correspondante",
      "likelihood": "low|medium|high",
      "severity": "low|medium|high|critical",
      "residual_risk": "low|medium|high|critical",
      "measures": "Mesures de mitigation. 2-3 phrases."
    }
  ],
  "measures": [
    {
      "category": "Technique|Organisationnelle|Contractuelle",
      "measure": "Description de la mesure",
      "article_ref": "Art. XX RGPD",
      "status": "implemented|planned|required"
    }
  ],
  "data_subject_rights": {
    "information": "Modalités d'information des personnes concernées. 1-2 phrases.",
    "access": "Modalités d'accès. 1-2 phrases.",
    "rectification": "Modalités de rectification. 1-2 phrases.",
    "erasure": "Modalités d'effacement. 1-2 phrases.",
    "portability": "Modalités de portabilité. 1-2 phrases.",
    "opposition": "Modalités d'opposition. 1-2 phrases."
  },
  "transfers": "Évaluation des transferts hors UE si applicable. 2-3 phrases.",
  "consultation_required": <true si risques résiduels élevés après mesures>,
  "dpo_opinion": "Avis DPO synthétique. 2-3 phrases.",
  "overall_risk_level": "low|medium|high|critical",
  "conclusion": "Conclusion et prochaines étapes. 2-3 phrases.",
  "action_plan": ["action prioritaire 1", "action 2", "action 3"]
}

Remplace chaque valeur générique par du contenu précis pour le traitement "${data.treatment_name}" (secteur: ${data.sector}, données: ${data.data_types}).`;
}

// ─── RoPA Art. 30 RGPD ───────────────────────────────────────────────────────

export type RopaMode = "register_batch" | "single_fiche" | "audit";

export interface RopaIntake {
  mode: RopaMode;
  company_name: string;
  company_size: string;
  sector: string;
  activities: string;
  dpo_name: string;
  dpo_email: string;
  treatment_name?: string;
  role?: string;
  /** Réponses libres ou items du questionnaire structuré (modes fiche / audit). */
  intake_extended?: string;
  existing_record?: string;
  template_hint?: string;
}

function str(raw: Record<string, unknown>, key: string): string {
  return typeof raw[key] === "string" ? (raw[key] as string) : "";
}

export function normalizeRopaIntake(raw: Record<string, unknown>): RopaIntake {
  const m = raw.mode;
  const mode: RopaMode =
    m === "single_fiche" || m === "audit" || m === "register_batch" ? m : "register_batch";

  return {
    mode,
    company_name: str(raw, "company_name"),
    company_size: str(raw, "company_size"),
    sector: str(raw, "sector"),
    activities: str(raw, "activities"),
    dpo_name: str(raw, "dpo_name"),
    dpo_email: str(raw, "dpo_email"),
    treatment_name: str(raw, "treatment_name") || undefined,
    role: str(raw, "role") || undefined,
    intake_extended: str(raw, "intake_extended") || undefined,
    existing_record: str(raw, "existing_record") || undefined,
    template_hint: str(raw, "template_hint") || undefined,
  };
}

function ropaAnthropicParams(): { model: string; max_tokens: number; temperature: number } {
  const modelEnv = typeof process.env.AI_ROPA_MODEL === "string" ? process.env.AI_ROPA_MODEL.trim() : "";
  const mtRaw = typeof process.env.AI_MAX_TOKENS_ROPA === "string" ? process.env.AI_MAX_TOKENS_ROPA.trim() : "";
  const tempRaw = typeof process.env.AI_TEMPERATURE_ROPA === "string" ? process.env.AI_TEMPERATURE_ROPA.trim() : "";

  const defaultMt = 8000;
  const requested =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ? Math.floor(Number(mtRaw)) : defaultMt;
  const max_tokens = Math.min(16384, Math.max(requested, 6000));

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : 0.1;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}

export function buildRopaUserPrompt(data: RopaIntake): string {
  const spec = ROPA_OUTPUT_JSON_SPEC;

  if (data.mode === "audit") {
    return `# MODE AUDIT — FICHE OU REGISTRE EXISTANT

## Texte fourni par l'utilisateur à analyser

${data.existing_record?.trim() || "[Aucun texte — signaler dans audit_report que le contenu est insuffisant]"}

## Contexte organisation (facultatif)

| Champ | Valeur |
| --- | --- |
| Organisation | ${data.company_name || "[À COMPLÉTER]"} |
| Taille | ${data.company_size || "[À COMPLÉTER]"} |
| Secteur | ${data.sector || "[À COMPLÉTER]"} |
| DPO | ${data.dpo_name || "—"} (${data.dpo_email || "—"}) |

Produisez **audit_report** avec grille Art. 30 (checks, gaps, risks, recommendations). Reprenez les traitements dans \`treatments[]\` seulement si vous pouvez les structurer depuis le texte ; sinon tableau vide et détail dans l’audit.

---

${spec}`;
  }

  if (data.mode === "single_fiche") {
    const tname = data.treatment_name?.trim() || "[À COMPLÉTER — nom du traitement]";
    return `# MODE FICHE UNIQUE — ART. 30 RGPD

| Champ | Valeur |
| --- | --- |
| Organisation | ${data.company_name || "[À COMPLÉTER]"} |
| Taille | ${data.company_size || "[À COMPLÉTER]"} |
| Secteur | ${data.sector || "[À COMPLÉTER]"} |
| DPO | ${data.dpo_name || "—"} (${data.dpo_email || "—"}) |
| Nom du traitement | ${tname} |
| Rôle (RT / ST / co-RT) | ${data.role || "[À COMPLÉTER]"} |
| Indication modèle type | ${data.template_hint || "aucune"} |

## Questionnaire / précisions (ne pas inventer hors de ce bloc)

${data.intake_extended?.trim() || data.activities || "[À COMPLÉTER]"}

Générez **une seule entrée** dans \`treatments[]\`, fiche complète Art. 30(1) ou 30(2) selon le rôle.

---

${spec}`;
  }

  return `# MODE REGISTRE — PLUSIEURS TRAITEMENTS (APERÇU ORGANISATION)

| Champ | Valeur |
| --- | --- |
| Organisation | ${data.company_name} |
| Taille | ${data.company_size} |
| Secteur | ${data.sector} |
| DPO | ${data.dpo_name} (${data.dpo_email}) |

## Activités et familles de traitements (synthèse)

${data.activities}

Générez **6 à 10** traitements réalistes, secteur et volumétrie cohérents. Réutiliser les **codes types** du fichier métier (RH-001, MARKETING-001, …) en \`id\` ou \`fiche_number\` lorsque pertinent.

Remplir **company_overview**, **summary**, **dashboard** et **security_measures** au niveau registre.

---

${spec}`;
}

export function buildRoPAPrompt(data: Record<string, unknown>): string {
  return buildRopaUserPrompt(normalizeRopaIntake(data));
}

export async function generateRopaDocument(prompt: string, ctx?: BillingContext, systemAddendum = ""): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = ropaAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system:
      `${getRopaSystemPrompt()}\n\nTu réponds STRICTEMENT avec un **unique objet JSON** selon le schéma du message utilisateur. Aucun markdown.${systemAddendum}`,
    messages: [{ role: "user", content: prompt }],
  }, ctx);
  let combined = "";
  for (const block of message.content) {
    if (block.type === "text") combined += block.text;
  }
  combined = combined.trim();
  if (!combined) throw new Error("Réponse vide du modèle RoPA");
  return combined;
}

/** Assure la présence des clés attendues par le PDF (\`lib/pdf/ropa.tsx\`) et l’UI. */
export function normalizeRopaContentForClient(parsed: Record<string, unknown>): Record<string, unknown> {
  const c = { ...parsed } as Record<string, unknown> & {
    controller?: string;
    company_overview?: Record<string, unknown>;
    dpo?: Record<string, unknown>;
    dpo_info?: Record<string, unknown>;
  };

  if (!c.company_overview || typeof c.company_overview !== "object") {
    c.company_overview = {};
  }
  const co = c.company_overview as Record<string, unknown>;
  const ctrl = typeof c.controller === "string" ? c.controller : "";
  if (!co.name && ctrl) co.name = ctrl;
  if (!co.sector && typeof parsed.sector_hint === "string") co.sector = parsed.sector_hint;

  if (!c.dpo_info || typeof c.dpo_info !== "object") {
    const dpo = c.dpo && typeof c.dpo === "object" ? (c.dpo as Record<string, unknown>) : null;
    c.dpo_info = {
      name: typeof dpo?.name === "string" ? dpo.name : "",
      email: typeof dpo?.email === "string" ? dpo.email : "",
    };
  }

  if (c.summary && typeof c.summary === "object") {
    const s = c.summary as Record<string, unknown>;
    if (s.treatments_with_ai === undefined && typeof s.treatments_with_ai_systems === "number") {
      s.treatments_with_ai = s.treatments_with_ai_systems;
    }
  }

  return c;
}

// ─── Scanner page web (bêta) ───────────────────────────────────────────────────

export type ScannerInputMode = "html" | "url" | "description" | "questionnaire";

export type ScannerQuestionnaire = {
  cookie_banner: "accept_refuse" | "accept_only" | "prechecked" | "none";
  analytics: "ga" | "matomo" | "plausible" | "fathom" | "none" | "unknown";
  form: "none" | "with_consent" | "without_consent";
  footer_legal: "yes" | "no" | "no_footer";
  privacy_link: "yes" | "no";
  google_fonts: "yes" | "no" | "unknown";
  chatbot: "no" | "labeled" | "unlabeled";
  https: "yes" | "no";
};

function scannerAnthropicParams(): { model: string; max_tokens: number; temperature: number } {
  const modelEnv = typeof process.env.AI_SCANNER_MODEL === "string" ? process.env.AI_SCANNER_MODEL.trim() : "";
  const mtRaw = typeof process.env.AI_MAX_TOKENS_SCANNER === "string" ? process.env.AI_MAX_TOKENS_SCANNER.trim() : "";
  const tempRaw = typeof process.env.AI_TEMPERATURE_SCANNER === "string" ? process.env.AI_TEMPERATURE_SCANNER.trim() : "";

  const defaultMt = TOOL_CONFIGS.scanner.maxTokens;
  const requested =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ? Math.floor(Number(mtRaw)) : defaultMt;
  const max_tokens = Math.min(8192, Math.max(requested, 1500));

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : TOOL_CONFIGS.scanner.temperature;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}

const HTML_PROMPT_MAX = 120_000;

/** Construction du message utilisateur pour le modèle — réutilisable par l’API. */
export function buildScannerUserPrompt(input: {
  mode: ScannerInputMode;
  html?: string;
  url?: string;
  observations?: string;
  questionnaire?: ScannerQuestionnaire;
  heuristics?: ScannerHeuristicResult | null;
  scan_date_iso?: string;
}): string {
  const date =
    input.scan_date_iso || new Date().toISOString().slice(0, 10);
  const hBlock =
    input.heuristics ?
      `## Analyse automatique (indices techniques — à intégrer au rapport)\n\n\`\`\`json\n${JSON.stringify(input.heuristics, null, 2)}\n\`\`\`\n`
    : "";

  if (input.mode === "questionnaire" && input.questionnaire) {
    const q = input.questionnaire;
    return `# MODE C — QUESTIONNAIRE GUIDÉ

## Réponses normalisées

| Question | Réponse |
| --- | --- |
| Bandeau cookies | ${q.cookie_banner} |
| Analytics | ${q.analytics} |
| Formulaire | ${q.form} |
| Lien mentions légales (footer) | ${q.footer_legal} |
| Lien politique confidentialité | ${q.privacy_link} |
| Google Fonts | ${q.google_fonts} |
| Chatbot / IA | ${q.chatbot} |
| HTTPS observé | ${q.https} |

Génère le rapport Markdown complet (parties 1–6) à partir de ces seules réponses ; signale explicitement tout ce qui ne peut pas être déduit.

Date du scan : ${date}

---

${hBlock}`;
  }

  if (input.mode === "description") {
    return `# MODE B — DESCRIPTION D’UNE URL (PAS DE HTML FOURNI)

**URL (si fournie)** : ${input.url || "[non fournie]"}

**Ce que l’utilisateur observe** :

${input.observations || "[vide]"}

Instructions : base-toi sur cette description pour un diagnostic exploratoire ; indique systématiquement les limites (pas d’accès au code) et recommande affichage du code source + onglet Réseau.

Date du scan : ${date}

---

${hBlock}`;
  }

  const rawHtml = input.html ?? "";
  const truncated = rawHtml.length > HTML_PROMPT_MAX ? rawHtml.slice(0, HTML_PROMPT_MAX) : rawHtml;
  const truncNote =
    rawHtml.length > HTML_PROMPT_MAX ?
      `\n⚠️ **Troncature** : seuls les ${HTML_PROMPT_MAX.toLocaleString("fr-FR")} premiers caractères sont envoyés au modèle.\n`
    : "";

  const modeLabel =
    input.mode === "url" ? "MODE URL — HTML RÉCUPÉRÉ CÔTÉ SERVEUR (statique)" : "MODE A — HTML COLLÉ PAR L’UTILISATEUR";

  return `# ${modeLabel}

**Source / URL** : ${input.url || "HTML collé (pas d’URL)"}
**Date du scan** : ${date}
${truncNote}

---

${hBlock}

## HTML à analyser (texte brut)

\`\`\`html
${truncated || "(vide)"}
\`\`\`
`;
}

export async function generateScannerMarkdownReport(userPrompt: string, ctx?: BillingContext): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = scannerAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getScannerWebSystemPrompt(),
    messages: [{ role: "user", content: userPrompt }],
  }, ctx);
  let combined = "";
  for (const block of message.content) {
    if (block.type === "text") combined += block.text;
  }
  combined = combined.trim();
  if (!combined) throw new Error("Réponse vide du modèle (scanner)");
  return combined;
}

// ─── AI Act Classifier ────────────────────────────────────────────────────────
function classifierAnthropicParams(): {
  model: string;
  max_tokens: number;
  temperature: number;
} {
  const modelEnv = typeof process.env.AI_CLASSIFIER_MODEL === "string" ? process.env.AI_CLASSIFIER_MODEL.trim() : "";
  const mtRaw = typeof process.env.AI_MAX_TOKENS_CLASSIFIER === "string" ? process.env.AI_MAX_TOKENS_CLASSIFIER.trim() : "";
  const tempRaw =
    typeof process.env.AI_TEMPERATURE_CLASSIFIER === "string" ? process.env.AI_TEMPERATURE_CLASSIFIER.trim() : "";
  const max_tokens = mtRaw ?
      (Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ? Math.floor(Number(mtRaw)) : 3500)
    : 3500;
  const temperature =
    tempRaw && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : 0.05;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}

/** Message utilisateur : dossier formulaire + schéma JSON (UI dashboard). */
export function buildAIActClassifierPrompt(data: {
  system_name: string;
  description: string;
  use_case: string;
  sector: string;
  decision_impact: string;
  data_types: string;
  deployment: string;
  is_public: boolean;
}): string {
  const esc = JSON.stringify(data.system_name);
  return `# DOSSIER POUR CLASSIFICATION

Ce dossier est un **formulaire structuré** : appliquez l'arbre de décision (Parties 2 à 5 du prompt système) et **classifiez sans** rejouer intégralement le questionnaire d'intake papier — sauf si des zones d'incertitude critiques subsistent (\`uncertainty_zones\` + \`intake_followup_questions\`).

## Fiche dossier

| Champ | Réponse |
| --- | --- |
| Nom du système | ${data.system_name} |
| Secteur | ${data.sector} |
| Description fonctionnelle | ${data.description} |
| Finalité / cas d'usage | ${data.use_case} |
| Impact des décisions sur les personnes | ${data.decision_impact || "Non précisé"} |
| Données traitées | ${data.data_types || "Non précisé"} |
| Déploiement | ${data.deployment || "Non précisé"} |
| Contexte sectoriel public ou service public | ${data.is_public ? "Oui" : "Non"} |

Date du droit de référence pour les délais IA Act : conformément au prompt système (anti-hallucination délais).

---

## SORTIE À PRODUIRE

Répondez **uniquement** avec un objet JSON suivant ce schéma (types indiqués) :

{
  "system_name": ${esc},
  "classification": "Inacceptable|Haut risque|Risque limité|Risque minimal",
  "legal_basis": "Articles et annexes applicables avec références exactes et conditions clés reliées aux faits (2-7 phrases).",
  "classification_justification": "Raisonnement de classification en 5-8 phrases (Étapes 0-5), avec distinctions fournisseur/déployeur si pertinent.",
  "decision_tree_trace": {
    "step_0_ai_system_under_act": "<in_champ ou hors champ + technique Annexe I si pertinent>",
    "step_1_exclusions_art2": "<exclusions militaire/scientifique/etc.>",
    "step_2_gpai": "<GPAI oui/non + régime GPAI succinct Art. 51-56 etc.>",
    "step_3_art5_prohibited": "<pratiques (a)-(h) vérifiées ; si match, préciser littérale>",
    "step_4_high_risk_art6": "<Voie Annexe harmonisée §6(1) et/ou Annexe III §N ; sinon Art. 6(3) éventuelle>",
    "step_5_art50_transparency": "<paragraphes 50(1)-(4) mobilisés ou « aucune »>",
    "result_label": "<doit refléter la même chose que classification>"
  },
  "risk_category_detail": "<sous-catégorie précise si haut risque ; sinon succinct ou null>",
  "prohibited": <boolean>,
  "prohibited_article": "<Art. 5(1)(a)-(h) exact si prohibited true ; sinon null>",
  "prohibited_reason": "<si prohibited : motivation + trois conditions cumulatives quand requis ; sinon null>",
  "high_risk_annex": "<référencé si haut risque : Art. 6(1)/(2) + point Annexe III ; sinon null>",
  "annexIII_point": "<ex. §4(a)|null>",
  "art6_route": "<Annexe_I_harmonisée|Annexe_III_art6_2|null>",
  "gpai": <boolean>,
  "gpai_notes": "<obligations Art. 53-55 si pertinent ; court paragraphe ou null>",
  "uncertainty_zones": ["..."],
  "intake_followup_questions": null | [ "question résiduelle éventuelle ..." ],
  "fiche_classification_markdown": "Reprise structurée de la Partie 3 (🔹 fiche) en Markdown : SYSTÈME ANALYSÉ, CLASSIFICATION, BASE LÉGALE, RAISONNEMENT, VARIABLES SELON CATÉGORIE (interdit/haut risque/transparence/minimal selon résultat), ZONES D'INCERTITUDE, ACTIONS, COÛTS ESTIMÉS, disclaimer légal conforme.",
  "cost_estimate_table_markdown": "Tableau Markdown ou liste des postes/coûts (Parties 5) adapté à la classification, avec montants MIN-MAX indicatifs et mention facteurs d'ajustement.",
  "estimated_compliance_cost_eur_min": <nombre|null>,
  "estimated_compliance_cost_eur_max": <nombre|null>,
  "sandbox_suggestion": "1-2 pistes pour mode sandbox (« et si vous ajoutiez X ? »).",
  "rgpd_overlap_note": "Si données personnelles : interaction RGPD succincte ; sinon « Non applicable décrit comme tel ».",
  "obligations": [
    {
      "obligation": "<titre>",
      "article": "<réf précise>",
      "description": "<courte> Préciser si fournisseur, déployeur ou les deux.",
      "effort": "low|medium|high",
      "deadline": "<réf délais Partie 4/8>",
      "applicable": <boolean>
    }
  ],
  "conformity_assessment": null | {
    "method": "auto-évaluation|organisme notifié|non applicable",
    "article": "ex. Art. 43",
    "estimated_cost": "fourchette indicative",
    "estimated_duration": "durée indicative"
  },
  "registration_required": <boolean|null>,
  "registration_article_note": "<ex. Art. 49 EU database|null>",
  "ce_marking_required": <boolean>,
  "transparency_obligations": ["<obligation si Risque limité / Art. 50 pertinent>"],
  "recommended_actions": [
    {"priority": 1, "action": "<action>", "deadline": "<délai>", "article_ref": "<art.>"}
  ],
  "compliance_score_estimate": <0-100 entier|null>,
  "sandbox_eligible": <boolean|null>
}`;
}

/**
 * Génère la classification AI Act avec le prompt « Classifieur — Sandbox réglementaire »
 * et des paramètres déterministes (température basse ; max_tokens surchargeable).
 */
export async function generateAiActClassifierDocument(prompt: string, ctx?: BillingContext): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = classifierAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getAiActClassifierSystemPrompt(),
    messages: [{ role: "user", content: prompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

// ─── Compliance Checklist (interactive roadmap) ───────────────────────────────

export interface ComplianceChecklistIntake {
  regulation: string;
  company_size: string;
  sector: string;
  specific_context: string;
  organization_name?: string;
  activity_sector_detail?: string;
  ops_country?: string;
  ia_role?: string;
  system_types?: string;
  ai_act_classification?: string;
  personal_data?: string;
  compliance_maturity?: string;
  milestones_done?: string;
  priority_deadline?: string;
  compliance_resources?: string;
}

function checklistString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/** Accepte l’ancien corps API + questionnaire étendu (champs optionnels). */
export function normalizeComplianceChecklistBody(raw: Record<string, unknown>): ComplianceChecklistIntake {
  return {
    regulation:
      checklistString(raw, "regulation") ||
      "Multi-textes UE (AI Act, RGPD, NIS2, DSA, DMA, Data Act — selon applicabilité)",
    company_size: checklistString(raw, "company_size"),
    sector: checklistString(raw, "sector"),
    specific_context: checklistString(raw, "specific_context"),
    organization_name: checklistString(raw, "organization_name", "organisation_name") || undefined,
    activity_sector_detail: checklistString(raw, "activity_sector_detail") || undefined,
    ops_country: checklistString(raw, "ops_country", "organization_primary_country") || undefined,
    ia_role: checklistString(raw, "ia_role", "organization_ia_role") || undefined,
    system_types: checklistString(raw, "system_types", "ia_system_types") || undefined,
    ai_act_classification:
      checklistString(raw, "ai_act_classification", "ai_act_class", "classification_ai_act") || undefined,
    personal_data: checklistString(raw, "personal_data", "personal_data_detail") || undefined,
    compliance_maturity: checklistString(raw, "compliance_maturity", "maturity") || undefined,
    milestones_done: checklistString(raw, "milestones_done", "already_done") || undefined,
    priority_deadline:
      checklistString(raw, "priority_deadline", "deadline_focus", "echeance_prioritaire") || undefined,
    compliance_resources:
      checklistString(raw, "compliance_resources", "resources_available", "resources") || undefined,
  };
}

export function buildComplianceChecklistUserPrompt(data: ComplianceChecklistIntake): string {
  const cell = (v: string | undefined) => (v && v.trim() ? v.trim() : "[Non précisé]");

  return `# DONNÉES D'INTAKE — CHECKLIST DE CONFORMITÉ INTERACTIVE

Synthétisez un **artifact JSON unique** exploitation-ready pour l’application CompliAI.
Respectez **strictement** le fichier métier du prompt système : sélection d’items selon profil (**G1**), dates (**G2**), outils (**G3**), responsables (**G4**), validations (**G5**), liste des exclusions (**G6** équivalent partie « non_applicable_exclusions »).

## Section A — Organisation

| Question | Réponse |
| --- | --- |
| Règlement / focus réglementaire (choix utilisateur) | ${cell(data.regulation)} |
| Dénomination / projet (si fourni) | ${cell(data.organization_name)} |
| Secteur d’activité principal | ${cell(data.sector)} |
| Détail secteur (« Autre » ou précisions) | ${cell(data.activity_sector_detail)} |
| Taille | ${cell(data.company_size)} |
| Pays principal d’opération (État membre UE) | ${cell(data.ops_country)} |
| Rôle IA (fournisseur / déployeur / les deux / GPAI) | ${cell(data.ia_role)} |

## Section B — Systèmes IA

| Question | Réponse |
| --- | --- |
| Types / familles de systèmes IA (liste libre ou cases cochées côté client) | ${cell(data.system_types)} |
| Classification AI Act déclarée | ${cell(data.ai_act_classification)} |
| Données personnelles traitées ? (et catégories) | ${cell(data.personal_data)} |

## Section C — Avancement

| Question | Réponse |
| --- | --- |
| Maturité démarche conformité | ${cell(data.compliance_maturity)} |
| Actions déjà réalisées | ${cell(data.milestones_done)} |

## Section D — Priorités & ressources

| Question | Réponse |
| --- | --- |
| Échéance / priorité forte | ${cell(data.priority_deadline)} |
| Ressources disponibles | ${cell(data.compliance_resources)} |

## Contexte narratif complémentaire

${cell(data.specific_context)}

---

${COMPLIANCE_CHECKLIST_JSON_SPEC}

Instructions finales :
- **checklist_id** : laissez une chaîne vide \`""\` — le serveur injectera un UUID stable pour la persistance client.
- Calculez \`total_items\` exactement comme le nombre d’objets dans \`categories[].items\` après filtrage profil (G1).
- Renseignez \`non_applicable_exclusions[]\` avec **au moins une** ligne par grande zone exclue (ex. « F-GPAI non retenu : rôle différent », « NIS2 : secteur hors champ »).
`;
}

export function buildChecklistPrompt(data: Record<string, unknown>): string {
  return buildComplianceChecklistUserPrompt(normalizeComplianceChecklistBody(data));
}

function checklistAnthropicParams(): { model: string; max_tokens: number; temperature: number } {
  const modelEnv =
    typeof process.env.AI_CHECKLIST_MODEL === "string" ? process.env.AI_CHECKLIST_MODEL.trim() : "";
  const mtRaw =
    typeof process.env.AI_MAX_TOKENS_COMPLIANCE_CHECKLIST === "string" ?
      process.env.AI_MAX_TOKENS_COMPLIANCE_CHECKLIST.trim()
    : "";
  const tempRaw =
    typeof process.env.AI_TEMPERATURE_COMPLIANCE_CHECKLIST === "string" ?
      process.env.AI_TEMPERATURE_COMPLIANCE_CHECKLIST.trim()
    : "";

  const max_tokens =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ? Math.floor(Number(mtRaw)) : 4000;

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : 0.1;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}

export async function generateComplianceChecklistDocument(prompt: string, ctx?: BillingContext, systemAddendum = ""): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = checklistAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getComplianceChecklistSystemPrompt() + systemAddendum,
    messages: [{ role: "user", content: prompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

// ─── Jurisprudence Analyzer (EU) — export prompt builder + générateur dédié ─
export async function generateJurisprudenceAnalysisDocument(prompt: string, ctx?: BillingContext, systemAddendum = ""): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = jurisprudenceAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getJurisprudenceAnalyzerSystemPrompt() + systemAddendum,
    messages: [{ role: "user", content: prompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

export {
  buildJurisprudenceAnalyzerPrompt,
  getJurisprudenceAnalyzerSystemPrompt,
  jurisprudenceAnthropicParams,
} from "./prompts/jurisprudence-eu-analyzer";

// ─── Recherche jurisprudentielle EU ────────────────────────────────────────────

export type { RechercheJpIntake };

export function buildRechercheJurisprudentiellePrompt(intake: RechercheJpIntake): string {
  return buildRechercheJurisprudentielleUserPrompt(intake);
}

export async function generateRechercheJurisprudentielleDocument(prompt: string, ctx?: BillingContext): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = rechercheJpAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getRechercheJurisprudentielleSystemPrompt(),
    messages: [{ role: "user", content: prompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

/** Mappe les fiches panorama vers l’ancien schéma UI si besoin. */
export function normalizeRechercheJpForClient(parsed: Record<string, unknown>): Record<string, unknown> {
  const c = { ...parsed };
  const decisions = Array.isArray(c.decisions) ? (c.decisions as Record<string, unknown>[]) : [];
  const mapped = decisions.map(d => ({
    ecli: d.ecli ?? d.reference ?? "",
    titre: d.reference ?? d.en_une_ligne ?? "",
    juridiction: d.juridiction ?? "",
    date: d.date ?? "",
    parties: d.parties ?? "",
    theme: d.en_une_ligne ?? "",
    faits_resume: d.ce_que_la_juridiction_a_decide ?? "",
    solution: d.apport_au_droit_positif ?? "",
    articles_appliques: Array.isArray(d.textes_eu_interpretes) ? d.textes_eu_interpretes : [],
    portee: d.implication_pratique ?? "",
    pertinence: typeof d.importance === "number" ? Math.min(100, d.importance * 33) : 80,
    importance: d.importance,
    type_decision: d.type_decision,
    formation: d.formation,
    rag_source: d.rag_source,
  }));
  if (!c.synthese_thematique && Array.isArray(c.etat_du_droit) && c.etat_du_droit.length) {
    c.synthese_thematique = (c.etat_du_droit as string[]).join(" ");
  }
  c.decisions = mapped;
  c.decisions_panorama = decisions;
  return c;
}

export {
  buildRechercheJurisprudentielleUserPrompt,
  getRechercheJurisprudentielleSystemPrompt,
  rechercheJpAnthropicParams,
} from "./prompts/recherche-jurisprudentielle";

/**
 * Génère un document JSON-only via Claude (prompt système générique — pas l’analyseur JP).
 *
 * On conserve volontairement un system prompt JSON strict ici (et pas le
 * MASTER_SYSTEM_PROMPT) parce que les prompts de génération exigent une
 * sortie strictement JSON, sans clôture juridique ni prose introductive.
 * Le MASTER_SYSTEM_PROMPT et la clôture obligatoire s'appliquent dans le
 * consultant chat et dans le rendu PDF côté front, pas au format brut.
 */
export async function generateDocument(prompt: string, ctx?: BillingContext, systemAddendum = ""): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await messagesCreateWithBilling(anthropic, {
    model: AI_CONFIG.model,
    max_tokens: 8192,
    temperature: 0.1,
    system:
      "Tu agis comme un juriste senior parisien spécialisé en droit européen du numérique (AI Act, RGPD, NIS2, DSA, DMA, CRA, Data Act, PLD révisée, STCE 225). Tu produis ici un document structuré au format JSON strict, sans aucune prose hors JSON. Tu ne fabriques ni numéro d'article, ni sanction, ni jurisprudence. Tu commences ta réponse par { et tu la termines par }." + systemAddendum,
    messages: [{ role: "user", content: prompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

/**
 * Première tranche `{…}` bien parenthésée hors chaînes JSON (corrige prose après le JSON ou un `}`
 * ambigu avec l’ancien lastIndexOf).
 */
function sliceBalancedRootJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === "\"") inString = false;
      continue;
    }
    if (c === "\"") {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }

  return null;
}

export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {/* continue */}

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {/* continue */}
    try {
      const inner = sliceBalancedRootJsonObject(fenceMatch[1]);
      if (inner) return JSON.parse(inner);
    } catch {/* continue */}
  }

  const balanced = sliceBalancedRootJsonObject(trimmed);
  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch {/* continue */}
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch {/* continue */}
  }

  throw new Error("Impossible d'extraire un JSON valide de la réponse Claude.");
}

// ─── Résumé d'arrêts et commentaires guidés (étudiants) ───────────────────────

export type { ResumeArretMode, ResumeArretNiveau } from "./prompts/arrets-guide";

export {
  buildResumeArretUserPrompt,
  buildArretsGuideDialoguePrefix,
  getArretsGuideSystemPrompt,
  getResumeArretJsonSystemPrompt,
  resumeArretAnthropicParams,
} from "./prompts/arrets-guide";

export async function generateResumeArretDocument(prompt: string, prose = false, ctx?: BillingContext): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = resumeArretAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: prose ? getArretsGuideSystemPrompt() : getResumeArretJsonSystemPrompt(),
    messages: [{ role: "user", content: prompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

/** Compat UI historique + champs v2 sens/valeur/portée. */
export function normalizeResumeArretForClient(parsed: Record<string, unknown>): Record<string, unknown> {
  const out = { ...parsed };
  const fiche = (out.fiche && typeof out.fiche === "object" ? out.fiche : {}) as Record<string, unknown>;
  const svp =
    out.sens_valeur_portee && typeof out.sens_valeur_portee === "object" ?
      (out.sens_valeur_portee as Record<string, unknown>)
    : {};

  if (!fiche.solution && (fiche.solution_dispositif || fiche.solution_motifs)) {
    const parts = [fiche.solution_dispositif, fiche.solution_motifs].filter(Boolean);
    fiche.solution = parts.join("\n\n");
  }
  if (!fiche.portee && svp.portee) {
    fiche.portee = String(svp.portee);
  }
  if (!fiche.reference && out.reference) {
    fiche.reference = out.reference;
  }

  const commentaire =
    out.commentaire && typeof out.commentaire === "object" ?
      (out.commentaire as Record<string, unknown>)
    : null;

  if (commentaire && !commentaire.problematique && commentaire.etapes) {
    const etapes = commentaire.etapes as Record<string, unknown>;
    if (typeof etapes.probleme_droit === "string") {
      commentaire.problematique = etapes.probleme_droit;
    }
  }

  out.fiche = fiche;
  if (commentaire) out.commentaire = commentaire;
  return out;
}

export function buildResumeArretGenerationPrompt(opts: {
  text: string;
  mode: ResumeArretMode;
  niveau?: ResumeArretNiveau;
  reference?: string;
}): string {
  return buildResumeArretUserPrompt(opts);
}

// ─── Quiz droit EU — étudiants ─────────────────────────────────────────────────

export type { QuizEtudiantExamMode, QuizEtudiantNiveau } from "./prompts/quiz-eu-etudiants";

export {
  buildQuizEtudiantsUserPrompt,
  getQuizEuEtudiantsSystemPrompt,
  LEGAL_TOOLS_QUIZ_GENERATION_SYSTEM,
  LEGAL_TOOLS_QUIZ_REFINEMENT_SYSTEM,
  quizEtudiantsAnthropicParams,
} from "./prompts/quiz-eu-etudiants";

import {
  buildQuizEtudiantsUserPrompt,
  LEGAL_TOOLS_QUIZ_GENERATION_SYSTEM,
  LEGAL_TOOLS_QUIZ_REFINEMENT_SYSTEM,
  quizEtudiantsAnthropicParams,
  type QuizEtudiantExamMode,
} from "./prompts/quiz-eu-etudiants";

function extractFirstJsonObject(raw: string): string | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0] ?? null;
}

export async function generateQuizEtudiantsDocument(opts: {
  topic: string;
  niveau: string;
  count: number;
  examMode?: QuizEtudiantExamMode;
  nationalRagContext?: string;
  billing?: BillingContext;
}): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let userPrompt = buildQuizEtudiantsUserPrompt({
    topic: opts.topic,
    niveau: opts.niveau,
    count: opts.count,
    examMode: opts.examMode,
  });
  if (opts.nationalRagContext?.trim()) {
    userPrompt += `\n\n## Corpus indexé\n\n${opts.nationalRagContext}\n`;
  }

  const genParams = quizEtudiantsAnthropicParams("generate");
  const draftRes = await messagesCreateWithBilling(anthropic, {
    model: genParams.model,
    max_tokens: genParams.max_tokens,
    temperature: genParams.temperature,
    system: LEGAL_TOOLS_QUIZ_GENERATION_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  }, opts.billing);
  const draftRaw = draftRes.content[0].type === "text" ? draftRes.content[0].text : "";
  const draftJson = extractFirstJsonObject(draftRaw);
  if (!draftJson) throw new Error("Réponse IA invalide (génération du quiz)");

  const refineParams = quizEtudiantsAnthropicParams("refine");
  const refineUser =
    "Voici le BROUILLON de quiz (JSON). Appliquez le PASSAGE 2 : relecture juridique précise. Réponse : uniquement le JSON final, même schéma.\n\n" +
    draftJson;

  const refineRes = await messagesCreateWithBilling(anthropic, {
    model: refineParams.model,
    max_tokens: refineParams.max_tokens,
    temperature: refineParams.temperature,
    system: LEGAL_TOOLS_QUIZ_REFINEMENT_SYSTEM,
    messages: [{ role: "user", content: refineUser }],
  }, opts.billing);
  const refineRaw = refineRes.content[0].type === "text" ? refineRes.content[0].text : "";
  const finalJson = extractFirstJsonObject(refineRaw);
  return finalJson ?? draftJson;
}

/** Normalise les champs optionnels v2 pour l'UI. */
export function normalizeQuizEtudiantsForClient(parsed: Record<string, unknown>): Record<string, unknown> {
  const questions = Array.isArray(parsed.questions) ? (parsed.questions as Record<string, unknown>[]) : [];
  const mapped = questions.map((q, i) => ({
    ...q,
    id: typeof q.id === "number" ? q.id : i + 1,
    why_others_wrong: Array.isArray(q.why_others_wrong) ? q.why_others_wrong : [],
    legal_reasoning:
      q.legal_reasoning && typeof q.legal_reasoning === "object" ? q.legal_reasoning : undefined,
    common_trap: typeof q.common_trap === "string" ? q.common_trap : "",
  }));
  return { ...parsed, questions: mapped };
}

// ─── Simulateur de cas pratique ───────────────────────────────────────────────

export type {
  SimulateurFormat,
  SimulateurNiveau,
  SimulateurTheme,
} from "./prompts/simulateur-cas-pratique";

export {
  buildSimulateurEvaluateUserPrompt,
  buildSimulateurFollowUpUserPrompt,
  buildSimulateurStartUserPrompt,
  getSimulateurCasPratiqueSystemPrompt,
  parseSimulateurScenarioId,
  parseSimulateurScore,
  simulateurAnthropicParams,
} from "./prompts/simulateur-cas-pratique";

import {
  buildSimulateurEvaluateUserPrompt,
  buildSimulateurFollowUpUserPrompt,
  buildSimulateurStartUserPrompt,
  getSimulateurCasPratiqueSystemPrompt,
  simulateurAnthropicParams,
} from "./prompts/simulateur-cas-pratique";

export async function generateSimulateurCasPratiqueDocument(userPrompt: string, ctx?: BillingContext): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = simulateurAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getSimulateurCasPratiqueSystemPrompt(),
    messages: [{ role: "user", content: userPrompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

// ─── Comparateur législations UE-27 ───────────────────────────────────────────

export type { ComparateurFocus } from "./prompts/comparateur-legislations";

export {
  buildComparateurCompareUserPrompt,
  buildComparateurPanoramaUserPrompt,
  buildComparateurRegistryContext,
  getComparateurLegislationsSystemPrompt,
  comparateurAnthropicParams,
  resolveCountryLabel,
} from "./prompts/comparateur-legislations";

import {
  buildComparateurCompareUserPrompt,
  buildComparateurPanoramaUserPrompt,
  getComparateurLegislationsSystemPrompt,
  comparateurAnthropicParams,
} from "./prompts/comparateur-legislations";

export async function generateComparateurLegislationsDocument(userPrompt: string, ctx?: BillingContext): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { model, max_tokens, temperature } = comparateurAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getComparateurLegislationsSystemPrompt(),
    messages: [{ role: "user", content: userPrompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

export function normalizeComparateurForClient(parsed: Record<string, unknown>): Record<string, unknown> {
  const out = { ...parsed };
  if (!Array.isArray(out.tableau)) out.tableau = [];
  if (!Array.isArray(out.points_convergence)) out.points_convergence = [];
  if (!Array.isArray(out.points_divergence)) out.points_divergence = [];
  if (!Array.isArray(out.divergences_cles)) out.divergences_cles = [];
  if (!Array.isArray(out.sources)) out.sources = [];
  if (!Array.isArray(out.limitations)) out.limitations = [];
  return out;
}

// ─── Générateur de clauses contractuelles IA ──────────────────────────────────

export type { ClausesIaIntake, ClausesIaNiveau, ClausesIaType } from "./prompts/generateur-clauses-ia";

export {
  buildGenerateurClausesIaUserPrompt,
  CLAUSES_IA_AVERTISSEMENT,
  getGenerateurClausesIaSystemPrompt,
  generateurClausesIaAnthropicParams,
} from "./prompts/generateur-clauses-ia";

import {
  buildGenerateurClausesIaUserPrompt,
  getGenerateurClausesIaSystemPrompt,
  generateurClausesIaAnthropicParams,
  type ClausesIaIntake,
} from "./prompts/generateur-clauses-ia";

export async function generateClausesIaDocument(
  intake: ClausesIaIntake,
  nationalRagContext?: string,
  ctx?: BillingContext,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let userPrompt = buildGenerateurClausesIaUserPrompt(intake);
  if (nationalRagContext?.trim()) {
    userPrompt += `\n\n## Corpus national indexé\n\n${nationalRagContext}\n`;
  }
  const { model, max_tokens, temperature } = generateurClausesIaAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getGenerateurClausesIaSystemPrompt(),
    messages: [{ role: "user", content: userPrompt }],
  }, ctx);
  return message.content[0].type === "text" ? message.content[0].text : "";
}

export function normalizeClausesIaForClient(parsed: Record<string, unknown>): Record<string, unknown> {
  const out = { ...parsed };
  if (!Array.isArray(out.clauses)) out.clauses = [];
  if (!Array.isArray(out.notes_personnalisation)) out.notes_personnalisation = [];
  if (!Array.isArray(out.annexes_recommandees)) out.annexes_recommandees = [];
  if (!Array.isArray(out.checklist_livraison)) out.checklist_livraison = [];
  const clauses = (out.clauses as Record<string, unknown>[]).map((c) => ({
    ...c,
    placeholders: Array.isArray(c.placeholders) ? c.placeholders : [],
  }));
  out.clauses = clauses;
  return out;
}

// ─── Analyseur de décisions d'autorités ───────────────────────────────────────

export type { AnalyseurDecisionProfil } from "./prompts/analyseur-decisions-autorites";

export {
  analyseurDecisionsAnthropicParams,
  buildAnalyseurDecisionsUserPrompt,
  getAnalyseurDecisionsAutoritesSystemPrompt,
  parseAnalyseurDecisionHeadline,
} from "./prompts/analyseur-decisions-autorites";

import {
  analyseurDecisionsAnthropicParams,
  buildAnalyseurDecisionsUserPrompt,
  getAnalyseurDecisionsAutoritesSystemPrompt,
  type AnalyseurDecisionProfil,
} from "./prompts/analyseur-decisions-autorites";

export {
  buildMemoireConformiteUserPrompt,
  buildAuditQrUserPrompt,
  buildPlanMemoireUserPrompt,
  buildExplicationArticleUserPrompt,
  buildInvestorReportPrompt,
} from "./prompts/tool-user-prompts";

export async function generateAnalyseurDecisionsDocument(opts: {
  texteDecision: string;
  profil: AnalyseurDecisionProfil;
  reference?: string;
  nationalRagContext?: string;
  billing?: BillingContext;
}): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let userPrompt = buildAnalyseurDecisionsUserPrompt(opts);
  if (opts.nationalRagContext?.trim()) {
    userPrompt += `\n\n## Corpus indexé\n\n${opts.nationalRagContext}\n`;
  }
  const { model, max_tokens, temperature } = analyseurDecisionsAnthropicParams();
  const message = await messagesCreateWithBilling(anthropic, {
    model,
    max_tokens,
    temperature,
    system: getAnalyseurDecisionsAutoritesSystemPrompt(),
    messages: [{ role: "user", content: userPrompt }],
  }, opts.billing);
  return message.content[0].type === "text" ? message.content[0].text : "";
}
