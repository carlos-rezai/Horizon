import styled from "styled-components";

export const StyledPageHeader = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space6}px;
  margin-bottom: ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledOverline = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.label.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledSubtitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.bodyMd.fontSize};
  line-height: ${({ theme }) => theme.typography.scale.bodyMd.lineHeight};
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  margin-top: 6px;
`;

export const StyledActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space3}px;
  flex-shrink: 0;
`;
