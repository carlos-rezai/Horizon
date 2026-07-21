import styled from "styled-components";

export const StyledSection = styled.div`
  min-width: 0;
`;

export const StyledErrorText = styled.p`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
`;
