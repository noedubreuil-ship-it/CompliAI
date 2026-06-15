/** Vitesse de base : caractères révélés par milliseconde */
const BASE_CHARS_PER_MS = 0.055;
/** Accélération si le buffer API est en avance */
const CATCHUP_CHARS_PER_MS = 0.22;

/**
 * Calcule combien de caractères révéler ce frame pour un défilement fluide
 * (mot par mot visuellement, sans paquets saccadés).
 */
export function charsToRevealThisFrame(lag: number, deltaMs: number): number {
  if (lag <= 0) return 0;
  const rate = lag > 120 ? CATCHUP_CHARS_PER_MS : lag > 40 ? BASE_CHARS_PER_MS * 1.6 : BASE_CHARS_PER_MS;
  return Math.max(1, Math.min(lag, Math.round(deltaMs * rate)));
}
