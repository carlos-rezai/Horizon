import styled from "styled-components";

export const StyledDayBlock = styled.div`
  text-align: center;
`;

export const StyledDayNum = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledDayMonth = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 9px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;

// The skeleton of a day block: its stacked day number and month
// abbreviation, centred in the same column.
export const StyledDayBlockSkeleton = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
`;
