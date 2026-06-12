import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "styled-components";
import { theme } from "./tokens";
import { GlobalStyle } from "./styles/GlobalStyle";
import { Fonts } from "./styles/Fonts";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <Fonts />
      <GlobalStyle />
      <App />
    </ThemeProvider>
  </StrictMode>
);
