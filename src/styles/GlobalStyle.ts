import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-text-size-adjust: 100%;
    /* Reserve the scrollbar gutter so pages whose height crosses the viewport
       don't toggle the window scrollbar and shift the whole app horizontally. */
    scrollbar-gutter: stable;
  }

  /* Scrollbars — thin, quiet. Ported from the canonical prototype; without it
     every scrolling surface falls back to the native OS scrollbar, which reads
     as foreign against the ink surfaces. WebKit-only because Horizon ships as
     an Electron (Chromium) renderer, which is the prototype's assumption too.

     A surface that wants no scrollbar at all overrides this from its own
     class — see the Tabs strip, which uses chevrons as its affordance. */
  *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  /* The transparent border plus content-box clipping is what insets the thumb,
     so it reads as floating in the gutter rather than filling it. */
  *::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.surfaceContainerHigher};
    border-radius: 999px;
    border: 3px solid transparent;
    background-clip: content-box;
  }

  *::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHighest};
    background-clip: content-box;
  }

  *::-webkit-scrollbar-track {
    background: transparent;
  }

  body {
    background-color: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.onSurface};
    font-family: ${({ theme }) => theme.typography.fontFamily.ui};
    font-size: ${({ theme }) => theme.typography.sizes.md}px;
    line-height: ${({ theme }) => theme.typography.lineHeights.normal};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
    font: inherit;
  }

  input,
  select,
  textarea {
    font: inherit;
  }

  ul,
  ol {
    list-style: none;
  }
`;
