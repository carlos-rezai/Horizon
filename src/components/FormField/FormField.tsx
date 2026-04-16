import React from "react";
import {
  StyledFormField,
  StyledLabel,
  StyledErrorMessage,
} from "./FormField.styles";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}

export default function FormField({
  label,
  htmlFor,
  error,
  children,
}: FormFieldProps) {
  return (
    <StyledFormField>
      <StyledLabel htmlFor={htmlFor}>{label}</StyledLabel>
      {children}
      {error && <StyledErrorMessage role="alert">{error}</StyledErrorMessage>}
    </StyledFormField>
  );
}
