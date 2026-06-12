import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  resolvePlanFromStripePriceId,
  isAllowedStripePriceId,
  mapPriceIdToTier,
} from "./plan-mapping";

describe("stripe plan-mapping", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_STARTER_PRICE_ID = "price_starter_srv";
    process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID = "price_starter_pub";
    process.env.STRIPE_PRO_PRICE_ID = "price_pro_srv";
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID = "price_pro_pub";
    process.env.STRIPE_ENTERPRISE_PRICE_ID = "price_ent_srv";
    process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID = "price_ent_pub";
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("résout starter depuis ID serveur ou client", () => {
    expect(resolvePlanFromStripePriceId("price_starter_srv")).toBe("starter");
    expect(resolvePlanFromStripePriceId("price_starter_pub")).toBe("starter");
  });

  it("résout pro et enterprise", () => {
    expect(resolvePlanFromStripePriceId("price_pro_pub")).toBe("pro");
    expect(resolvePlanFromStripePriceId("price_ent_srv")).toBe("enterprise");
    expect(mapPriceIdToTier("price_ent_pub")).toBe("enterprise");
  });

  it("rejette les price IDs inconnus", () => {
    expect(resolvePlanFromStripePriceId("price_unknown")).toBe("free");
    expect(isAllowedStripePriceId("price_unknown")).toBe(false);
    expect(isAllowedStripePriceId("price_pro_srv")).toBe(true);
  });
});
