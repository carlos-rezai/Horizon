import React from "react";
import { StyledInput, StyledInputWrapper, StyledPrefix } from "./Input.styles";
import type { ControlSize } from "../../tokens";

interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  /** Control Height of the field; matches the Button of the same size. */
  size?: ControlSize;
  /** Static text rendered before the field in the mono figure font. */
  prefix?: string;
}

export default function Input({ prefix, size = "md", ...props }: InputProps) {
  if (prefix === undefined) {
    return <StyledInput $size={size} {...props} />;
  }

  return (
    <StyledInputWrapper>
      <StyledPrefix>{prefix}</StyledPrefix>
      <StyledInput $size={size} {...props} />
    </StyledInputWrapper>
  );
}
