import styled, { keyframes } from "styled-components";

type SpinnerSize = "small" | "medium" | "large";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const sizeMap: Record<SpinnerSize, number> = {
  small: 16,
  medium: 24,
  large: 40,
};

const borderMap: Record<SpinnerSize, number> = {
  small: 2,
  medium: 3,
  large: 4,
};

export const StyledSpinner = styled.span<{ $size: SpinnerSize }>`
  display: inline-block;
  width: ${({ $size }) => sizeMap[$size]}px;
  height: ${({ $size }) => sizeMap[$size]}px;
  border: ${({ $size }) => borderMap[$size]}px solid
    ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.accent};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;
