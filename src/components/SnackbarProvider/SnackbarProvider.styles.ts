import styled from "styled-components";

export const StyledStack = styled.div`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing.space6}px;
  right: ${({ theme }) => theme.spacing.space6}px;
  z-index: 1000;
  display: flex;
  flex-direction: column-reverse;
  gap: ${({ theme }) => theme.spacing.space3}px;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`;
