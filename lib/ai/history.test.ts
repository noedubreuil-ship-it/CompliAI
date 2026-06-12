import { describe, expect, it } from "vitest";
import { trimHistory, type ChatTurn } from "./history";

const turn = (role: ChatTurn["role"], i: number): ChatTurn => ({
  role,
  content: `${role}-${i}`,
});

describe("trimHistory", () => {
  it("renvoie un tableau vide si l'entrée est vide", () => {
    expect(trimHistory([])).toEqual([]);
  });

  it("conserve un historique court tel quel", () => {
    const h: ChatTurn[] = [turn("user", 1), turn("assistant", 1)];
    expect(trimHistory(h)).toEqual(h);
  });

  it("tronque à 6 échanges (12 messages) par défaut", () => {
    const h: ChatTurn[] = [];
    for (let i = 1; i <= 10; i++) {
      h.push(turn("user", i));
      h.push(turn("assistant", i));
    }
    const out = trimHistory(h);
    expect(out).toHaveLength(12);
    expect(out[0].content).toBe("user-5");
    expect(out[11].content).toBe("assistant-10");
  });

  it("garantit que la séquence commence par un message utilisateur", () => {
    const h: ChatTurn[] = [
      turn("assistant", 0),
      turn("user", 1),
      turn("assistant", 1),
      turn("user", 2),
      turn("assistant", 2),
    ];
    const out = trimHistory(h, 6);
    expect(out[0].role).toBe("user");
  });

  it("respecte une borne personnalisée d'échanges", () => {
    const h: ChatTurn[] = [];
    for (let i = 1; i <= 4; i++) {
      h.push(turn("user", i));
      h.push(turn("assistant", i));
    }
    const out = trimHistory(h, 2);
    expect(out).toHaveLength(4);
    expect(out[0].content).toBe("user-3");
  });
});
