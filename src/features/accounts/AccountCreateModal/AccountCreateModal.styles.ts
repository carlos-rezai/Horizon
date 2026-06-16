import styled from "styled-components";

export const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
  min-width: ${({ theme }) => theme.layout.narrowModalWidth}px;
`;

export const StyledActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space3}px;
  justify-content: flex-end;
  padding-top: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledErrorText = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.error};
  margin: 0;
`;

export const StyledIconGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

interface StyledIconButtonProps {
  $selected: boolean;
}

export const StyledIconButton = styled.button<StyledIconButtonProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.space2}px;
  border-radius: 8px;
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.primary : "transparent"};
  background-color: ${({ $selected, theme }) =>
    $selected
      ? theme.colors.primaryContainer + "26"
      : theme.colors.surfaceVariant};
  color: ${({ theme }) => theme.colors.onSurface};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }
`;

export const StyledToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: 14px 16px;
  background: ${({ theme }) => theme.colors.surfaceContainerLow};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  cursor: pointer;
`;

export const StyledToggleIcon = styled.span<{ $active: boolean }>`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.onSurfaceDim};
  transition: color 0.15s ease;
`;

export const StyledToggleText = styled.div`
  flex: 1;
  min-width: 0;
`;

export const StyledToggleTitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.bodyMd.fontSize};
  line-height: ${({ theme }) => theme.typography.scale.bodyMd.lineHeight};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledToggleDesc = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  line-height: ${({ theme }) => theme.typography.scale.body.lineHeight};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-top: 2px;
`;

export const StyledColorRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

interface StyledColorSwatchProps {
  $color: string;
  $selected: boolean;
}

export const StyledColorSwatch = styled.button<StyledColorSwatchProps>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.primary : "transparent"};
  background-color: ${({ $color }) => $color};
  cursor: pointer;
  padding: 0;
  outline: none;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;
