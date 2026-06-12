import styled from "styled-components";

export const StyledAvatar = styled.span<{ $color: string; $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  color: ${({ $color }) => $color};
  background-color: ${({ $color }) => `${$color}26`};
  flex-shrink: 0;
`;
