import { describe, it, expect } from "vitest";
import { createPresetMemory } from "./presetMemory";
import { BANK_PRESETS, DEFAULT_BANK } from "./bankPresets";

describe("createPresetMemory", () => {
  it("returns a known bank's default column mapping", () => {
    const memory = createPresetMemory();

    expect(memory.get("Sparkasse")).toEqual({
      date: "Buchungstag",
      desc: "Verwendungszweck",
      amount: "Betrag",
    });
  });

  it("falls back to the default bank mapping for an unknown bank", () => {
    const memory = createPresetMemory();

    expect(memory.get("UnknownBank")).toEqual(BANK_PRESETS[DEFAULT_BANK].map);
  });

  it("remembers a custom mapping for a bank and returns it on the next get", () => {
    const memory = createPresetMemory();

    memory.remember("DKB", {
      date: "Buchungsdatum",
      desc: "Auftraggeber / Begünstigter",
      amount: "Betrag (€)",
    });

    expect(memory.get("DKB")).toEqual({
      date: "Buchungsdatum",
      desc: "Auftraggeber / Begünstigter",
      amount: "Betrag (€)",
    });
  });

  it("isolates remembered mappings per bank", () => {
    const memory = createPresetMemory();

    memory.remember("DKB", {
      date: "Buchungsdatum",
      desc: "Auftraggeber / Begünstigter",
      amount: "Betrag (€)",
    });

    // Sparkasse is untouched by remembering a DKB mapping
    expect(memory.get("Sparkasse")).toEqual(BANK_PRESETS.Sparkasse.map);
  });
});
