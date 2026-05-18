import styled from "styled-components";

export const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

export const DisplayText = styled.span`
  color: ${({ theme }) => theme.colors.onSurface};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  line-height: ${({ theme }) => theme.typography.lineHeights.normal};
  pointer-events: none;
`;

export const StyledDateInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
`;
