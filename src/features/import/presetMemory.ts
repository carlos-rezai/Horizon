/**
 * Per-bank column-mapping memory for the Import wizard.
 *
 * A `get` returns the remembered mapping for a bank, falling back to the
 * bank's shipped preset, then to the {@link DEFAULT_BANK} mapping for an
 * unknown bank. `remember` overrides a bank's mapping for subsequent gets,
 * so an adjusted mapping is re-applied the next time that bank is imported.
 */
import { BANK_PRESETS, DEFAULT_BANK, type ColumnMapping } from "./bankPresets";

export interface PresetMemory {
  get(bank: string): ColumnMapping;
  remember(bank: string, map: ColumnMapping): void;
}

export function createPresetMemory(): PresetMemory {
  const remembered = new Map<string, ColumnMapping>();

  return {
    get(bank) {
      const custom = remembered.get(bank);
      if (custom) return custom;
      const preset = BANK_PRESETS[bank];
      return preset ? preset.map : BANK_PRESETS[DEFAULT_BANK].map;
    },
    remember(bank, map) {
      remembered.set(bank, map);
    },
  };
}
