import { describe, expect, it } from "vitest";
import { buildScannerUserPrompt } from "./generators";
import { runScannerHeuristics } from "./scanner-heuristics";
import { getScannerWebSystemPrompt } from "./prompts/scanner-web";

describe("scanner page web", () => {
  it("buildScannerUserPrompt html mode embeds excerpt", () => {
    const html =
      '<html><head><script src="https://www.googletagmanager.com/gtm.js?id=GTM-TEST"></script></head></html>';
    const h = runScannerHeuristics(html, {
      source_label: "test",
    });
    const p = buildScannerUserPrompt({
      mode: "html",
      html,
      heuristics: h,
    });
    expect(p).toContain("MODE A");
    expect(p).toContain("GTM");
    expect(p).toContain("```html");
  });

  it("getScannerWebSystemPrompt includes output instructions", () => {
    expect(getScannerWebSystemPrompt()).toContain("Markdown");
  });
});
