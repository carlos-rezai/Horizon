import React from "react";
import Heading from "../../primitives/Heading/Heading";
import {
  StyledPageHeader,
  StyledOverline,
  StyledSubtitle,
  StyledActions,
} from "./PageHeader.styles";

interface Props {
  text?: string;
  title?: string;
  overline?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({
  text,
  title,
  overline,
  subtitle,
  actions,
}: Props) {
  const headingText = title ?? text;
  return (
    <StyledPageHeader>
      <div>
        {overline && <StyledOverline>{overline}</StyledOverline>}
        <Heading level={1}>{headingText}</Heading>
        {subtitle && <StyledSubtitle>{subtitle}</StyledSubtitle>}
      </div>
      {actions && <StyledActions>{actions}</StyledActions>}
    </StyledPageHeader>
  );
}
