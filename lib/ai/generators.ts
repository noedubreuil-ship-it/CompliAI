import Anthropic from "@anthropic-ai/sdk";

// ─── Art. 11 Technical Documentation ─────────────────────────────────────────
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
  return `Tu es un expert en conformité AI Act. Génère la documentation technique obligatoire selon l'Article 11 et l'Annexe IV de l'AI Act UE 2024/1689 pour le système IA suivant.

SYSTÈME IA :
- Nom : ${data.system_name} v${data.version}
- Description : ${data.description}
- Objectif : ${data.purpose}
- Catégorie de risque : ${data.risk_category}
- Type de modèle : ${data.ai_model_type}
- Données d'entraînement : ${data.training_data}
- Secteur : ${data.sector}
- Fournisseur : ${data.provider}

Réponds UNIQUEMENT avec ce JSON (pas de texte avant ou après, pas de markdown) :
{
  "title": "Documentation Technique — ${data.system_name}",
  "sections": [
    {"id": "1", "title": "Description générale", "content": "2-3 phrases décrivant le système, ses objectifs et son architecture.", "article_ref": "Annexe IV, §1"},
    {"id": "2", "title": "Données d'entraînement", "content": "2-3 phrases sur la provenance, nature et volume des données.", "article_ref": "Annexe IV, §2"},
    {"id": "3", "title": "Architecture et algorithmes", "content": "2-3 phrases sur le type de modèle, le pipeline et les métriques.", "article_ref": "Annexe IV, §3"},
    {"id": "4", "title": "Cybersécurité et robustesse", "content": "2-3 phrases sur les mesures de sécurité et de robustesse.", "article_ref": "Art. 15 AI Act"},
    {"id": "5", "title": "Gestion des risques", "content": "2-3 phrases sur le processus de gestion des risques.", "article_ref": "Art. 9 AI Act"},
    {"id": "6", "title": "Supervision humaine", "content": "2-3 phrases sur les mécanismes de contrôle humain.", "article_ref": "Art. 14 AI Act"},
    {"id": "7", "title": "Transparence", "content": "2-3 phrases sur les obligations d'information.", "article_ref": "Art. 13 AI Act"},
    {"id": "8", "title": "Journalisation", "content": "2-3 phrases sur les logs et la traçabilité.", "article_ref": "Art. 12 AI Act"},
    {"id": "9", "title": "Conformité et certification", "content": "2-3 phrases sur l'évaluation de conformité et les certifications.", "article_ref": "Art. 43 AI Act"}
  ],
  "compliance_checklist": [
    {"item": "obligation 1", "status": "to_do", "ref": "article"},
    {"item": "obligation 2", "status": "to_do", "ref": "article"},
    {"item": "obligation 3", "status": "not_applicable", "ref": "article"}
  ],
  "next_steps": ["action 1", "action 2", "action 3"]
}

Remplace chaque valeur "content" par 2-3 phrases précises et pertinentes pour le système "${data.system_name}" dans le secteur "${data.sector}".`;
}

// ─── FRIA Art. 27 ─────────────────────────────────────────────────────────────
export function buildFRIAPrompt(data: {
  system_name: string;
  purpose: string;
  affected_population: string;
  fundamental_rights_at_stake: string[];
  sector: string;
  is_public_entity: boolean;
}): string {
  return `Tu es un expert en droits fondamentaux et en AI Act. Génère une Évaluation d'Impact sur les Droits Fondamentaux (FRIA) complète selon l'Article 27 de l'AI Act UE 2024/1689.

SYSTÈME ÉVALUÉ :
- Nom : ${data.system_name}
- Objectif : ${data.purpose}
- Population impactée : ${data.affected_population}
- Droits potentiellement affectés : ${data.fundamental_rights_at_stake.join(", ")}
- Secteur : ${data.sector}
- Entité publique : ${data.is_public_entity ? "Oui" : "Non"}

Réponds UNIQUEMENT avec ce JSON (pas de texte avant ou après) :
{
  "title": "FRIA — ${data.system_name}",
  "executive_summary": "2-3 phrases de résumé.",
  "rights_assessment": [
    {"right": "Droit 1", "charter_article": "Art. X", "impact_level": "medium", "description": "1-2 phrases.", "mitigation": "1-2 phrases."},
    {"right": "Droit 2", "charter_article": "Art. X", "impact_level": "high", "description": "1-2 phrases.", "mitigation": "1-2 phrases."},
    {"right": "Droit 3", "charter_article": "Art. X", "impact_level": "low", "description": "1-2 phrases.", "mitigation": "1-2 phrases."}
  ],
  "affected_groups": [
    {"group": "Groupe 1", "specific_risks": "1-2 phrases.", "protections": "1-2 phrases."}
  ],
  "overall_risk_level": "medium",
  "conclusion": "2-3 phrases.",
  "required_actions": ["action 1", "action 2"],
  "consultation_required": false
}

Remplace les valeurs génériques par du contenu précis pour "${data.system_name}" (population: ${data.affected_population}, secteur: ${data.sector}).`;
}

