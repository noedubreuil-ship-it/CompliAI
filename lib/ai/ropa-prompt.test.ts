import { describe, expect, it } from "vitest";
import {
  normalizeRopaContentForClient,
  normalizeRopaIntake,
  buildRoPAPrompt,
} from "./generators";
import { ROPA_OUTPUT_JSON_SPEC, getRopaSystemPrompt } from "./prompts/ropa-art30";

describe("RoPA Art. 30", () => {
  it("normalizeRopaIntake defaults and mode", () => {
    expect(normalizeRopaIntake({} as Record<string, unknown>).mode).toBe("register_batch");
    expect(normalizeRopaIntake({ mode: "audit" } as Record<string, unknown>).mode).toBe("audit");
    expect(normalizeRopaIntake({ mode: "nope" } as Record<string, unknown>).mode).toBe("register_batch");
  });

  it("normalizeRopaContentForClient fills company_overview and dpo_info", () => {
    const out = normalizeRopaContentForClient({
      controller: "Acme SAS",
      dpo: { name: "Jane", email: "jane@acme.eu" },
    });
    expect(out.company_overview).toEqual(expect.objectContaining({ name: "Acme SAS" }));
    expect(out.dpo_info).toEqual(expect.objectContaining({ name: "Jane", email: "jane@acme.eu" }));
  });

  it("buildRoPAPrompt includes JSON spec fragment", () => {
    const p = buildRoPAPrompt({
      mode: "register_batch",
      company_name: "Test",
      sector: "Tech",
      company_size: "PME",
      activities: "CRM, paie",
      dpo_name: "",
      dpo_email: "",
    });
    expect(p).toContain("MODE REGISTRE");
    expect(p).toContain("CRM, paie");
  });

  it("ROPA_OUTPUT_JSON_SPEC and system prompt are non-empty", () => {
    expect(ROPA_OUTPUT_JSON_SPEC.length).toBeGreaterThan(100);
    expect(getRopaSystemPrompt()).toContain("JSON");
  });
});
