import styled from "styled-components";

/* Holds every applicable flag badge. Wraps rather than truncating so a row that
   is both duplicate and recurring never hides one behind the other. */
export const StyledFlagCell = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
`;

const REVIEW_GRID = "34px 78px minmax(0, 1fr) 190px 110px 96px";

/* The category picker and, beside it, the Category Source chip. The picker
   takes the remaining width so the chip never pushes it out of its column. */
export const StyledCategoryCell = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;

  > :first-child {
    flex: 1;
    min-width: 0;
  }
`;

/* Why the row carries its category. Muted on purpose: it explains, it never
   warns, so it reads quieter than the soft-flag badges beside it. A proposed
   row's chip carries the primary accent: it asks for a decision. */
export const StyledSourceChip = styled.span<{ $proposed?: boolean }>`
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme, $proposed }) =>
    $proposed ? theme.colors.primary : theme.colors.onSurfaceVariant};
  border: 1px solid
    ${({ theme, $proposed }) =>
      $proposed ? theme.colors.primary : theme.colors.outlineVariant};
`;

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

export const StyledReviewAmount = styled.span`
  text-align: right;
`;
