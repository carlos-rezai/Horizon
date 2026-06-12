import React from "react";
import {
  StyledEmptyState,
  StyledIcon,
  StyledTitle,
  StyledHint,
  StyledAction,
} from "./EmptyState.styles";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon,
  title,
  hint,
  action,
}: EmptyStateProps) {
  return (
    <StyledEmptyState>
      {icon && <StyledIcon>{icon}</StyledIcon>}
      <StyledTitle>{title}</StyledTitle>
      {hint && <StyledHint>{hint}</StyledHint>}
      {action && <StyledAction>{action}</StyledAction>}
    </StyledEmptyState>
  );
}
