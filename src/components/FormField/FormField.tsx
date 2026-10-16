import React from "react";
import {
  StyledFormField,
  StyledLabel,
  StyledHint,
  StyledErrorMessage,
} from "./FormField.styles";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  /** A small dim line below the control, above any error. */
  hint?: string;
  children: React.ReactNode;
}

export default function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: FormFieldProps) {
  return (
    <StyledFormField>
      <StyledLabel htmlFor={htmlFor}>{label}</StyledLabel>
      {children}
      {hint && <StyledHint>{hint}</StyledHint>}
      {error && <StyledErrorMessage role="alert">{error}</StyledErrorMessage>}
    </StyledFormField>
  );
}
