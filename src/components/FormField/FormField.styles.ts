import styled from "styled-components";

export const StyledFormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledLabel = styled.label`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.label.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

/** StatBlock's hint, less its margin: the field's gap already spaces it. */
export const StyledHint = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  line-height: ${({ theme }) => theme.typography.scale.body.lineHeight};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledErrorMessage = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.error};
  line-height: ${({ theme }) => theme.typography.lineHeights.normal};
`;
