const breakpointValues = {
  sm: 480,
  md: 768,
  lg: 1024,
} as const;

type BreakpointKey = keyof typeof breakpointValues;

export const breakpoints = {
  ...breakpointValues,
  up: (key: BreakpointKey): string =>
    `@media (min-width: ${breakpointValues[key]}px)`,
};
