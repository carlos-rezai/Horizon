import styled from "styled-components";

export const StyledTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
`;

export const StyledIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
`;

export const StyledNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  h1 {
    margin: 0;
  }
`;

export const StyledMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 7px;
`;

export const StyledSubtitle = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

export const StyledBalanceRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-top: 22px;
  padding-top: 22px;
  border-top: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledBalanceValue = styled.div<{ $isDebt: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme, $isDebt }) =>
    $isDebt ? theme.colors.error : theme.colors.onSurface};
`;

export const StyledConfirmRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
`;

export const StyledErrorText = styled.p`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.error};
  font-size: 13px;
  text-align: right;
`;
