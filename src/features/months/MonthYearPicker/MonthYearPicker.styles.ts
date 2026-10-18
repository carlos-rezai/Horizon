import styled from "styled-components";
import { focusRing } from "../../../primitives/focusRing/focusRing";
import { MONTHS_LONG } from "../../../utils/format/format";

/** The longest month-year label the trigger can show ("September 2026"):
 *  the longest month name plus a space and a four-digit year. */
const LONGEST_MONTH_YEAR_CHARS =
  Math.max(...MONTHS_LONG.map((name) => name.length)) + " YYYY".length;

/** Room for the trigger's chevron, gap and horizontal padding, in ch of the
 *  same mono face, so the reserved width holds the whole longest label. */
const TRIGGER_CHROME_CHARS = 6;

export const StyledAnchor = styled.div`
  position: relative;
`;

export const StyledTrigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: ${LONGEST_MONTH_YEAR_CHARS + TRIGGER_CHROME_CHARS}ch;
  gap: ${({ theme }) => theme.spacing.space2}px;
  height: ${({ theme }) => theme.sizing.control.sm}px;
  padding: 0 10px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  background: transparent;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.onSurface};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }

  ${focusRing}
`;

export const StyledChevron = styled.span`
  display: inline-flex;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledPopover = styled.div`
  position: fixed;
  z-index: 500;
  width: 244px;
  padding: ${({ theme }) => theme.spacing.space3}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outline};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.6);
`;

export const StyledYearHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledYearLabel = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledMonthCell = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing.space2}px 0;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md}px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.onPrimary : theme.colors.onSurface};
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.surfaceContainerHigh};
  cursor: pointer;
  transition: all 0.12s ease;

  &:hover:not(:disabled) {
    background-color: ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.surfaceContainerHighest};
  }

  &:disabled {
    color: ${({ theme }) => theme.colors.onSurfaceVariant};
    background-color: transparent;
    opacity: 0.4;
    cursor: not-allowed;
  }

  ${focusRing}
`;
