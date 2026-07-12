import styled from "styled-components";

export const StyledAnchor = styled.div`
  position: relative;
`;

export const StyledTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  height: 32px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.onSurface};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
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

export const StyledYearButton = styled.button`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
    color: ${({ theme }) => theme.colors.onSurface};
  }

  &:disabled {
    color: ${({ theme }) => theme.colors.onSurfaceVariant};
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
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
  border-radius: 7px;
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

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;
