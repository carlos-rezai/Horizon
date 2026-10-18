import styled, { css } from "styled-components";
import type { ControlSize } from "../../tokens";
import { fieldChrome } from "../fieldChrome/fieldChrome";

export const StyledInput = styled.input<{
  $size: ControlSize;
  $hasTrailingIcon?: boolean;
}>`
  ${fieldChrome}

  ${({ $hasTrailingIcon, theme }) =>
    $hasTrailingIcon &&
    css`
      padding-right: ${theme.spacing.space8}px;
    `}

  &::placeholder {
    color: ${({ theme }) => theme.colors.onSurfaceVariant};
  }

  &[aria-invalid="true"]::placeholder {
    color: ${({ theme }) => theme.colors.error};
  }
`;

export const StyledInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledFieldBox = styled.div`
  position: relative;
  display: block;
  width: 100%;
`;

export const StyledTrailingIcon = styled.span`
  position: absolute;
  top: 50%;
  right: ${({ theme }) => theme.spacing.space3}px;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  pointer-events: none;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledPrefix = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  flex-shrink: 0;
`;
