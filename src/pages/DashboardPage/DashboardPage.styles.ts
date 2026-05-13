import styled from "styled-components";

export const StyledDashboard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space8}px;
`;

export const StyledSection = styled.section``;

export const StyledErrorText = styled.span`
  color: ${({ theme }) => theme.colors.error};
`;
