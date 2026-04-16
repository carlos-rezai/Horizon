import React from "react";
import {
  StyledFormField,
  StyledLabel,
  StyledErrorMessage,
} from "./FormField.styles";

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export default function FormField({ label, error, children }: FormFieldProps) {
  return (
    <StyledFormField>
      <StyledLabel>{label}</StyledLabel>
      {children}
      {error && <StyledErrorMessage role="alert">{error}</StyledErrorMessage>}
    </StyledFormField>
  );
}
