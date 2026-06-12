import React from "react";
import { StyledInput, StyledInputWrapper, StyledPrefix } from "./Input.styles";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Static text rendered before the field in the mono figure font. */
  prefix?: string;
}

export default function Input({ prefix, ...props }: InputProps) {
  if (prefix === undefined) {
    return <StyledInput {...props} />;
  }

  return (
    <StyledInputWrapper>
      <StyledPrefix>{prefix}</StyledPrefix>
      <StyledInput {...props} />
    </StyledInputWrapper>
  );
}
