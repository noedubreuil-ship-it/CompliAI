/**
 * Analyseur de jurisprudence UE — méthode « sens · valeur · portée » (addendum académique v2).
 */
import { AI_CONFIG } from "../config";
import {
  USER_PROMPT_CAHIER_REMINDER,
  loadPromptMarkdown,
  withPromptApplicationFooter,
} from "./load-prompt-markdown";

const PROMPT_FILE = "jurisprudence-eu-commentaire-addendum-v2.md";

export function getJurisprudenceEuCommentaireMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

export function getJurisprudenceAnalyzerSystemPrompt(): string {
  return withPromptApplicationFooter(`${getJurisprudenceEuCommentaireMarkdown()}

---

## Instructions techniques de sortie

- Réponds **exclusivement** avec un **unique objet JSON** valide — aucune prose hors JSON, pas de blocs \`\`\`.
- Commence par \`{\` et termine par \`}\`.
- **Ne fabrique pas** d'ECLI, de dates d'arrêt, de numéros d'affaire ou d'articles dont tu n'as pas une base factuelle (texte fourni ou connaissance certaine). En cas de doute : indique-le dans \`limitations_sources\` et baisse \`legal_certainty\`.
- Le bloc **commentaire_axes** est **obligatoire** et doit développer les § 3 (sens), § 3bis (valeur avec prise de position), § 3ter (portée), conformément aux règles M1–M5 du fichier métier ci-dessus.
- Les champs classiques (\`eu_legal_context\`, \`practical_implications\`, etc.) complètent le commentaire ; évite les contradictions majeures entre \`commentaire_axes\` et le reste.
`);
}

const MAX_INPUT_CHARS = 12_000;

