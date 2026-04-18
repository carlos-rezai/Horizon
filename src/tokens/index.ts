import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { breakpoints } from "./breakpoints";
import { radius } from "./radius";

export const theme = {
  colors,
  spacing,
  typography,
  breakpoints,
  radius,
};

export type MeridianTheme = typeof theme;

export { colors, spacing, typography, breakpoints, radius };
