import { describe, expect, it } from "vitest";
import { extractJson } from "./generators";

describe("extractJson", () => {
  it("tolère une phrase après la fin du dernier objet", () => {
    expect(extractJson('{"hello":"world"}\n\nNote hors JSON')).toEqual({ hello: "world" });
  });

  it("extrait depuis un bloc fenced markdown", () => {
    const raw =
      "```json\n{\"a\": [1, 2]}\n```\n";
    expect(extractJson(raw)).toEqual({ a: [1, 2] });
  });
});
