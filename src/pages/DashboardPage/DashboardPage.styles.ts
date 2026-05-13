import styled from "styled-components";

export const StyledDashboard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space8}px;
`;

export const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    "mortgage-countdown mortgage-countdown"
    "accounts           plan";
  gap: ${({ theme }) => theme.spacing.space8}px;
`;

export const StyledSection = styled.section<{ $gridArea: string }>`
  grid-area: ${({ $gridArea }) => $gridArea};
`;

export const StyledAccountsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledAccountsHeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledErrorText = styled.span`
  color: ${({ theme }) => theme.colors.error};
`;
