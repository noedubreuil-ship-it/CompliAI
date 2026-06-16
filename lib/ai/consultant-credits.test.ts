import { describe, it, expect } from "vitest";
import {
  estimateConsultantCredits,
  estimateConsultantCreditsRange,
  consultantMinCreditsForDepth,
} from "./consultant-credits";
import { CONSULTANT_MIN_CREDITS } from "@/lib/pricing";

describe("consultant-credits", () => {
  it("detailed costs more than brief for same token usage", () => {
    const brief = estimateConsultantCredits(10_000, 2_000, "sonnet", {
      plan: "starter",
      depth: "brief",
    });
    const detailed = estimateConsultantCredits(10_000, 2_000, "sonnet", {
      plan: "starter",
      depth: "detailed",
    });
    expect(detailed).toBeGreaterThan(brief);
  });

  it("enforces minimum credits per depth", () => {
    const tiny = estimateConsultantCredits(100, 50, "sonnet", {
      plan: "starter",
      depth: "detailed",
    });
    expect(tiny).toBe(CONSULTANT_MIN_CREDITS.detailed);
    expect(consultantMinCreditsForDepth("brief")).toBe(CONSULTANT_MIN_CREDITS.brief);
  });

  it("returns a sensible UI range", () => {
    const range = estimateConsultantCreditsRange("starter", "detailed");
    expect(range.min).toBeGreaterThanOrEqual(CONSULTANT_MIN_CREDITS.detailed);
    expect(range.typical).toBeGreaterThan(range.min);
  });
});
