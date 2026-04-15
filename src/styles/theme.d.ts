import type { MeridianTheme } from "../tokens";

declare module "styled-components" {
  export interface DefaultTheme extends MeridianTheme {}
}
