import styled from "styled-components";

export const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space6}px;
`;

export const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;
