import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "ropa-registre-art30-v1.md";

export function getRopaMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

const PRODUCT_JSON_SHELL = `
---

## INTERFACE COMPLIAI — ARTIFACT JSON ROPA (UNE SEULE RÉPONSE)

Répondez **exclusivement** avec un objet JSON valide conforme au schéma du **message utilisateur**.

- Aucune prose hors JSON, aucun bloc \`\`\` autour du JSON.
- Dernier caractère : \`}\` fermant l’objet racine.
- Champs inconnus : \`[À COMPLÉTER]\` ou \`null\` plutôt que des valeurs fictives.
`.trim();

export function getRopaSystemPrompt(): string {
  return withPromptApplicationFooter(`${getRopaMarkdown()}\n\n${PRODUCT_JSON_SHELL}`);
}

/** Schéma JSON demandé dans le message utilisateur (buildRopaUserPrompt). */
export const ROPA_OUTPUT_JSON_SPEC = `
## SCHÉMA JSON OBLIGATOIRE (ADAPTEZ AU MODE DU MESSAGE)

- **mode_applied** : reprendre \`register_batch\` | \`single_fiche\` | \`audit\`.
- **treatments[]** : tableau — une entrée en **single_fiche** ; 6–12 en **register_batch** ; en **audit** optionnel si vous ne reproduisez pas les fiches corrigées (alors **audit_report** détaillé).
- Compatibilité UI : chaque élément de **treatments** doit inclure au minimum : \`id\`, \`name\`, \`purpose\`, \`legal_basis\`, \`categories\` (tableau de chaînes), \`sensitive_data\` (booléen), \`data_subjects\`, \`retention\`, \`recipients\` (tableau), \`transfers_outside_eu\`, \`transfer_safeguards\`, \`security_measures\` (tableau), \`dpia_required\` (booléen).

Structure indicative :

{
  "title": "Registre des Activités de Traitement — [Organisation]",
  "mode_applied": "register_batch",
  "professional_disclaimer": "Avertissement — document indicatif ; validation DPO / juriste recommandée.",
  "controller": "",
  "company_overview": {
    "name": "",
    "sector": "",
    "size_band": "",
    "applicable_regulations": ["RGPD (UE) 2016/679"]
  },
  "dpo": { "name": "", "email": "" },
  "dpo_info": {
    "name": "",
    "email": "",
    "designation_required": false,
    "reason": ""
  },
  "version": "1.0",
  "last_updated": "",
  "next_review_date": "",
  "summary": {
    "total_treatments": 0,
    "treatments_with_sensitive_data": 0,
    "treatments_requiring_dpia": 0,
    "treatments_with_eu_transfers": 0,
    "treatments_with_ai": 0,
    "complete": 0,
    "to_update": 0,
    "incomplete": 0
  },
  "dashboard": {
    "watchlist": ["…"],
    "treatment_table_preview": [
      {
        "id": "T001",
        "name": "",
        "legal_basis_short": "",
        "sensitive": false,
        "dpia": "non|oui|à évaluer",
        "next_revision": "YYYY-MM-DD"
      }
    ]
  },
  "treatments": [
    {
      "id": "T001",
      "fiche_number": "2026-001",
      "role": "controller|processor|joint",
      "name": "",
      "purpose": "",
      "legal_basis": "",
      "departments": "",
      "categories": [],
      "sensitive_data": false,
      "article9_basis": null,
      "data_subjects": "",
      "retention": "",
      "recipients": [],
      "transfers_outside_eu": false,
      "transfer_safeguards": null,
      "security_measures": [],
      "dpia_required": false,
      "aipd_status": "non requise | requise | à évaluer",
      "automated_decisions_art22": false,
      "ai_act_note": null,
      "tool_links_hint": {
        "dpia": "/dashboard/tools/dpia",
        "contract": "/dashboard/tools/contracts",
        "ai_classifier": "/dashboard/tools/classifier"
      },
      "status": "complete|to_review|incomplete",
      "next_revision": ""
    }
  ],
  "security_measures": {
    "technical": [],
    "organizational": []
  },
  "audit_report": null,
  "notes": ""
}

**Mode audit** : remplir \`audit_report\` avec au minimum :
{
  "checks": [{ "criterion": "", "status": "ok|warn|fail", "detail": "" }],
  "gaps": [],
  "risks": [],
  "recommendations": []
}
`.trim();
