import styled from "styled-components";

export const StyledTrack = styled.div<{ $track?: string; $height: number }>`
  width: 100%;
  height: ${({ $height }) => $height}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background-color: ${({ $track, theme }) =>
    $track ?? theme.colors.surfaceContainerHigh};
  overflow: hidden;
`;

export const StyledFill = styled.div<{ $pct: number; $color?: string }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  border-radius: inherit;
  background-color: ${({ $color, theme }) => $color ?? theme.colors.primary};
  transition: width 0.3s ease;
`;
