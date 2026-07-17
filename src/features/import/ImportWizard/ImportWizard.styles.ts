import styled from "styled-components";

export const StyledWizard = styled.div<{ $wide: boolean }>`
  width: ${({ $wide }) => ($wide ? "min(774px, 86vw)" : "min(516px, 86vw)")};
`;

/* ── Step dots ── */
export const StyledSteps = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
`;

export const StyledStep = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledStepDot = styled.span<{ $active: boolean; $done: boolean }>`
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme, $active, $done }) =>
    $active
      ? theme.colors.primary
      : $done
        ? theme.colors.primaryContainer
        : theme.colors.surfaceContainerHigh};
  color: ${({ theme, $active, $done }) =>
    $active
      ? theme.colors.onPrimary
      : $done
        ? theme.colors.primary
        : theme.colors.onSurfaceDim};
  transition: all ${({ theme }) => theme.transitions.fast};
`;

export const StyledStepLabel = styled.span<{ $active: boolean }>`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme, $active }) =>
    $active ? theme.colors.onSurface : theme.colors.onSurfaceDim};
`;

export const StyledStepLine = styled.span`
  flex: 1;
  height: 1px;
  min-width: 16px;
  background: ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

/* ── Step 1: file summary ── */
export const StyledFileCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.colors.surfaceContainerLow};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.lg}px;
`;

export const StyledFileGlyph = styled.div`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ theme }) => theme.colors.primaryContainer};
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledFileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const StyledFileName = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 13.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.onSurface};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const StyledFileMeta = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-top: 2px;
`;

export const StyledFormatBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.secondary};
  background: ${({ theme }) => theme.colors.secondaryContainer};
`;

export const StyledFieldLabel = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-bottom: 10px;
`;

export const StyledChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledChip = styled.button<{ $active: boolean; $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: 8px 13px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: ${({ theme, $active }) =>
    $active
      ? theme.colors.primaryContainer
      : theme.colors.surfaceContainerLowest};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.onSurface : theme.colors.onSurfaceVariant};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.outlineVariant};
  transition: all ${({ theme }) => theme.transitions.fast};

  &::before {
    content: "";
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: ${({ $color }) => $color};
  }
`;

export const StyledNote = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
  margin-top: 10px;

  strong {
    font-weight: 500;
    color: ${({ theme }) => theme.colors.onSurfaceVariant};
  }
`;

/* ── Step 2: map columns ── */
export const StyledMapHint = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};

  strong {
    color: ${({ theme }) => theme.colors.onSurface};
    font-weight: 500;
  }
`;

export const StyledMapCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: ${({ theme }) => theme.colors.surfaceContainerLow};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.lg}px;
`;

export const StyledMapField = styled.div`
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  gap: 14px;
`;

export const StyledMapFieldLabel = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledRawPreview = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
  overflow: hidden;
`;

export const StyledRawRow = styled.div<{ $alt: boolean }>`
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) 110px;
  gap: 12px;
  padding: 9px 14px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  background: ${({ theme, $alt }) =>
    $alt ? theme.colors.surfaceContainerLow : "transparent"};

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.lineFaint};
  }

  span:nth-child(2) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.onSurface};
  }

  span:nth-child(3) {
    text-align: right;
  }
`;

/* ── Step 3: review ── */
export const StyledReviewSummary = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  align-items: center;
`;

export const StyledSummaryText = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};

  strong {
    color: ${({ theme }) => theme.colors.secondary};
    font-weight: 600;
  }
`;

export const StyledFlagBadge = styled.span<{ $tone: "warn" | "neutral" }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme, $tone }) =>
    $tone === "warn" ? theme.colors.warn : theme.colors.onSurfaceVariant};
  background: ${({ theme, $tone }) =>
    $tone === "warn"
      ? theme.colors.warnDim
      : theme.colors.surfaceContainerHigh};
`;

const REVIEW_GRID = "34px 78px minmax(0, 1fr) 130px 72px 96px";

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

export const StyledFootnote = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;
