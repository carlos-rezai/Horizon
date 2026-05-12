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
