import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { breakpoints } from "./breakpoints";

export const theme = {
  colors,
  spacing,
  typography,
  breakpoints,
};

export type MeridianTheme = typeof theme;

export { colors, spacing, typography, breakpoints };
