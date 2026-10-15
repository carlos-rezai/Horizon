// @vitest-environment jsdom
// jsdom because the barrel re-exports the API base, which reads `window`.
import { describe, it, expect } from "vitest";
import * as utils from "./index";
import { effectiveSTMonths } from "./projection/projection";

describe("the utils barrel", () => {
  it("exports effectiveSTMonths", () => {
    expect(utils).toHaveProperty("effectiveSTMonths", effectiveSTMonths);
  });
});
