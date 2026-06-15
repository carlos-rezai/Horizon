import styled from "styled-components";

export const StyledDonut = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
`;

export const StyledChartWrap = styled.div<{ $size: number }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex-shrink: 0;
`;

export const StyledCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

export const StyledCenterLabel = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-bottom: 3px;
`;

export const StyledLegend = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
`;

export const StyledLegendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const StyledLegendLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StyledSwatch = styled.span<{ $color: string }>`
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;
