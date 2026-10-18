// Control Height — the one height every pressable or typeable primitive
// (Button, Input, Select, DatePicker) takes from its `size` prop, so a
// field and a button of the same size line up. Button md stays at 40px,
// a recorded deviation from the Prototype's 38px.
export const sizing = {
  control: {
    sm: 32,
    md: 40,
    lg: 44,
  },
};

export type ControlSize = keyof typeof sizing.control;
