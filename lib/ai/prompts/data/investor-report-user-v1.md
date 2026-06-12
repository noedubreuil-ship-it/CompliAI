# Rapport investisseurs — prompt utilisateur v1

Tu es un expert en due diligence IA et en conformité réglementaire. Génère un rapport de due diligence IA destiné aux investisseurs (VCs, PE) sur ce projet.

## DONNÉES DU PROJET

- Entreprise : {{COMPANY_NAME}}
- Système IA : {{PROJECT_NAME}}
- Verdict de conformité : {{VERDICT}}
- Niveau de risque : {{RISK_LEVEL}}
- Score de conformité : {{COMPLIANCE_SCORE}}/100
- Classification AI Act : {{AI_ACT_CLASSIFICATION}}
- Issues bloquantes : {{BLOCKING_ISSUES_COUNT}}
- Plan de conformité : {{ROADMAP_SUMMARY}}
- Estimation des coûts : {{COST_ESTIMATE}}

Produis un JSON valide (ne mets RIEN avant ni après) :
{
  "title": "Rapport de Due Diligence IA — {{PROJECT_NAME}}",
  "executive_summary": "<résumé exécutif en 3-4 phrases pour un investisseur>",
  "compliance_snapshot": {
    "score": {{COMPLIANCE_SCORE}},
    "verdict": "{{VERDICT}}",
    "risk_level": "{{RISK_LEVEL}}",
    "classification": "{{AI_ACT_CLASSIFICATION}}"
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
}
