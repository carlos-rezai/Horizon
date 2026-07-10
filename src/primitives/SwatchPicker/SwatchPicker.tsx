import { SwatchGrid, Swatch } from "./SwatchPicker.styles";

export interface SwatchPickerProps {
  /** The colours to offer, each rendered as one selectable swatch. */
  palette: readonly string[];
  /** The currently selected hex — matched against the palette case-insensitively. */
  value: string;
  /** Called with the chosen hex when a swatch is clicked. */
  onChange: (hex: string) => void;
}

/**
 * A domain-agnostic grid of colour swatches. Knows nothing about categories —
 * the caller supplies the palette and the resolved selected value, mirroring
 * the `Chip` precedent. Each swatch is a button with the hex as its
 * `aria-label` and `aria-pressed` reflecting selection.
 */
export default function SwatchPicker({
  palette,
  value,
  onChange,
}: SwatchPickerProps): React.ReactElement {
  return (
    <SwatchGrid>
      {palette.map((hex) => {
        const selected = value.toLowerCase() === hex.toLowerCase();
        return (
          <Swatch
            key={hex}
            type="button"
            aria-label={hex}
            aria-pressed={selected}
            $color={hex}
            $selected={selected}
            onClick={() => onChange(hex)}
          />
        );
      })}
    </SwatchGrid>
  );
}
