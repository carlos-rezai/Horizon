import React from "react";
import { StyledText } from "./Text.styles";

type TextSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: TextSize;
  tabular?: boolean;
}

export default function Text({
  size = "md",
  tabular = false,
  ...props
}: TextProps) {
  return <StyledText $size={size} $tabular={tabular} {...props} />;
}
