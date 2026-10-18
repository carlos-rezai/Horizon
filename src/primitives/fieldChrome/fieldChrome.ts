import { css } from "styled-components";
import type { ControlSize } from "../../tokens";

/**
 * Field Chrome — the one look shared by the text field, the dropdown and the
 * date field: lowest-ink background, outline-variant border, medium radius,
 * Control Height, a gold border plus a 3px gold-wash ring when focused, and
 * 0.4 opacity when disabled.
 */
export const fieldChrome = css<{ $size: ControlSize }>`
  height: ${({ $size, theme }) => theme.sizing.control[$size]}px;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
  color: ${({ theme }) => theme.colors.onSurface};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  line-height: ${({ theme }) => theme.typography.lineHeights.normal};

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryContainer};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
