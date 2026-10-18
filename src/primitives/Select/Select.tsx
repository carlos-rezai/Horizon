import React from "react";
import { StyledSelect } from "./Select.styles";

import type { ControlSize } from "../../tokens";

interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> {
  /** Control Height of the field; matches the Button of the same size. */
  size?: ControlSize;
}

export default function Select({ size = "md", ...props }: SelectProps) {
  return <StyledSelect $size={size} {...props} />;
}
