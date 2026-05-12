import styled from "styled-components";

export const StyledInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
  color: ${({ theme }) => theme.colors.onSurface};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.button}px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  line-height: ${({ theme }) => theme.typography.lineHeights.normal};

  &::placeholder {
    color: ${({ theme }) => theme.colors.onSurfaceVariant};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
