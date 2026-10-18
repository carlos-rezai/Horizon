import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";
import Input from "../Input/Input";
import { Wrapper } from "./DatePicker.styles";
import type { ControlSize } from "../../tokens";

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  "aria-label"?: string;
  /** Control Height of the field; matches the Button of the same size. */
  size?: ControlSize;
}

function isoToDate(iso: string): Date {
  // Accepts both `YYYY-MM-DD` and month-only `YYYY-MM` values (the latter
  // resolving to the first of the month) so month-scoped callers can pass their
  // stored value straight through.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
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
  size = "md",
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
        customInput={
          <Input
            aria-label={ariaLabel}
            size={size}
            trailingIcon={<Calendar size={15} />}
          />
        }
        placeholderText="DD.MM.YYYY"
        popperPlacement="bottom-start"
        // Position the calendar with a fixed strategy so it's anchored to the
        // viewport and escapes the modal dialog's `overflow: auto` clipping —
        // otherwise, in a short modal the calendar is cut off and forces a
        // scroll instead of opening over the modal.
        popperProps={{ strategy: "fixed" }}
      />
    </Wrapper>
  );
}
