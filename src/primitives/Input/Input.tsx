import React from "react";
import {
  StyledFieldBox,
  StyledInput,
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
  /** Static text inside the field's leading edge, in the mono figure font. */
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
  const hasPrefix = prefix !== undefined;
  const input = (
    <StyledInput
      $size={size}
      $hasTrailingIcon={hasTrailingIcon}
      $hasPrefix={hasPrefix}
      {...props}
    />
  );

  if (!hasTrailingIcon && !hasPrefix) {
    return input;
  }

  return (
    <StyledFieldBox>
      {hasPrefix && <StyledPrefix>{prefix}</StyledPrefix>}
      {input}
      {hasTrailingIcon && (
        <StyledTrailingIcon aria-hidden="true">
          {trailingIcon}
        </StyledTrailingIcon>
      )}
    </StyledFieldBox>
  );
}
