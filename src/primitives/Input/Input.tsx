import React from "react";
import { StyledInput } from "./Input.styles";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input(props: InputProps) {
  return <StyledInput {...props} />;
}
