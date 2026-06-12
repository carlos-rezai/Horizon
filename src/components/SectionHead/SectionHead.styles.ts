import styled from "styled-components";

export const StyledSectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space4}px;
  margin-bottom: 18px;
`;

export const StyledLabel = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.label.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-bottom: 7px;
`;

export const StyledTitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.h2.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h2.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h2.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.h2.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.h2.letterSpacing};
  color: ${({ theme }) => theme.colors.onSurface};
`;
