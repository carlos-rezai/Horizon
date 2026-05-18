import { forwardRef } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { InputHTMLAttributes } from "react";
import { Wrapper, StyledDateInput } from "./DatePicker.styles";

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  minDate?: string;
  maxDate?: string;
  "aria-label"?: string;
}

const DateInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>((props, ref) => <StyledDateInput {...props} ref={ref} />);

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  return (
    <Wrapper>
      <ReactDatePicker
        selected={value ? isoToDate(value) : null}
        onChange={(date: Date | null) => {
          if (date) onChange(dateToIso(date));
        }}
        dateFormat="dd.MM.yyyy"
        minDate={minDate ? isoToDate(minDate) : undefined}
        maxDate={maxDate ? isoToDate(maxDate) : undefined}
        customInput={<DateInput aria-label={ariaLabel} />}
        placeholderText="DD.MM.YYYY"
        popperPlacement="bottom-start"
      />
    </Wrapper>
  );
}
