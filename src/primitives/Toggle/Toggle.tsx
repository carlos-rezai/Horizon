import { StyledToggle } from "./Toggle.styles";

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export default function Toggle({ checked, onChange }: Props) {
  return (
    <StyledToggle
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}
