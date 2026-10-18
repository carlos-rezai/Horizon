import React from "react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import { StyledButton } from "./Button.styles";
import type { ControlSize } from "../../tokens";

/** `ghostDanger`: ghost at rest, error colour on hover — for delete-style icon actions. */
type Variant = "primary" | "secondary" | "danger" | "ghost" | "ghostDanger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: ControlSize;
  /** Lucide icon name rendered before the label. */
  icon?: string;
  /** Lucide icon name rendered after the label. */
  iconRight?: string;
}

type IconComponent = React.ComponentType<LucideProps> | undefined;

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled,
  onClick,
  children,
  ...props
}: ButtonProps) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (disabled) return;
    onClick?.(e);
  }

  const LeadingIcon = icon
    ? (LucideIcons[icon as keyof typeof LucideIcons] as IconComponent)
    : undefined;
  const TrailingIcon = iconRight
    ? (LucideIcons[iconRight as keyof typeof LucideIcons] as IconComponent)
    : undefined;
  const iconOnly = (Boolean(icon) || Boolean(iconRight)) && children == null;

  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $iconOnly={iconOnly}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      {LeadingIcon ? <LeadingIcon size={16} /> : null}
      {children}
      {TrailingIcon ? <TrailingIcon size={16} /> : null}
    </StyledButton>
  );
}
