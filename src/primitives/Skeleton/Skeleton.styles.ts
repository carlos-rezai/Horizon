import styled, { keyframes } from "styled-components";

export type SkeletonShape = "rect" | "circle";

const pulse = keyframes`
  0%   { opacity: 1; }
  50%  { opacity: 0.45; }
  100% { opacity: 1; }
`;

export const StyledSkeleton = styled.span<{ $shape: SkeletonShape }>`
  display: block;
  flex-shrink: 0;
  background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
  border-radius: ${({ theme, $shape }) =>
    $shape === "circle" ? "50%" : `${theme.radius.sm}px`};
  animation: ${pulse} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
