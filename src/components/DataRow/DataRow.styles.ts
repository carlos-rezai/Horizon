import styled from "styled-components";

interface StyledDataRowProps {
  $columns: string;
  $last: boolean;
  $clickable: boolean;
}

export const StyledDataRow = styled.div<StyledDataRowProps>`
  display: grid;
  grid-template-columns: ${({ $columns }) => $columns};
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: 13px 14px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  border-bottom: ${({ $last, theme }) =>
    $last ? "none" : `1px solid ${theme.colors.lineFaint}`};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ $clickable, theme }) =>
      $clickable ? theme.colors.surfaceContainerHigh : "transparent"};
  }
`;
