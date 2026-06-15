import styled from "styled-components";

export const StyledImportView = styled.div`
  display: flex;
  flex-direction: column;
`;

export const StyledDropzoneWrap = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space6}px;
`;

export const StyledHistoryCard = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space5}px;
  background: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.card}px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
`;

export const StyledErrorText = styled.p`
  color: ${({ theme }) => theme.colors.error};
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.body.fontSize};
`;
