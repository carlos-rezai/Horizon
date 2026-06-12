import styled from "styled-components";

export const StyledEmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledIcon = styled.div`
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.radius.xl}px;
  background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-bottom: ${({ theme }) => theme.spacing.space1}px;
`;

export const StyledTitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.h2.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h2.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h2.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.h2.lineHeight};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledHint = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.body.fontSize};
  line-height: ${({ theme }) => theme.typography.scale.body.lineHeight};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  max-width: 320px;
`;

export const StyledAction = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space2}px;
`;
