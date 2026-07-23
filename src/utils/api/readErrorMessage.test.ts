// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readErrorMessage } from "./readErrorMessage";

describe("readErrorMessage", () => {
  it("reads the { error } message off a failed response body", async () => {
    const res = { json: async () => ({ error: "Name already exists" }) };

    await expect(readErrorMessage(res as Response, "fallback")).resolves.toBe(
      "Name already exists"
    );
  });

  it("falls back when the body has no error field", async () => {
    const res = { json: async () => ({}) };

    await expect(readErrorMessage(res as Response, "fallback")).resolves.toBe(
      "fallback"
    );
  });

  it("falls back when the body is not JSON", async () => {
    const res = {
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    };

    await expect(readErrorMessage(res as Response, "fallback")).resolves.toBe(
      "fallback"
    );
  });
});
