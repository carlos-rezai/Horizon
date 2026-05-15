import styled from "styled-components";

export const VersionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space1}px;
`;

export const VersionText = styled.span`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
`;
