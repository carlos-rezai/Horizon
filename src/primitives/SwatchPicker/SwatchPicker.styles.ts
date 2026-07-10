import styled from "styled-components";

export const SwatchGrid = styled.div<{ $columns?: number }>`
  gap: ${({ theme }) => theme.spacing.space2}px;
  ${({ $columns }) =>
    $columns
      ? `display: grid; grid-template-columns: repeat(${$columns}, min-content);`
      : "display: flex; flex-wrap: wrap;"}
`;

export const Swatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background-color: ${({ $color }) => $color};
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.onSurface : "transparent"};
  outline: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  cursor: pointer;
`;
