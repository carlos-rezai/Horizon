import { createGlobalStyle } from "styled-components";

// Self-hosted woff2 (offline-first — no CDN). Vite resolves each import to a
// bundled asset URL. Space Grotesk ships as a single variable file per subset
// (weight range 400–700); IBM Plex Mono ships one static file per weight.
import spaceGroteskLatin from "../assets/fonts/space-grotesk-latin.woff2";
import spaceGroteskLatinExt from "../assets/fonts/space-grotesk-latin-ext.woff2";
import ibmPlexMono400Latin from "../assets/fonts/ibm-plex-mono-400-latin.woff2";
import ibmPlexMono400LatinExt from "../assets/fonts/ibm-plex-mono-400-latin-ext.woff2";
import ibmPlexMono500Latin from "../assets/fonts/ibm-plex-mono-500-latin.woff2";
import ibmPlexMono500LatinExt from "../assets/fonts/ibm-plex-mono-500-latin-ext.woff2";
import ibmPlexMono600Latin from "../assets/fonts/ibm-plex-mono-600-latin.woff2";
import ibmPlexMono600LatinExt from "../assets/fonts/ibm-plex-mono-600-latin-ext.woff2";

const LATIN_EXT_RANGE =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";
const LATIN_RANGE =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";

export const Fonts = createGlobalStyle`
  /* Space Grotesk — variable, weights 400–700 */
  @font-face {
    font-family: 'Space Grotesk';
    font-style: normal;
    font-weight: 400 700;
    font-display: swap;
    src: url(${spaceGroteskLatinExt}) format('woff2');
    unicode-range: ${LATIN_EXT_RANGE};
  }
  @font-face {
    font-family: 'Space Grotesk';
    font-style: normal;
    font-weight: 400 700;
    font-display: swap;
    src: url(${spaceGroteskLatin}) format('woff2');
    unicode-range: ${LATIN_RANGE};
  }

  /* IBM Plex Mono — static weights 400 / 500 / 600 */
  @font-face {
    font-family: 'IBM Plex Mono';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url(${ibmPlexMono400LatinExt}) format('woff2');
    unicode-range: ${LATIN_EXT_RANGE};
  }
  @font-face {
    font-family: 'IBM Plex Mono';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url(${ibmPlexMono400Latin}) format('woff2');
    unicode-range: ${LATIN_RANGE};
  }
  @font-face {
    font-family: 'IBM Plex Mono';
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url(${ibmPlexMono500LatinExt}) format('woff2');
    unicode-range: ${LATIN_EXT_RANGE};
  }
  @font-face {
    font-family: 'IBM Plex Mono';
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url(${ibmPlexMono500Latin}) format('woff2');
    unicode-range: ${LATIN_RANGE};
  }
  @font-face {
    font-family: 'IBM Plex Mono';
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url(${ibmPlexMono600LatinExt}) format('woff2');
    unicode-range: ${LATIN_EXT_RANGE};
  }
  @font-face {
    font-family: 'IBM Plex Mono';
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url(${ibmPlexMono600Latin}) format('woff2');
    unicode-range: ${LATIN_RANGE};
  }
`;
