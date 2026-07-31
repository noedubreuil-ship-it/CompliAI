/**
 * Traduction des erreurs de fournisseur IA en messages utilisateur.
 *
 * Sans ce filtre, une erreur brute d'Anthropic — par ex. le JSON
 * `400 {"type":"error","error":{"type":"invalid_request_error","message":"Your
 * credit balance is too low…"}}` — était renvoyée telle quelle dans le chat.
 * Le client voyait la stack technique du fournisseur, ce qui expose le
 * prestataire, inquiète l'utilisateur et n'aide en rien. Constaté deux fois le
 * 2026-07-19 quand le solde Anthropic est tombé à zéro.
 */

export type ProviderErrorKind =
  | "credit_exhausted"
  | "rate_limited"
  | "overloaded"
  | "timeout"
  | "unknown";

export interface ClassifiedProviderError {
  kind: ProviderErrorKind;
  /** Message affichable à l'utilisateur, en français, sans détail technique. */
  userMessage: string;
  /**
   * `true` quand la cause est côté exploitant (crédit, quota) et non côté
   * utilisateur : à remonter en supervision, pas à imputer au client.
   */
  operational: boolean;
}

const GENERIC_MESSAGE =
  "Le service est momentanément indisponible. Réessayez dans quelques instants ; si le problème persiste, contactez le support.";

/**
 * Classe une erreur fournisseur brute. Ne renvoie JAMAIS le message d'origine
 * à l'utilisateur — seulement un libellé neutre.
 */
export function classifyProviderError(raw: string | undefined): ClassifiedProviderError {
  const m = (raw ?? "").toLowerCase();

  if (m.includes("credit balance") || m.includes("billing") || m.includes("insufficient")) {
    return {
      kind: "credit_exhausted",
      userMessage:
        "Le service d'analyse juridique est temporairement indisponible. Nos équipes ont été prévenues. Réessayez sous peu.",
      operational: true,
    };
  }
  if (m.includes("429") || m.includes("rate limit") || m.includes("rate_limit")) {
    return {
      kind: "rate_limited",
      userMessage:
        "Le service reçoit un grand nombre de demandes en ce moment. Patientez quelques secondes avant de réessayer.",
      operational: false,
    };
  }
  if (m.includes("overloaded") || m.includes("529")) {
    return {
      kind: "overloaded",
      userMessage:
        "Le service d'analyse est surchargé pour l'instant. Réessayez dans un moment.",
      operational: false,
    };
  }
  if (m.includes("timeout") || m.includes("timed out") || m.includes("etimedout")) {
    return {
      kind: "timeout",
      userMessage:
        "La demande a mis trop de temps à aboutir. Réessayez, éventuellement avec une question plus courte.",
      operational: false,
    };
  }
  return { kind: "unknown", userMessage: GENERIC_MESSAGE, operational: false };
}
