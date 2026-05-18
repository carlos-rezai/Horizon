import styled from "styled-components";

export const StyledMonthOverview = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledTabList = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space2}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledTab = styled.button<{ $isActive: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $isActive }) =>
      $isActive ? theme.colors.primary : "transparent"};
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  cursor: pointer;
  color: ${({ theme, $isActive }) =>
    $isActive ? theme.colors.primary : theme.colors.onSurface};
`;
