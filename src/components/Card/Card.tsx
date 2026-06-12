import React from "react";
import { StyledCard, AccentRail } from "./Card.styles";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  accent?: string;
  children: React.ReactNode;
}

export default function Card({
  elevated = false,
  accent,
  onClick,
  children,
  ...rest
}: CardProps) {
  return (
    <StyledCard
      $elevated={elevated}
      $clickable={Boolean(onClick)}
      onClick={onClick}
      data-testid="card"
      {...rest}
    >
      {accent && <AccentRail data-testid="card-accent" $accent={accent} />}
      {children}
    </StyledCard>
  );
}
