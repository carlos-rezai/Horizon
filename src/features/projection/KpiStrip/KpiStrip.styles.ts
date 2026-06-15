import styled from "styled-components";

export const StyledStrip = styled.div`
  display: flex;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.card}px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
`;

export const StyledTile = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding: 18px 20px;
  border-right: 1px solid ${({ theme }) => theme.colors.outlineVariant};

  &:last-child {
    border-right: none;
  }
`;

export const StyledTileHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
`;

export const StyledLabel = styled.span<{ $accent?: boolean }>`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 10.5px;
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme, $accent }) =>
    $accent ? theme.colors.primary : theme.colors.onSurfaceDim};
`;

export const StyledValue = styled.div`
  margin-top: 12px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.onSurface};
`;
