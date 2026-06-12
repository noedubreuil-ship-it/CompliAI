import { describe, expect, it } from "vitest";
import { inferCjeuCelex } from "@/lib/ai/eurlex-celex-fetch";

describe("inferCjeuCelex", () => {
  it("reproduit les CELEX usuels Schrems II / Google Spain", () => {
    expect(inferCjeuCelex(311, 18)).toBe("62018CJ0311");
    expect(inferCjeuCelex(131, 12)).toBe("62012CJ0131");
  });
});
