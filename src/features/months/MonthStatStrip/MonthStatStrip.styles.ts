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

type Tone = "neg" | "neutral" | "muted";

export const StyledValue = styled.div<{ $tone: Tone }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme, $tone }) =>
    $tone === "neg"
      ? theme.colors.error
      : $tone === "muted"
        ? theme.colors.onSurfaceDim
        : theme.colors.onSurface};
`;

export const StyledCount = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.onSurface};
`;
