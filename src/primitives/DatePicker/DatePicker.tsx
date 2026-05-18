import React from "react";
import { Wrapper, DisplayText, StyledDateInput } from "./DatePicker.styles";

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  minDate?: string;
  maxDate?: string;
  "aria-label"?: string;
}

export default function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [year, month, day] = value.split("-");
  const display = `${day}.${month}.${year}`;

  return (
    <Wrapper>
      <DisplayText>{display}</DisplayText>
      <StyledDateInput
        type="date"
        aria-label={ariaLabel}
        value={value}
        min={minDate}
        max={maxDate}
        onChange={(e) => onChange(e.target.value)}
        readOnly={false}
      />
    </Wrapper>
  );
}
