import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { stripePriceIdForPackCredits, CREDIT_PACK_DEFINITIONS } from "./credit-pack-config";

describe("credit-pack-config", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("expose 4 packs calibrés", () => {
    expect(CREDIT_PACK_DEFINITIONS).toHaveLength(4);
    expect(CREDIT_PACK_DEFINITIONS[1].priceCents).toBe(4500);
  });

  it("lit le Price ID depuis l'env", () => {
    process.env.STRIPE_PACK_5000_PRICE_ID = "price_pack_5k";
    expect(stripePriceIdForPackCredits(5000)).toBe("price_pack_5k");
  });
});
