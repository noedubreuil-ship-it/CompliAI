import { describe, expect, it } from "vitest";

import { buildOfficialLegislationPortalCitations } from "./official-portal-citations";

describe("buildOfficialLegislationPortalCitations", () => {
  it("inclut Légifrance et le lien loi pour la France", () => {
    const cites = buildOfficialLegislationPortalCitations(["FR"]);
    expect(cites.length).toBeGreaterThanOrEqual(2);
    expect(cites.some((c) => c.eurlex_url.includes("legifrance.gouv.fr"))).toBe(true);
    expect(cites.every((c) => c.source === "official_portal")).toBe(true);
  });

  it("inclut Finlex pour la Finlande", () => {
    const cites = buildOfficialLegislationPortalCitations(["FI"]);
    expect(cites.some((c) => c.eurlex_url.includes("finlex.fi"))).toBe(true);
  });

  it("dédoublonne les URL identiques", () => {
    const cites = buildOfficialLegislationPortalCitations(["FR", "fr"]);
    const urls = cites.map((c) => c.eurlex_url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
