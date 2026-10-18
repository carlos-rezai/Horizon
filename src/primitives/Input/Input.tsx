import React from "react";
import {
  StyledFieldBox,
  StyledInput,
  StyledInputWrapper,
  StyledPrefix,
  StyledTrailingIcon,
} from "./Input.styles";
import type { ControlSize } from "../../tokens";

interface InputProps extends Omit<
  React.ComponentPropsWithRef<"input">,
  "size"
> {
  /** Control Height of the field; matches the Button of the same size. */
  size?: ControlSize;
  /** Static text rendered before the field in the mono figure font. */
  prefix?: string;
  /** Decorative icon inside the field's trailing edge; hidden from assistive tech. */
  trailingIcon?: React.ReactNode;
}

export default function Input({
  prefix,
  trailingIcon,
  size = "md",
  ...props
}: InputProps) {
  const hasTrailingIcon = trailingIcon !== undefined && trailingIcon !== null;
  const input = (
    <StyledInput $size={size} $hasTrailingIcon={hasTrailingIcon} {...props} />
  );
  const field = hasTrailingIcon ? (
    <StyledFieldBox>
      {input}
      <StyledTrailingIcon aria-hidden="true">{trailingIcon}</StyledTrailingIcon>
    </StyledFieldBox>
  ) : (
    input
  );

  if (prefix === undefined) {
    return field;
  }

  return (
    <StyledInputWrapper>
      <StyledPrefix>{prefix}</StyledPrefix>
      {field}
    </StyledInputWrapper>
  );
}
