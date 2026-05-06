import { describe, expect, it } from "vitest";

import { resolveRendererConfig } from "./resolveRendererConfig";

describe("resolveRendererConfig", () => {
  it("returns dev renderer and localhost CORS when not packaged and flag is unset", () => {
    const config = resolveRendererConfig(false, {});

    expect(config.loadProdRenderer).toBe(false);
    expect(config.corsOrigin).toBe("http://localhost:5173");
  });

  it("returns prod renderer and wildcard CORS when packaged", () => {
    const config = resolveRendererConfig(true, {});

    expect(config.loadProdRenderer).toBe(true);
    expect(config.corsOrigin).toBe("*");
  });

  it("returns prod renderer and wildcard CORS when HORIZON_FORCE_PROD_RENDERER=1 and not packaged", () => {
    const config = resolveRendererConfig(false, {
      HORIZON_FORCE_PROD_RENDERER: "1",
    });

    expect(config.loadProdRenderer).toBe(true);
    expect(config.corsOrigin).toBe("*");
  });

  it("treats HORIZON_FORCE_PROD_RENDERER values other than '1' as unset", () => {
    for (const value of ["0", "true", "yes", "force"]) {
      const config = resolveRendererConfig(false, {
        HORIZON_FORCE_PROD_RENDERER: value,
      });

      expect(config.loadProdRenderer).toBe(false);
      expect(config.corsOrigin).toBe("http://localhost:5173");
    }
  });
});
