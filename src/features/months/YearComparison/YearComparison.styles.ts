import styled from "styled-components";

export const StyledIntro = styled.p`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  line-height: ${({ theme }) => theme.typography.scale.body.lineHeight};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin: -2px 0 0;
`;

export const StyledRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
  margin-top: ${({ theme }) => theme.spacing.space5}px;
`;

export const StyledRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledRowHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledCategory = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.body.fontSize};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledValue = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.monoSm.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledBars = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space1}px;
`;

export const StyledTrack = styled.div`
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.surfaceVariant};
  overflow: hidden;
`;

export const StyledBar = styled.div`
  height: 100%;
  border-radius: 3px;
  min-width: 1px;
`;

export const StyledLastYearBar = styled(StyledBar)`
  background: ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledLegend = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space4}px;
  margin-top: ${({ theme }) => theme.spacing.space5}px;
  padding-top: ${({ theme }) => theme.spacing.space4}px;
  border-top: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledLegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledSwatch = styled.span<{ $muted?: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: ${({ theme, $muted }) =>
    $muted ? theme.colors.outlineVariant : theme.colors.onSurfaceDim};
`;
