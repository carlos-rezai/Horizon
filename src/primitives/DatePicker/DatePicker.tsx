import { forwardRef } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { InputHTMLAttributes } from "react";
import { Calendar } from "lucide-react";
import {
  Wrapper,
  StyledDateInput,
  StyledCalendarIcon,
} from "./DatePicker.styles";

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
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
  disabled,
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
        disabled={disabled}
        customInput={<DateInput aria-label={ariaLabel} />}
        placeholderText="DD.MM.YYYY"
        popperPlacement="bottom-start"
        // Position the calendar with a fixed strategy so it's anchored to the
        // viewport and escapes the modal dialog's `overflow: auto` clipping —
        // otherwise, in a short modal the calendar is cut off and forces a
        // scroll instead of opening over the modal.
        popperProps={{ strategy: "fixed" }}
      />
      <StyledCalendarIcon aria-hidden="true">
        <Calendar size={15} />
      </StyledCalendarIcon>
    </Wrapper>
  );
}
