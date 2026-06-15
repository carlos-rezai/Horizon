import styled from "styled-components";

export const StyledStrip = styled.div`
  display: flex;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.card}px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
`;

export const StyledCell = styled.div<{ $last?: boolean }>`
  flex: 1;
  min-width: 0;
  padding: 18px 22px;
  border-right: ${({ theme, $last }) =>
    $last ? "none" : `1px solid ${theme.colors.outlineVariant}`};
`;

export const StyledValue = styled.div<{ $muted?: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.onSurfaceDim : theme.colors.onSurface};
`;