export function buildJurisprudenceAnalyzerPrompt(data: {
  reference: string;
  text: string;
  analysis_focus: string;
}): string {
  const focusInstruction = data.analysis_focus ?
    `L'utilisateur souhaite une analyse particulièrement axée sur : ${data.analysis_focus}.`
  : "";

  const refEsc = JSON.stringify(data.reference || "Décision analysée");
  const snippet = data.text.slice(0, MAX_INPUT_CHARS);

  return `${USER_PROMPT_CAHIER_REMINDER}Tu commentes la décision suivante selon une **méthode académique appliquée au droit de l'Union européenne** : trois axes obligatoires dans \`commentaire_axes\` — **sens** (§ 3), **valeur** (§ 3bis, avec prise de position), **portée** (§ 3ter).

Tu analyses EXCLUSIVEMENT sous l'angle du droit européen et des sources connexes pertinentes (primauté Charte UE / TFUE / droit dérivé / CJUE / CEDH / EDPB / DPA lorsque EU-law pertinent).

---

## DÉCISION À ANALYSER

- Référence : ${data.reference || "Non précisée"}
- Texte / contenu (extrait) :

${snippet}

${focusInstruction}

---

Réponds UNIQUEMENT avec ce JSON (schéma obligatoire — adapte les chaînes ; tableaux peuvent être vides uniquement si aucune donnée vérifiable, en l'explicitant dans limitations_sources) :

{
  "reference": ${refEsc},
  "limitations_sources": ["Indiquer ici tout ce qui repose sur une lecture partielle du texte ou sur une incertitude du modèle"],
  "title": "<titre court et précis de la décision>",
  "juridiction": "<CJUE|CEDH|Tribunal UE|CNIL|DPC|BfDI|APD|AEPD|Cour nationale|Autre>",
  "date": "<date de la décision>",
  "parties": "<parties en présence>",
  "ecli": "<numéro ECLI si vérifiable depuis le texte ou référence certaine, sinon null>",
  "executive_summary": "<résumé exécutif en 3-4 phrases : faits essentiels, problème juridique, solution, portée>",
  "commentaire_axes": {
    "section_1_identification_contexte": "<§ 1 — juridiction, formation si identifiable, renvoi préjudiciel ou procédure, enjeu dans le paysage EU>",
    "section_2_faits_procedure_eu": "<§ 2 — faits et procédure strictement utiles au droit EU>",
    "section_3_sens": {
      "syllogisme": {
        "majeure": "<règle de droit EU — citation précise>",
        "mineure": "<faits qualifiés juridiquement>",
        "conclusion": "<solution abstraite>"
      },
      "notions_centrales": [
        {
          "notion": "",
          "definition_ue": "",
          "interpretation_retenue": "",
          "nouveau_ou_confirme": "<nouvelle | confirmée | nuancée>"
        }
      ],
      "position_droit_anterieur": {
        "categorie": "<premiere_decision | revirement | confirmation | nuance | application_inedite_texte_recent>",
        "developpement": "<avec références JP ou doctrinales EU pertinentes si tu les tiens avec certitude ; sinon signaler le doute>"
      },
      "methode_interpretation": "<littérale / systémique / téléologique-effet utile / proportionnalité CEDH / combinée — expliquer brièvement>"
    },
    "section_3bis_valeur": {
      "pertinence_juridique": {
        "niveau": "<conforme | partiellement_critiquable | critiquable>",
        "developpement": "<argumentation motivée ; confrontation conclusions Avocat général si pertinent ; opinions dissidentes CEDH si pertinent>",
        "confrontation_ag_ou_dissidence": "<chaîne vide si sans objet>"
      },
      "pertinence_extra_juridique": {
        "economique": "",
        "social_et_droits_fondamentaux": "",
        "ethique_et_equilibre_valeurs": "",
        "coherence_institutions_contentieux": ""
      },
      "appreciation_globale_obligatoire": "<phrase de synthèse NON neutre — approuver / réserves / critique selon § 3bis>"
    },
    "section_3ter_portee": {
      "ratione_temporis": {
        "nature_de_l_arret": "<principe | espece | revirement | confirmatif>",
        "indices": "<formation, abstraction des motifs, Grande Chambre, etc.>",
        "suites_connues_ou_probables": "<adapter selon ancienneté de la décision — règle M4>"
      },
      "ratione_materiae": {
        "conditions_necessaires": ["..."],
        "situations_couvertes": ["..."],
        "situations_exclues": ["..."],
        "zones_ambiguës": ["..."]
      },
      "consequences_pour_justiciables": "",
      "consequences_pour_le_droit_positif_et_avvenir": ""
    },
    "section_4_dispositions_interpretées_table": [
      {
        "instrument": "<traité | règlement | directive | charte>",
        "articles": ["<Art. …>"],
        "lecture_retenue_par_la_juridiction": ""
      }
    ],
    "section_5_place_dans_la_jurisprudence_europeenne": "",
    "section_6_implications_pratiques_renvoi": "<court pont vers practical_implications — sans dupliquer tout le détail>",
    "section_7_ressources_compliai": [
      { "outil": "<ex: Consultant IA | RoPA | DPIA | Scanner web>", "chemin": "</dashboard/chat ou autre>", "usage": "" }
    ]
  },
  "eu_legal_context": {
    "applicable_regulations": [
      {
        "regulation": "<AI Act|RGPD|DSA|DMA|NIS2|DORA|TFUE|TUE|Charte UE|CEDH|Autre>",
        "celex": "<CELEX ou vide>",
        "articles": ["<Art. X>", "<Art. Y>"],
        "role": "<comment ce texte est appliqué dans la décision : 1-2 phrases>",
        "eurlex_url": "<URL EUR-Lex ou vide>"
      }
    ],
    "fundamental_rights": [
      {
        "right": "<droit fondamental en jeu>",
        "charter_article": "<Art. X Charte UE ou vide>",
        "cedh_article": "<Art. X CEDH si applicable>",
        "analysis": "<2-3 phrases>"
      }
    ],
    "key_principles": [
      {
        "principle": "<principe de droit EU>",
        "source": "<traité/règlement/jurisprudence>",
        "application": "<dans cette affaire>"
      }
    ]
  },
  "jurisprudence_map": [
    {
      "case": "<Nom de l'affaire>",
      "ecli": "<ECLI ou vide>",
      "court": "<CJUE|CEDH|Tribunal UE>",
      "date": "<année>",
      "relevance": "<lien avec la décision analysée>",
      "link_type": "confirme|distingue|étend|contredit|applique"
    }
  ],
  "regulatory_positions": [
    {
      "authority": "<EDPB|ENISA|AI Office|CNIL|…>",
      "document": "",
      "date": "",
      "position": "",
      "url": ""
    }
  ],
  "legal_analysis": {
    "facts": "<faits en 3-5 phrases>",
    "procedure": "<historique procédural>",
    "legal_issues": ["<question de droit>"],
    "reasoning": "<raisonnement détaillé de la juridiction>",
    "decision": "<dispositif>",
    "dissenting_opinions": "<opinions dissidentes ou null>"
  },
  "practical_implications": {
    "for_companies": [
      {
        "implication": "",
        "action_required": "",
        "urgency": "immediate|short_term|medium_term",
        "concerns": [""]
      }
    ],
    "for_dpos": "",
    "for_ai_systems": "",
    "financial_exposure": "",
    "compliance_actions": ["", "", ""]
  },
  "significance": {
    "scope": "local|national|EU|international",
    "importance": "landmark|significant|routine|informative",
    "novelty": "",
    "precedent_value": "",
    "open_questions": [""]
  },
  "related_developments": [
    {
      "type": "",
      "description": "",
      "url": ""
    }
  ],
  "overall_assessment": "",
  "legal_certainty": "high|medium|low",
  "disclaimer": "Cette analyse est générée par IA à titre informatif et ne constitue pas un avis juridique."
}`;
}

export function jurisprudenceAnthropicParams(): { model: string; max_tokens: number; temperature: number } {
  const modelEnv =
    typeof process.env.AI_JURISPRUDENCE_MODEL === "string" ? process.env.AI_JURISPRUDENCE_MODEL.trim() : "";
  const mtRaw =
    typeof process.env.AI_MAX_TOKENS_JURISPRUDENCE === "string" ? process.env.AI_MAX_TOKENS_JURISPRUDENCE.trim() : "";
  const max_tokens =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ?
      Math.min(16384, Math.floor(Number(mtRaw)))
    : 10_000;
  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature: 0.1 };
}
