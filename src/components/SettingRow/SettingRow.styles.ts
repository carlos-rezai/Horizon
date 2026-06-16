import styled from "styled-components";

export const StyledRow = styled.div<{ $last: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: 18px 4px;
  border-bottom: ${({ $last, theme }) =>
    $last ? "none" : `1px solid ${theme.colors.lineFaint}`};
`;

export const StyledIconBox = styled.div`
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const StyledTitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.bodyMd.fontSize};
  line-height: ${({ theme }) => theme.typography.scale.bodyMd.lineHeight};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledDesc = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  line-height: ${({ theme }) => theme.typography.scale.body.lineHeight};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-top: 2px;
`;

export const StyledControl = styled.div`
  flex-shrink: 0;
`;
