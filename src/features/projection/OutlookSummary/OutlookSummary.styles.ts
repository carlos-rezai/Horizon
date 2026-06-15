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
  padding: 20px 24px;
  border-right: ${({ theme, $last }) =>
    $last ? "none" : `1px solid ${theme.colors.outlineVariant}`};
`;

type Tone = "pos" | "accent" | "neutral";

export const StyledBigValue = styled.div<{ $tone?: Tone }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme, $tone }) =>
    $tone === "pos"
      ? theme.colors.secondary
      : $tone === "accent"
        ? theme.colors.primary
        : theme.colors.onSurface};
`;

export const StyledEmpty = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 30px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;
