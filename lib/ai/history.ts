/**
 * Gestion de l'historique de conversation envoyé à Claude.
 *
 * Règle métier : on borne la mémoire à 6 échanges utilisateur/assistant
 * (soit 12 messages) afin de :
 *   - maîtriser le coût d'appel,
 *   - éviter la dérive contextuelle lors d'un long fil,
 *   - garantir une latence prévisible.
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_MAX_EXCHANGES = 6;

/**
 * Conserve uniquement les `maxExchanges` derniers échanges
 * (user + assistant). Si le dernier message conservé est un message
 * \`assistant\` orphelin, il est écarté pour préserver l'alternance.
 */
export function trimHistory(
  history: ChatTurn[],
  maxExchanges: number = DEFAULT_MAX_EXCHANGES
): ChatTurn[] {
  if (!Array.isArray(history) || history.length === 0) return [];

  const maxMessages = Math.max(2, maxExchanges * 2);
  let trimmed = history.slice(-maxMessages);

  // Garantit que la séquence commence par un message utilisateur.
  while (trimmed.length > 0 && trimmed[0].role !== "user") {
    trimmed = trimmed.slice(1);
  }

  return trimmed;
}
