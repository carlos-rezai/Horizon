import styled from "styled-components";

/* Holds every applicable flag badge. Wraps rather than truncating so a row that
   is both duplicate and recurring never hides one behind the other. */
export const StyledFlagCell = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
`;

const REVIEW_GRID = "34px 78px minmax(0, 1fr) 130px 110px 96px";

export const StyledReviewHead = styled.div`
  display: grid;
  grid-template-columns: ${REVIEW_GRID};
  gap: 10px;
  padding: 0 12px 8px;
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};

  span:last-child {
    text-align: right;
  }
`;

export const StyledReviewBody = styled.div`
  /* Viewport-responsive so a normal screen shows ~12 rows before scrolling;
     the internal scroll is the safety valve for long statements. The modal is
     already 90vh-bounded, so this cannot overflow the screen. */
  max-height: min(56vh, 620px);
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
`;

/* Two orthogonal channels: opacity encodes inclusion, the error accent encodes
   blocked-and-included. They compose with no special-casing. The accent is an
   inset shadow rather than a border so it can't shift the grid. */
export const StyledReviewRow = styled.div<{
  $included: boolean;
  $alt: boolean;
  $blocked: boolean;
}>`
  display: grid;
  grid-template-columns: ${REVIEW_GRID};
  gap: 10px;
  align-items: center;
  padding: 9px 12px;
  opacity: ${({ $included }) => ($included ? 1 : 0.55)};
  background: ${({ theme, $included, $alt }) =>
    !$included
      ? theme.colors.surfaceContainerLow
      : $alt
        ? theme.colors.lineFaint
        : "transparent"};
  box-shadow: ${({ theme, $blocked }) =>
    $blocked ? `inset 2px 0 0 ${theme.colors.error}` : "none"};
  transition: opacity ${({ theme }) => theme.transitions.fast};

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.lineFaint};
  }
`;

export const StyledCheck = styled.button<{ $on: boolean }>`
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  padding: 0;
  line-height: 0;
  flex-shrink: 0;
  border-radius: 5px;
  cursor: pointer;
  background: ${({ theme, $on }) =>
    $on ? theme.colors.primary : "transparent"};
  border: 1.5px solid
    ${({ theme, $on }) => ($on ? theme.colors.primary : theme.colors.outline)};
  color: ${({ theme }) => theme.colors.onPrimary};
  transition: all ${({ theme }) => theme.transitions.fast};
`;

export const StyledReviewDate = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

/* Editable on every row, blocked or not: what the user can fix must not depend
   on data they can't see. Reads as text until focused or in error. */
export const StyledReviewDesc = styled.input<{ $error: boolean }>`
  width: 100%;
  min-width: 0;
  padding: 4px 7px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurface};
  background: ${({ theme, $error }) =>
    $error ? theme.colors.errorContainer : "transparent"};
  border: 1px solid
    ${({ theme, $error }) => ($error ? theme.colors.error : "transparent")};
  border-radius: ${({ theme }) => theme.radius.sm}px;
  text-overflow: ellipsis;
  transition: all ${({ theme }) => theme.transitions.fast};

  &::placeholder {
    color: ${({ theme }) => theme.colors.error};
  }

  &:hover:not(:focus-visible) {
    border-color: ${({ theme, $error }) =>
      $error ? theme.colors.error : theme.colors.outlineVariant};
  }

  &:focus-visible {
    outline: none;
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-color: ${({ theme, $error }) =>
      $error ? theme.colors.error : theme.colors.primary};
  }
`;

export const StyledReviewAmount = styled.span`
  text-align: right;
`;
