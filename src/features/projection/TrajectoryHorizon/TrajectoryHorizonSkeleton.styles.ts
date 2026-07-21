import styled from "styled-components";

// Mirrors `StyledChartWrapper` so the placeholder sits exactly where the chart
// will, under the same header.
export const StyledChartPlaceholder = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space3}px;
  width: 100%;
`;
