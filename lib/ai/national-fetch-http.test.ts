import { describe, expect, it } from "vitest";

import {
  assertAsciiHttpHeaders,
  nationalFetchRequestHeaders,
  NATIONAL_FETCH_USER_AGENT,
} from "@/lib/ai/national-fetch-http";

describe("national-fetch-http", () => {
  it("User-Agent est entièrement Latin-1 (pas de tiret long Unicode)", () => {
    for (let i = 0; i < NATIONAL_FETCH_USER_AGENT.length; i++) {
      expect(NATIONAL_FETCH_USER_AGENT.charCodeAt(i)).toBeLessThanOrEqual(255);
    }
    expect(NATIONAL_FETCH_USER_AGENT).not.toMatch(/[\u2013\u2014]/);
  });

  it("nationalFetchRequestHeaders passe assertAsciiHttpHeaders", () => {
    expect(() => assertAsciiHttpHeaders(nationalFetchRequestHeaders())).not.toThrow();
  });
});
