/**
 * Classification des echecs d'ingestion, pour l'onglet « Non ingeres ».
 *
 * Ce module vit hors du fichier de route : Next.js n'autorise que les handlers
 * (`GET`, `POST`, `runtime`…) comme exports d'un `route.ts`, et rejette le
 * build sur tout autre export.
 */

/** Familles d'echec, pour que l'admin sache quoi faire sans lire la stack. */
export type BlockedReason =
  | "acces_bloque"
  | "document_non_juridique"
  | "telechargement_impossible"
  | "trop_long"
  | "parsing_invalide"
  | "quota_api"
  | "autre";

export interface BlockedDocument {
  id: string;
  title: string | null;
  document_type: string;
  source_url: string;
  detected_at: string;
  language: string;
  country: string;
  error_message: string | null;
  reason: BlockedReason;
  /** Ce que l'admin peut faire concretement. */
  hint: string;
}

/** Classe un message d'erreur brut en famille exploitable. */
export function classifyError(raw: string | null): {
  reason: BlockedReason;
  hint: string;
} {
  const m = (raw ?? "").toLowerCase();

  if (m.includes("anti-bot") || m.includes("page de blocage") || m.includes("captcha")) {
    return {
      reason: "acces_bloque",
      hint: "La page cible refuse l'accès automatisé. Récupérer le texte manuellement depuis la source officielle, ou écarter le document.",
    };
  }
  if (
    m.includes("n'est pas une décision") ||
    m.includes("non pertinent") ||
    m.includes("note de presse")
  ) {
    return {
      reason: "document_non_juridique",
      hint: "Le document n'a pas de valeur juridique (communiqué, annonce, événement). À écarter — c'est le tri qualité qui a fonctionné.",
    };
  }
  if (m.includes("impossible de récupérer")) {
    return {
      reason: "telechargement_impossible",
      hint: "L'URL source est injoignable ou vide. Vérifier le lien, ou attendre que la source republie.",
    };
  }
  if (m.includes("tronquée")) {
    return {
      reason: "trop_long",
      hint: "Document trop long pour un seul appel. Relancer après avoir relevé le plafond de tokens, ou découper le document.",
    };
  }
  if (m.includes("credit balance") || m.includes("rate limit")) {
    return {
      reason: "quota_api",
      hint: "Échec de facturation ou de quota, sans rapport avec le document. Relancer une fois le crédit rétabli.",
    };
  }
  if (m.includes("non parseable") || m.includes("parsing json")) {
    return {
      reason: "parsing_invalide",
      hint: "La réponse du modèle n'était pas exploitable. Relancer une fois ; si l'échec persiste, le document sort du cadre du prompt.",
    };
  }
  return { reason: "autre", hint: "Cause non classée. Lire le message d'erreur complet." };
}
