/**
 * Vérification post-génération des documents produits par les outils (DPIA, FRIA,
 * mémoire, etc.). Le chat consultant disposait déjà de `validateConsultantCitations`
 * + boucle de réécriture ; les générateurs n'avaient AUCUN contrôle programmatique
 * de leur sortie. Ce module comble ce trou (Axe 1) en RÉUTILISANT les primitives
 * existantes plutôt qu'en les dupliquant :
 *   - `validateConsultantCitations` : ECLI / arrêts inventés absents du contexte ;
 *   - `validateAIOutput` : numéros d'article hors plage (AI Act > 113, RGPD > 99),
 *     longueur anormale.
 *
 * Non bloquant par défaut : il REMONTE des anomalies (log/supervision) sans
 * altérer la sortie, pour une activation sûre en production. Le durcissement
 * (réécriture automatique comme le chat) est un chantier ultérieur, par outil.
 */
import { validateConsultantCitations } from "./consultant-citation-validator";
import { validateAIOutput } from "./guardrails";

export interface GeneratedDocumentVerification {
  ok: boolean;
  /** Anomalies sérieuses : citation inventée, en-tête interdit, article hors plage. */
  issues: string[];
  /** Signaux faibles : longueur anormale, etc. */
  warnings: string[];
}

/**
 * Vérifie un document généré.
 *
 * @param output        Le texte/JSON produit par le modèle.
 * @param sourceContext Le contexte fourni au modèle (prompt + RAG). Sert de
 *                      référentiel : un ECLI présent ici est légitime, un ECLI
 *                      présent seulement dans la sortie est une fabrication.
 */
export function verifyGeneratedDocument(
  output: string,
  sourceContext = ""
): GeneratedDocumentVerification {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Citations jurisprudentielles inventées (réutilise la logique du chat).
  const citation = validateConsultantCitations(output, sourceContext);
  issues.push(...citation.issues);

  // 2. Numéros d'article hors plage + longueur (réutilise les garde-fous).
  const outputCheck = validateAIOutput(output);
  for (const w of outputCheck.warnings) {
    if (w.startsWith("suspicious_article_number")) issues.push(w);
    else warnings.push(w);
  }
  if (!outputCheck.valid) issues.push(...outputCheck.warnings);

  return { ok: issues.length === 0, issues, warnings };
}
