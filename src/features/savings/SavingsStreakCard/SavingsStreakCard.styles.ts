import styled from "styled-components";
import type { YearTickStatus } from "../savingsTypes";

export const StyledHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledTitleGroup = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  flex: 1;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
  color: inherit;
`;

export const StyledActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  flex-shrink: 0;
`;

export const StyledEditButton = styled.button`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  border: 1px solid transparent;
  background-color: transparent;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  cursor: pointer;
  transition: all 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.onSurface};
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
    border-color: ${({ theme }) => theme.colors.outlineVariant};
  }
`;

export const StyledToggle = styled.button<{ $open: boolean }>`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  flex-shrink: 0;
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "none")};
  transition: transform 0.18s ease;
`;

export const StyledFlameBadge = styled.div`
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  background: ${({ theme }) => theme.colors.primaryContainer};
  color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
`;

export const StyledOverline = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 5px;
`;

export const StyledTitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing.space2}px;
  flex-wrap: wrap;
`;

export const StyledTitle = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.h1.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h1.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h1.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.h1.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.h1.letterSpacing};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledCurrent = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.monoMd.fontFamily};
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledBest = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledStrip = styled.div`
  display: flex;
  gap: 5px;
  margin-top: ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledTile = styled.div<{
  $status: YearTickStatus;
  $index: number;
}>`
  flex: 1;
  height: 30px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  display: grid;
  place-items: center;
  background: ${({ theme, $status }) =>
    $status === "met"
      ? theme.colors.primary
      : $status === "missed"
        ? theme.colors.surfaceContainerHigh
        : "transparent"};
  border: ${({ theme, $status }) =>
    $status === "upcoming" ? `1px dashed ${theme.colors.lineFaint}` : "none"};
  opacity: ${({ $status, $index }) =>
    $status === "met" ? 0.45 + ($index / 12) * 0.55 : 1};
`;

export const StyledTileLabel = styled.span<{ $status: YearTickStatus }>`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${({ theme, $status }) =>
    $status === "met"
      ? theme.colors.onPrimary
      : $status === "upcoming"
        ? theme.colors.onSurfaceFaint
        : theme.colors.onSurfaceDim};
`;

export const StyledCaption = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
  margin-top: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledRows = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space5}px;
  padding-top: ${({ theme }) => theme.spacing.space4}px;
  border-top: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  display: flex;
  flex-direction: column;
`;

export const StyledRow = styled.div<{ $tracked: boolean; $last: boolean }>`
  display: grid;
  grid-template-columns: 38px 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: 12px 10px;
  opacity: ${({ $tracked }) => ($tracked ? 1 : 0.5)};
  border-bottom: ${({ $last, theme }) =>
    $last ? "none" : `1px solid ${theme.colors.lineFaint}`};
`;

export const StyledRowBody = styled.div`
  min-width: 0;
`;

export const StyledRowName = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledAccountName = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.bodyMd.fontSize};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledProgress = styled.div`
  margin-top: 7px;
  max-width: 260px;
`;

export const StyledAmounts = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-top: 5px;
`;

export const StyledSaved = styled.span<{ $met: boolean }>`
  color: ${({ theme, $met }) =>
    $met ? theme.colors.secondary : theme.colors.onSurface};
`;

export const StyledTargetAmount = styled.span`
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledUntrackedHint = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
  margin-top: 3px;
`;

export const StyledMonthly = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.monoMd.fontFamily};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledPerMonth = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;
