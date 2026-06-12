import { describe, it, expect } from "vitest";
import { calculateCredits, MODEL_CONFIG } from "./pricing";

describe("calculateCredits", () => {
  it("returns at least one credit per call", () => {
    expect(calculateCredits("haiku", 0, 0)).toBeGreaterThanOrEqual(1);
  });

  it("scales monotonically with token counts for haiku", () => {
    const a = calculateCredits("haiku", 1000, 500);
    const b = calculateCredits("haiku", 2000, 500);
    expect(b).toBeGreaterThanOrEqual(a);
  });

  it("configured models expose apiId", () => {
    expect(MODEL_CONFIG.haiku.apiId).toContain("claude");
  });
});
