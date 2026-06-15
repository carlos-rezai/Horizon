import styled from "styled-components";

export const StyledIntro = styled.p`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  line-height: ${({ theme }) => theme.typography.scale.body.lineHeight};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin: -2px 0 0;
`;

export const StyledComingSoon = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space5}px;
  padding-top: ${({ theme }) => theme.spacing.space4}px;
  border-top: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.body.fontSize};
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;
