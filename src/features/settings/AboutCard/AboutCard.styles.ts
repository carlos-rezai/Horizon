import styled from "styled-components";

export const Layout = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space4}px;
`;

export const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

export const IdentityText = styled.div`
  min-width: 0;
`;

export const AppName = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.bodyMd.fontSize};
  line-height: ${({ theme }) => theme.typography.scale.bodyMd.lineHeight};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const AppDesc = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  line-height: ${({ theme }) => theme.typography.scale.body.lineHeight};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-top: 2px;
`;

export const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space5}px;
`;

export const Version = styled.div`
  text-align: left;
`;

export const VersionLabel = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-bottom: 5px;
`;

export const VersionValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 14px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;
