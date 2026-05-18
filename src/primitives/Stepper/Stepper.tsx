import React from "react";
import { Wrapper, Value, StepButton } from "./Stepper.styles";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  "aria-label"?: string;
}

export default function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
}: StepperProps) {
  function handleDecrement() {
    const next = value - step;
    onChange(min !== undefined ? Math.max(min, next) : next);
  }

  function handleIncrement() {
    const next = value + step;
    onChange(max !== undefined ? Math.min(max, next) : next);
  }

  return (
    <Wrapper>
      <StepButton
        type="button"
        aria-label="Decrement"
        onClick={handleDecrement}
      >
        −
      </StepButton>
      <Value>{value}</Value>
      <StepButton
        type="button"
        aria-label="Increment"
        onClick={handleIncrement}
      >
        +
      </StepButton>
    </Wrapper>
  );
}
