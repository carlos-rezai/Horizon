import React from "react";
import {
  StyledSectionHead,
  StyledLabel,
  StyledTitle,
} from "./SectionHead.styles";

interface SectionHeadProps {
  label?: string;
  title?: string;
  right?: React.ReactNode;
}

export default function SectionHead({ label, title, right }: SectionHeadProps) {
  return (
    <StyledSectionHead>
      <div>
        {label && <StyledLabel>{label}</StyledLabel>}
        {title && <StyledTitle>{title}</StyledTitle>}
      </div>
      {right}
    </StyledSectionHead>
  );
}
