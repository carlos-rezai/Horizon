import React from "react";
import { StyledSelect } from "./Select.styles";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export default function Select(props: SelectProps) {
  return <StyledSelect {...props} />;
}
