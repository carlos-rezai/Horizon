import styled from "styled-components";

export const SwatchGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space2}px;
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
