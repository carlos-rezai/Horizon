import styled from "styled-components";
import { Link } from "react-router-dom";

// chevron · period · total liquid · restschuld · net cashflow
export const ARCHIVE_COLS = "22px 72px 1fr 1fr 1fr";

export const StyledArchive = styled.section`
  margin-top: ${({ theme }) => theme.spacing.space5}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.card}px;
  overflow: hidden;
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

export const StyledColumnHeader = styled.div`
  display: grid;
  grid-template-columns: ${ARCHIVE_COLS} 120px;
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

  & > span:nth-child(n + 3):nth-child(-n + 5) {
    text-align: right;
  }

  & > span:last-child {
    text-align: right;
  }
`;

export const StyledYearSection = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};

  &:last-child {
    border-bottom: none;
  }
`;

export const StyledYearRow = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-columns: 1fr 120px;
  align-items: center;
  gap: 16px;
  padding-right: 18px;
  background: ${({ theme, $open }) =>
    $open ? theme.colors.surfaceContainerLow : "transparent"};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }
`;

export const StyledYearHeader = styled.button`
  width: 100%;
  display: grid;
  grid-template-columns: ${ARCHIVE_COLS};
  gap: 16px;
  align-items: center;
  padding: 15px 18px;
  border: none;
  cursor: pointer;
  text-align: left;
  background: transparent;

  /* Total Liquid · Restschuld · Net Cashflow are rendered as bare Money spans
     so each cell's textContent stays unique (nested wrappers would duplicate
     it). Alignment and tone therefore live on the grid cells themselves. */
  & > span:nth-child(n + 3) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  & > span:nth-child(3) {
    color: ${({ theme }) => theme.colors.secondary};
  }

  & > span:nth-child(4) {
    color: ${({ theme }) => theme.colors.error};
  }
`;

export const StyledChevron = styled.span<{ $open: boolean }>`
  display: grid;
  place-items: center;
  color: ${({ theme, $open }) =>
    $open ? theme.colors.primary : theme.colors.onSurfaceDim};
  transform: ${({ $open }) => ($open ? "rotate(90deg)" : "none")};
  transition: transform 0.18s ease;
`;

export const StyledYearLabel = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledCountBadge = styled(Link)`
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => theme.spacing.space1}px
    ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHighest};
  }
`;

export const StyledMonthRow = styled(Link)`
  display: grid;
  grid-template-columns: ${ARCHIVE_COLS};
  gap: 16px;
  align-items: center;
  padding: 9px 18px;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }
`;

export const StyledMonthName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

type NumTone = "pos" | "debt" | "text";

export const StyledNum = styled.span<{ $tone?: NumTone }>`
  text-align: right;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) =>
    $tone === "pos"
      ? theme.colors.secondary
      : $tone === "debt"
        ? theme.colors.error
        : theme.colors.onSurface};
`;

export const StyledEmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing.space8}px;
  text-align: center;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
`;
