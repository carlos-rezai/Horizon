import React from "react";
import { StyledCard } from "./Card.styles";

interface CardProps {
  elevated?: boolean;
  children: React.ReactNode;
}

export default function Card({ elevated = false, children }: CardProps) {
  return <StyledCard $elevated={elevated}>{children}</StyledCard>;
}