// ─── Employee AI Policy ───────────────────────────────────────────────────────
export function buildEmployeePolicyPrompt(data: {
  company_name: string;
  sector: string;
  ai_tools_used: string;
  employee_count: string;
}): string {
  return `Tu es un expert en droit du travail et en conformité AI Act. Génère une Politique d'Usage de l'IA pour les employés conforme à l'Article 4 (littératie IA) de l'AI Act et au RGPD.

ENTREPRISE :
- Nom : ${data.company_name}
- Secteur : ${data.sector}
- Outils IA utilisés : ${data.ai_tools_used}
- Nombre d'employés : ${data.employee_count}

Réponds UNIQUEMENT avec ce JSON (pas de texte avant ou après) :
{
  "title": "Politique d'Usage de l'IA — ${data.company_name}",
  "version": "1.0",
  "sections": [
    {"id": "1", "title": "Objet et champ d'application", "content": "2-3 phrases."},
    {"id": "2", "title": "Définitions", "content": "2-3 phrases."},
    {"id": "3", "title": "Usages autorisés", "content": "2-3 phrases listant les usages autorisés."},
    {"id": "4", "title": "Usages interdits", "content": "2-3 phrases listant les usages interdits."},
    {"id": "5", "title": "Protection des données personnelles", "content": "2-3 phrases sur le RGPD."},
    {"id": "6", "title": "Confidentialité", "content": "2-3 phrases."},
    {"id": "7", "title": "Responsabilité et supervision", "content": "2-3 phrases."},
    {"id": "8", "title": "Formation et littératie IA", "content": "2-3 phrases sur Art. 4 AI Act."},
    {"id": "9", "title": "Sanctions", "content": "2-3 phrases."}
  ],
  "key_rules": ["règle 1", "règle 2", "règle 3", "règle 4", "règle 5"]
}

Remplace chaque valeur par du contenu adapté à ${data.company_name} (secteur: ${data.sector}, outils: ${data.ai_tools_used}, employés: ${data.employee_count}).`;
}

// ─── Contract Analysis ────────────────────────────────────────────────────────
export function buildContractAnalysisPrompt(contractText: string, providerName: string): string {
  return `Tu es un expert en droit des contrats IA, RGPD et AI Act. Analyse le contrat de sous-traitance IA suivant et identifie les points de conformité et les risques.

FOURNISSEUR : ${providerName}

CONTRAT :
${contractText.slice(0, 8000)}

Produis un JSON valide (ne mets RIEN avant ni après) :
{
  "provider": "${providerName}",
  "risk_score": <entier 0-100, 0=très risqué, 100=conforme>,
  "overall_assessment": "<évaluation générale en 2-3 phrases>",
  "findings": [
    {
      "category": "<catégorie: RGPD|AI Act|Responsabilité|Propriété intellectuelle|Sécurité|Autre>",
      "type": "<compliant|risk|missing|recommendation>",
      "title": "<titre du point>",
      "description": "<description détaillée>",
      "regulation_ref": "<article applicable>",
      "severity": "<low|medium|high|critical>"
    }
  ],
  "missing_clauses": ["<clause obligatoire manquante 1>", "<clause obligatoire manquante 2>"],
  "recommended_amendments": ["<amendement recommandé 1>", "<amendement recommandé 2>"],
  "gdpr_compliant": <true|false>,
  "ai_act_compliant": <true|false>
}`;
}

// ─── Investor Report ──────────────────────────────────────────────────────────
export function buildInvestorReportPrompt(data: {
  company_name: string;
  project_name: string;
  verdict: string;
  risk_level: string;
  compliance_score: number;
  ai_act_classification: string;
  roadmap_summary: string;
  cost_estimate: string;
  blocking_issues_count: number;
}): string {
  return `Tu es un expert en due diligence IA et en conformité réglementaire. Génère un rapport de due diligence IA destiné aux investisseurs (VCs, PE) sur ce projet.

DONNÉES DU PROJET :
- Entreprise : ${data.company_name}
- Système IA : ${data.project_name}
- Verdict de conformité : ${data.verdict}
- Niveau de risque : ${data.risk_level}
- Score de conformité : ${data.compliance_score}/100
- Classification AI Act : ${data.ai_act_classification}
- Issues bloquantes : ${data.blocking_issues_count}
- Plan de conformité : ${data.roadmap_summary}
- Estimation des coûts : ${data.cost_estimate}

Produis un JSON valide (ne mets RIEN avant ni après) :
{
  "title": "Rapport de Due Diligence IA — ${data.project_name}",
  "executive_summary": "<résumé exécutif en 3-4 phrases pour un investisseur>",
  "compliance_snapshot": {
    "score": ${data.compliance_score},
    "verdict": "${data.verdict}",
    "risk_level": "${data.risk_level}",
    "classification": "${data.ai_act_classification}"
  },
  "key_risks": [
    {
      "risk": "<risque identifié>",
      "impact": "<impact sur la valeur/la croissance>",
      "mitigation": "<plan de mitigation>",
      "severity": "<low|medium|high|critical>"
    }
  ],
  "regulatory_roadmap": "<synthèse du plan de mise en conformité>",
  "cost_impact": "<analyse de l'impact financier de la conformité>",
  "competitive_advantage": "<avantages compétitifs liés à la conformité>",
  "recommendation": "<recommandation investisseur: invest_with_conditions|monitor|red_flag>",
  "conditions": ["<condition d'investissement 1>", "<condition 2>"]
}`;
}

export async function generateDocument(prompt: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 8192,
    system: "You are a JSON-only assistant. Output ONLY valid JSON. No markdown, no code fences, no explanation, no text before or after the JSON object. Start your response with { and end with }.",
    messages: [{ role: "user", content: prompt }],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}

export function extractJson(raw: string): unknown {
  // Try direct parse first
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {/* continue */}

  // Try extracting JSON block from markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {/* continue */}
  }

  // Try extracting the outermost { ... }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch {/* continue */}
  }

  throw new Error("Impossible d'extraire un JSON valide de la réponse Claude.");
}
