import { describe, it, expect } from "vitest";
import { apiErrorMessage } from "./apiError";

describe("apiErrorMessage", () => {
  it("prefers the first validation issue", () => {
    expect(
      apiErrorMessage(
        {
          issues: [
            { message: "A transfer cannot link to itself" },
            { message: "x" },
          ],
          error: "Bad request",
        },
        "Failed"
      )
    ).toBe("A transfer cannot link to itself");
  });

  it("falls back to the route's error", () => {
    expect(apiErrorMessage({ error: "Account not found" }, "Failed")).toBe(
      "Account not found"
    );
  });

  it("falls back to the route's error when issues is empty", () => {
    expect(
      apiErrorMessage({ issues: [], error: "Account not found" }, "Failed")
    ).toBe("Account not found");
  });

  it("falls back to the caller's message for an empty or unreadable body", () => {
    expect(apiErrorMessage({}, "Failed")).toBe("Failed");
    expect(apiErrorMessage(null, "Failed")).toBe("Failed");
    expect(apiErrorMessage("oops", "Failed")).toBe("Failed");
  });
});
