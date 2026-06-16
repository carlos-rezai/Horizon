import styled from "styled-components";

export const StyledDelta = styled.span<{ $down: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 9999px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 12px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: ${({ $down, theme }) =>
    $down ? theme.colors.error : theme.colors.secondary};
  background-color: ${({ $down, theme }) =>
    $down ? theme.colors.errorContainer : theme.colors.secondaryContainer};
`;
