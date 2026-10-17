import styled from "styled-components";

// day · description · category · amount — SpendingList's row rhythm, so the
// two cards read as one page.
export const ROW_COLUMNS = ["44px", "1fr", "auto", "auto"];

export const StyledGroups = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space5}px;
`;

export const StyledGroupHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding-bottom: ${({ theme }) => theme.spacing.space2}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledGroupName = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.body.fontSize};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledBalance = styled.div`
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.space1}px;
`;

export const StyledBalanceCaption = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledNet = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: ${({ theme }) => theme.spacing.space2}px;
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;
