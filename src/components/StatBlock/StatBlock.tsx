import React from "react";
import {
  StyledStatBlock,
  StyledLabel,
  StyledValue,
  StyledHint,
} from "./StatBlock.styles";

interface StatBlockProps {
  label: string;
  hint?: string;
  align?: "left" | "right";
  children: React.ReactNode;
}

export default function StatBlock({
  label,
  hint,
  align = "left",
  children,
}: StatBlockProps) {
  return (
    <StyledStatBlock $align={align}>
      <StyledLabel>{label}</StyledLabel>
      <StyledValue $align={align}>{children}</StyledValue>
      {hint && <StyledHint>{hint}</StyledHint>}
    </StyledStatBlock>
  );
}
