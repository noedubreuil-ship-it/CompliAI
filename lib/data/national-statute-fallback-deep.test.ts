import { describe, expect, it } from "vitest";

import { NATIONAL_STATUTE_FALLBACK_DEEP_BODIES } from "./national-statute-fallback-deep";

describe("NATIONAL_STATUTE_FALLBACK_DEEP_BODIES", () => {
  it("chaque synthèse deep fait au moins 3500 caractères pour multi-chunks", () => {
    for (const [code, body] of Object.entries(NATIONAL_STATUTE_FALLBACK_DEEP_BODIES)) {
      expect(body.length, code).toBeGreaterThanOrEqual(3500);
      expect(body, code).toMatch(/Article 1 —/);
      expect(body, code).toMatch(/SaaS B2B/);
    }
  });
});
