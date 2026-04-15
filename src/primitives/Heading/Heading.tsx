import React from "react";
import { StyledH1, StyledH2, StyledH3, StyledH4 } from "./Heading.styles";

type Level = 1 | 2 | 3 | 4;

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: Level;
}

const elements = {
  1: StyledH1,
  2: StyledH2,
  3: StyledH3,
  4: StyledH4,
} as const;

export default function Heading({ level = 1, ...props }: HeadingProps) {
  const Element = elements[level];
  return <Element {...props} />;
}
