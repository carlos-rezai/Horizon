import styled from "styled-components";

export const StyledDropzone = styled.div<{ $over: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space5}px;
  width: 100%;
  text-align: left;
  padding: 22px 24px;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.xl}px;
  border: 1.5px dashed
    ${({ theme, $over }) =>
      $over ? theme.colors.primary : theme.colors.outline};
  background: ${({ theme, $over }) =>
    $over ? theme.colors.primaryContainer : theme.colors.surfaceContainer};
  transition: all ${({ theme }) => theme.transitions.fast};
`;

export const StyledIconWrap = styled.div<{ $over: boolean }>`
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.lg}px;
  background: ${({ theme, $over }) =>
    $over ? theme.colors.primary : theme.colors.surfaceContainerHigh};
  color: ${({ theme, $over }) =>
    $over ? theme.colors.onPrimary : theme.colors.primary};
  transition: all ${({ theme }) => theme.transitions.fast};
`;

export const StyledText = styled.div`
  flex: 1;
  min-width: 0;
`;

export const StyledTitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.h2.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h2.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h2.fontWeight};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledHint = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-top: 3px;
`;
