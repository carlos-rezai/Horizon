import styled from "styled-components";

// chevron · period · one per account · total liquid · restschuld. Figure
// columns never shrink below a readable width; past that the body scrolls
// horizontally inside its card instead of crushing them.
const FIGURE_COL = "minmax(120px, 1fr)";

export function accordionColumns(accountCount: number): string {
  return ["22px", "80px", ...Array(accountCount + 2).fill(FIGURE_COL)].join(
    " "
  );
}

interface ColumnProps {
  $accountCount: number;
}

/** Horizontal scroll container for the column header and the year rows. */
export const StyledScroll = styled.div`
  overflow-x: auto;
`;

/** Grows to the grid's widest row so every row's background spans the scroll. */
export const StyledScrollBody = styled.div`
  display: flex;
  flex-direction: column;
  min-width: max-content;
  width: 100%;
`;

export const StyledAccordion = styled.div`
  display: flex;
  flex-direction: column;
`;

export const StyledSectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledSectionTitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.h2.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h2.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h2.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.h2.letterSpacing};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledLegend = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledLegendDot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
`;

export const StyledColumnHeader = styled.div<ColumnProps>`
  display: grid;
  grid-template-columns: ${({ $accountCount }) =>
    accordionColumns($accountCount)};
  gap: 16px;
  padding: 11px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  background: ${({ theme }) => theme.colors.surfaceContainerLow};
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};

  & > span:nth-child(n + 3) {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    text-align: right;
  }
`;

export const StyledYearSection = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledYearHeader = styled.button<ColumnProps & { $open: boolean }>`
  width: 100%;
  display: grid;
  grid-template-columns: ${({ $accountCount }) =>
    accordionColumns($accountCount)};
  gap: 16px;
  align-items: center;
  padding: 15px 18px;
  border: none;
  cursor: pointer;
  text-align: left;
  background: ${({ theme, $open }) =>
    $open ? theme.colors.surfaceContainerLow : "transparent"};
  transition: background 0.12s ${({ theme }) => theme.transitions.easing};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }
`;

export const StyledChevron = styled.span<{ $open: boolean }>`
  display: grid;
  place-items: center;
  color: ${({ theme, $open }) =>
    $open ? theme.colors.primary : theme.colors.onSurfaceDim};
  transform: ${({ $open }) => ($open ? "rotate(90deg)" : "none")};
  transition: transform ${({ theme }) => theme.transitions.swap};
`;

export const StyledYearLabel = styled.span<{ $payoff: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme, $payoff }) =>
    $payoff ? theme.colors.primary : theme.colors.onSurface};
`;

export const StyledMonthRow = styled.div<
  ColumnProps & {
    $isST: boolean;
    $isPayoff: boolean;
  }
>`
  display: grid;
  grid-template-columns: ${({ $accountCount }) =>
    accordionColumns($accountCount)};
  gap: 16px;
  align-items: center;
  padding: 9px 18px;
  cursor: pointer;
  transition: background 0.12s ${({ theme }) => theme.transitions.easing};
  background: ${({ theme, $isST, $isPayoff }) =>
    $isPayoff
      ? theme.colors.primaryContainer
      : $isST
        ? "rgba(206,130,120,0.07)"
        : "transparent"};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }
`;

export const StyledMonthName = styled.span<{ $payoff: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 12.5px;
  color: ${({ theme, $payoff }) =>
    $payoff ? theme.colors.primary : theme.colors.onSurfaceVariant};
`;

type NumTone = "pos" | "debt" | "muted" | "text" | "accent";

export const StyledNum = styled.span<{ $tone?: NumTone }>`
  text-align: right;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) =>
    $tone === "pos"
      ? theme.colors.secondary
      : $tone === "debt"
        ? theme.colors.error
        : $tone === "muted"
          ? theme.colors.onSurfaceVariant
          : $tone === "accent"
            ? theme.colors.primary
            : theme.colors.onSurface};
`;

export const StyledPayoffFlag = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  text-align: right;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledDash = styled.span`
  text-align: right;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;

export const StyledEmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing.space8}px;
  text-align: center;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
`;
