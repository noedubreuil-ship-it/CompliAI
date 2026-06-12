import { describe, it, expect } from "vitest";
import {
  resolveModelApiId,
  apiModelToBillingModel,
  getCreditMultiplier,
  OPUS_CREDIT_MULTIPLIER,
} from "./model-routing";
import { MODEL_CONFIG } from "@/lib/pricing";

describe("model-routing", () => {
  it("free plan uses Haiku", () => {
    expect(resolveModelApiId({ plan: "free", tool: "consultant" })).toBe(
      MODEL_CONFIG.haiku.apiId,
    );
  });

  it("starter uses Sonnet", () => {
    expect(resolveModelApiId({ plan: "starter", tool: "consultant" })).toBe(
      MODEL_CONFIG.sonnet.apiId,
    );
  });

  it("pro premium tools use Opus with multiplier", () => {
    expect(resolveModelApiId({ plan: "pro", tool: "audit" })).toBe(MODEL_CONFIG.opus.apiId);
    expect(getCreditMultiplier({ plan: "pro", tool: "audit" })).toBe(OPUS_CREDIT_MULTIPLIER);
  });

  it("pro non-premium tools stay on Sonnet", () => {
    expect(resolveModelApiId({ plan: "pro", tool: "comparateur" })).toBe(
      MODEL_CONFIG.sonnet.apiId,
    );
    expect(getCreditMultiplier({ plan: "pro", tool: "comparateur" })).toBe(1);
  });

  it("maps API model ids to billing models", () => {
    expect(apiModelToBillingModel("claude-haiku-4-5")).toBe("haiku");
    expect(apiModelToBillingModel("claude-sonnet-4-5")).toBe("sonnet");
    expect(apiModelToBillingModel("claude-opus-4-5")).toBe("opus");
  });
});
