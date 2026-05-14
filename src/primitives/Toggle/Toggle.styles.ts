import styled from "styled-components";

export const StyledToggle = styled.input`
  appearance: none;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background-color: ${({ theme }) => theme.colors.outlineVariant};
  position: relative;
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast};
  flex-shrink: 0;

  &::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: ${({ theme }) => theme.colors.onSurfaceVariant};
    transition:
      transform ${({ theme }) => theme.transitions.fast},
      background-color ${({ theme }) => theme.transitions.fast};
  }

  &:checked {
    background-color: ${({ theme }) => theme.colors.primary};
  }

  &:checked::after {
    transform: translateX(20px);
    background-color: ${({ theme }) => theme.colors.onPrimary};
  }
`;
