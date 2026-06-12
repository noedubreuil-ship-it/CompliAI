import { describe, expect, it, vi } from "vitest";
import { handleAiHttpResponse } from "./client-ai-errors";

describe("handleAiHttpResponse", () => {
  const toast = {
    insufficientCredits: vi.fn(),
    rateLimited: vi.fn(),
    aiError: vi.fn(),
  };

  it("gère 402 crédits insuffisants", () => {
    const res = { ok: false, status: 402 } as Response;
    expect(handleAiHttpResponse(res, { error: "x", balance: 12 }, toast)).toBe(true);
    expect(toast.insufficientCredits).toHaveBeenCalledWith(12);
  });

  it("gère 429 rate limit", () => {
    const res = { ok: false, status: 429 } as Response;
    expect(handleAiHttpResponse(res, { error: "x", code: "RATE_LIMITED" }, toast)).toBe(true);
    expect(toast.rateLimited).toHaveBeenCalled();
  });

  it("retourne false si OK", () => {
    const res = { ok: true, status: 200 } as Response;
    expect(handleAiHttpResponse(res, { error: "" }, toast)).toBe(false);
  });
});
