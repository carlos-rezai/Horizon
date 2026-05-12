import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { breakpoints } from "./breakpoints";
import { radius } from "./radius";
import { layout } from "./layout";
import { transitions } from "./transitions";

export const accountIconSet: string[] = [
  "Wallet",
  "PiggyBank",
  "Home",
  "CreditCard",
  "TrendingUp",
  "Briefcase",
  "Building",
  "DollarSign",
];

export const theme = {
  colors,
  spacing,
  typography,
  breakpoints,
  radius,
  layout,
  transitions,
};

export type MeridianTheme = typeof theme;

export {
  colors,
  spacing,
  typography,
  breakpoints,
  radius,
  layout,
  transitions,
};
