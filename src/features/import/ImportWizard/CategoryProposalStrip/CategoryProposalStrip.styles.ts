import styled from "styled-components";

/* One strip per Category Proposal above the review table: the proposed name
   and its row count, with Create category and Dismiss. */
export const StyledProposalStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  margin-bottom: 10px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ theme }) => theme.colors.surfaceContainerLow};
`;

export const StyledProposalText = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};

  svg {
    color: ${({ theme }) => theme.colors.primary};
  }

  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.onSurface};
  }
`;

export const StyledProposalActions = styled.div`
  display: flex;
  gap: 8px;
`;

export const StyledProposalError = styled.div`
  flex-basis: 100%;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.error};
`;
