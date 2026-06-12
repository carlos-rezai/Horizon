import styled from "styled-components";

export const StyledDelta = styled.span<{ $down: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-variant-numeric: tabular-nums;
  color: ${({ $down, theme }) =>
    $down ? theme.colors.error : theme.colors.secondary};
`;
