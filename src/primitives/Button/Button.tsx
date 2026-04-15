import React from "react";
import { StyledButton } from "./Button.styles";

type Variant = "primary" | "secondary" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export default function Button({
  variant = "primary",
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (disabled) return;
    onClick?.(e);
  }

  return (
    <StyledButton
      $variant={variant}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    />
  );
}
