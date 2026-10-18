import styled from "styled-components";
import type { ControlSize } from "../../tokens";
import { fieldChrome } from "../fieldChrome/fieldChrome";

export const StyledSelect = styled.select<{ $size: ControlSize }>`
  ${fieldChrome}
  cursor: pointer;
  appearance: none;

  &:disabled {
    cursor: not-allowed;
  }
`;
