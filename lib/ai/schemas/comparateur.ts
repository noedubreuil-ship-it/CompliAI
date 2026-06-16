import { z } from "zod";

/**
 * Schéma "client" après normalizeComparateurForClient().
 * On reste volontairement permissif sur les champs inconnus,
 * mais on verrouille les tableaux nécessaires à l’UI.
 */
export const ComparateurClientSchema = z
  .object({
    tableau: z.array(z.unknown()).default([]),
    points_convergence: z.array(z.unknown()).default([]),
    points_divergence: z.array(z.unknown()).default([]),
    divergences_cles: z.array(z.unknown()).default([]),
    sources: z.array(z.unknown()).default([]),
    limitations: z.array(z.unknown()).default([]),
  })
  .passthrough();

export type ComparateurClientResult = z.infer<typeof ComparateurClientSchema>;

