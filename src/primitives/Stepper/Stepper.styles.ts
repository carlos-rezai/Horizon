import styled from "styled-components";
import type { ControlSize } from "../../tokens";
import { fieldChrome } from "../fieldChrome/fieldChrome";
import { focusRing } from "../focusRing/focusRing";

/** The Stepper box wears the Field Chrome at Control Height md, sized to its
 *  two buttons and value rather than filling its row. */
export const Wrapper = styled.div<{ $size: ControlSize }>`
  ${fieldChrome}
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  width: auto;
  padding: 0 ${({ theme }) => theme.spacing.space2}px;
`;

export const Value = styled.span`
  min-width: 2ch;
  text-align: center;
  color: ${({ theme }) => theme.colors.onSurface};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-variant-numeric: tabular-nums;
`;

export const StepButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  border-radius: ${({ theme }) => theme.radius.button}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  cursor: pointer;
  padding: 0;
  line-height: 1;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
    color: ${({ theme }) => theme.colors.onSurface};
  }

  ${focusRing}
`;
