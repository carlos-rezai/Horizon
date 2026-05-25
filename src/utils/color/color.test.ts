import { describe, it, expect } from "vitest";
import { resolveAccountColor } from "./color";
import { chartColors } from "../../tokens/colors";
import type { AccountKind } from "../../types/account";

describe("resolveAccountColor", () => {
  it("returns an explicit color unchanged", () => {
    expect(resolveAccountColor({ color: "#ff0000", kind: "Girokonto" })).toBe(
      "#ff0000"
    );
  });

  it("returns the per-kind fallback when color is null", () => {
    const kinds: AccountKind[] = [
      "Girokonto",
      "Tagesgeld",
      "Mortgage",
      "CreditCard",
      "Investment",
    ];
    for (const kind of kinds) {
      expect(resolveAccountColor({ color: null, kind })).toBe(
        chartColors[kind]
      );
    }
  });

  it("returns the per-kind fallback when color is undefined", () => {
    const kinds: AccountKind[] = [
      "Girokonto",
      "Tagesgeld",
      "Mortgage",
      "CreditCard",
      "Investment",
    ];
    for (const kind of kinds) {
      expect(resolveAccountColor({ kind })).toBe(chartColors[kind]);
    }
  });
});
