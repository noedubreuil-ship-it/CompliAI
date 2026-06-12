/**
 * Catalogue packs crédits — prix alignés sur le business plan.
 * Renseigner les STRIPE_PACK_*_PRICE_ID dans .env (Price ID Stripe one-time, mode live).
 */

export interface CreditPackDefinition {
  credits: number;
  priceCents: number;
  name: string;
  currency: "eur";
  badge: string | null;
  sortOrder: number;
  /** Clé env : STRIPE_PACK_1000_PRICE_ID, etc. */
  stripePriceIdEnvKey: string;
}

export const CREDIT_PACK_DEFINITIONS: CreditPackDefinition[] = [
  {
    credits: 1000,
    priceCents: 1200,
    name: "Pack 1 000",
    currency: "eur",
    badge: null,
    sortOrder: 1,
    stripePriceIdEnvKey: "STRIPE_PACK_1000_PRICE_ID",
  },
  {
    credits: 5000,
    priceCents: 4500,
    name: "Pack 5 000",
    currency: "eur",
    badge: "Populaire",
    sortOrder: 2,
    stripePriceIdEnvKey: "STRIPE_PACK_5000_PRICE_ID",
  },
  {
    credits: 15000,
    priceCents: 11000,
    name: "Pack 15 000",
    currency: "eur",
    badge: "Meilleure valeur",
    sortOrder: 3,
    stripePriceIdEnvKey: "STRIPE_PACK_15000_PRICE_ID",
  },
  {
    credits: 50000,
    priceCents: 32000,
    name: "Pack 50 000",
    currency: "eur",
    badge: null,
    sortOrder: 4,
    stripePriceIdEnvKey: "STRIPE_PACK_50000_PRICE_ID",
  },
];

export function stripePriceIdForPackCredits(credits: number): string | undefined {
  const def = CREDIT_PACK_DEFINITIONS.find((p) => p.credits === credits);
  if (!def) return undefined;
  const id = process.env[def.stripePriceIdEnvKey];
  return id?.trim() || undefined;
}

export function getCreditPackDefinition(credits: number): CreditPackDefinition | undefined {
  return CREDIT_PACK_DEFINITIONS.find((p) => p.credits === credits);
}
