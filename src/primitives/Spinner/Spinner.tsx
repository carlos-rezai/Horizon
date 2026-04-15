import { StyledSpinner } from "./Spinner.styles";

type SpinnerSize = "small" | "medium" | "large";

interface SpinnerProps {
  size?: SpinnerSize;
}

export default function Spinner({ size = "medium" }: SpinnerProps) {
  return <StyledSpinner $size={size} aria-label="Loading" role="status" />;
}
