import styled from "styled-components";
import type { AccountKind } from "../../types/account";
import type { colors } from "../../tokens/colors";

type ColorKey = keyof typeof colors;

const bgMap: Record<AccountKind, ColorKey> = {
  Girokonto: "primaryTint",
  Tagesgeld: "secondaryTint",
  Mortgage: "errorTint",
  CreditCard: "tertiaryTint",
  Investment: "surfaceVariantTint",
};

const textMap: Record<AccountKind, ColorKey> = {
  Girokonto: "primary",
  Tagesgeld: "secondary",
  Mortgage: "error",
  CreditCard: "tertiary",
  Investment: "onSurfaceVariant",
};

export const StyledBadge = styled.span<{ $kind: AccountKind }>`
  display: inline-block;
  padding: 2px ${({ theme }) => theme.spacing.space2}px;
  border-radius: ${({ theme }) => theme.radius.badge}px;
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  line-height: ${({ theme }) => theme.typography.lineHeights.tight};
  background-color: ${({ $kind, theme }) => theme.colors[bgMap[$kind]]};
  color: ${({ $kind, theme }) => theme.colors[textMap[$kind]]};
`;

type Tone = "neutral" | "accent" | "pos" | "neg";

// Semantic tone presets map to the theme's foreground/tint token pairs.
const toneFg: Record<Tone, ColorKey> = {
  neutral: "onSurfaceVariant",
  accent: "primary",
  pos: "secondary",
  neg: "error",
};

const toneBg: Record<Tone, ColorKey> = {
  neutral: "surfaceContainerHigh",
  accent: "primaryTint",
  pos: "secondaryTint",
  neg: "errorTint",
};

/**
 * Generic pill: tinted by an explicit `$color` (text = colour, background and
 * border are the same colour at low alpha) or, absent a colour, by a semantic
 * `$tone` drawn from theme tokens.
 */
export const StyledTag = styled.span<{ $tone: Tone; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-size: 10.5px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  line-height: ${({ theme }) => theme.typography.lineHeights.tight};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  color: ${({ $color, $tone, theme }) => $color ?? theme.colors[toneFg[$tone]]};
  background-color: ${({ $color, $tone, theme }) =>
    $color ? `${$color}1f` : theme.colors[toneBg[$tone]]};
  border: 1px solid
    ${({ $color, theme }) =>
      $color ? `${$color}4d` : theme.colors.outlineVariant};
`;
