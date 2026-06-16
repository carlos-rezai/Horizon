import React from "react";
import {
  StyledRow,
  StyledIconBox,
  StyledBody,
  StyledTitle,
  StyledDesc,
  StyledControl,
} from "./SettingRow.styles";

interface SettingRowProps {
  /** Leading icon (e.g. a Lucide icon element) shown in a tinted box. */
  icon: React.ReactNode;
  title: string;
  desc: string;
  /** Right-aligned control such as a Toggle or Badge. */
  children?: React.ReactNode;
  /** Omits the bottom hairline when this is the last row in a group. */
  last?: boolean;
}

export default function SettingRow({
  icon,
  title,
  desc,
  children,
  last = false,
}: SettingRowProps) {
  return (
    <StyledRow $last={last}>
      <StyledIconBox aria-hidden>{icon}</StyledIconBox>
      <StyledBody>
        <StyledTitle>{title}</StyledTitle>
        <StyledDesc>{desc}</StyledDesc>
      </StyledBody>
      {children != null && <StyledControl>{children}</StyledControl>}
    </StyledRow>
  );
}
