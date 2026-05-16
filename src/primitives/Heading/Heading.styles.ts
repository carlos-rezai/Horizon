import styled from "styled-components";

const levelSizeMap = {
  1: "xxl",
  2: "xl",
  3: "lg",
  4: "md",
} as const;

// One styled component per level so the element type is correct
export const StyledH1 = styled.h1`
  color: ${({ theme }) => theme.colors.onSurface};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  font-size: ${({ theme }) => theme.typography.sizes[levelSizeMap[1]]}px;
  line-height: ${({ theme }) => theme.typography.lineHeights.tight};
`;

export const StyledH2 = styled.h2`
  color: ${({ theme }) => theme.colors.onSurface};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  font-size: ${({ theme }) => theme.typography.sizes[levelSizeMap[2]]}px;
  line-height: ${({ theme }) => theme.typography.lineHeights.tight};
`;

export const StyledH3 = styled.h3`
  color: ${({ theme }) => theme.colors.onSurface};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  font-size: ${({ theme }) => theme.typography.sizes[levelSizeMap[3]]}px;
  line-height: ${({ theme }) => theme.typography.lineHeights.tight};
`;

export const StyledH4 = styled.h4`
  color: ${({ theme }) => theme.colors.onSurface};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  font-size: ${({ theme }) => theme.typography.sizes[levelSizeMap[4]]}px;
  line-height: ${({ theme }) => theme.typography.lineHeights.tight};
`;
