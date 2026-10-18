import { css } from "styled-components";

/**
 * Focus Ring — the one keyboard-focus ring every button-like control wears:
 * the Button's gold 2px outline, offset 2px.
 */
export const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;
