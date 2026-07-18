import { describe, it, expect } from "vitest";
import { attributeIssues, type AttributableIssue } from "./importErrors";

/**
 * The committed payload is `rows.filter(r => r.included)` — a *filtered* array.
 * A Zod issue's `["rows", n, field]` path indexes that filtered array, never
 * the wizard's `rows` state. These fixtures model that gap: a 50-row table
 * where only rows 40 and 41 were included, so payload index 0 is row 40.
 */
const committedRowIds = ["row-40", "row-41"];

const descriptionIssue = (n: number): AttributableIssue => ({
  path: ["rows", n, "description"],
  message: "String must contain at least 1 character(s)",
});

describe("attributeIssues", () => {
  it("attributes a row issue through the FILTERED payload — payload index 0 is row 40, never rows[0]", () => {
    const result = attributeIssues([descriptionIssue(0)], committedRowIds);

    expect(result.byRowId.get("row-40")).toEqual(["description"]);
    expect(result.byRowId.has("row-41")).toBe(false);
    // The trap: a naive reader would blame rows[0]; there is no such id here.
    expect([...result.byRowId.keys()]).toEqual(["row-40"]);
    expect(result.unattributed).toEqual([]);
  });

  it("attributes the nth issue to the nth committed row's id", () => {
    const result = attributeIssues([descriptionIssue(1)], committedRowIds);

    expect(result.byRowId.get("row-41")).toEqual(["description"]);
    expect(result.byRowId.has("row-40")).toBe(false);
  });

  it("attributes multiple issues on one row all to that row", () => {
    const ids = ["a", "b", "c"];
    const result = attributeIssues(
      [descriptionIssue(1), descriptionIssue(1)],
      ids
    );

    expect(result.byRowId.get("b")).toEqual(["description", "description"]);
    expect(result.byRowId.has("a")).toBe(false);
    expect(result.byRowId.has("c")).toBe(false);
  });

  it("sends a non-row path to unattributed and keeps its message", () => {
    const result = attributeIssues(
      [{ path: ["accountId"], message: "Account not found" }],
      committedRowIds
    );

    expect(result.byRowId.size).toBe(0);
    expect(result.unattributed).toEqual(["Account not found"]);
  });

  it("sends a nested non-row path (malformed mapping) to unattributed", () => {
    const result = attributeIssues(
      [{ path: ["mapping", "date"], message: "Required" }],
      committedRowIds
    );

    expect(result.byRowId.size).toBe(0);
    expect(result.unattributed).toEqual(["Required"]);
  });

  it("ignores an out-of-range row index rather than throwing or blaming a row", () => {
    const result = attributeIssues([descriptionIssue(5)], committedRowIds);

    expect(result.byRowId.size).toBe(0);
    expect(result.unattributed).toEqual([]);
  });

  it("ignores a row path with a non-numeric index rather than throwing", () => {
    const result = attributeIssues(
      [{ path: ["rows", "x", "description"], message: "boom" }],
      committedRowIds
    );

    expect(result.byRowId.size).toBe(0);
    expect(result.unattributed).toEqual([]);
  });

  it("ignores a row path with no field segment rather than throwing", () => {
    const result = attributeIssues(
      [{ path: ["rows", 0], message: "boom" }],
      committedRowIds
    );

    expect(result.byRowId.size).toBe(0);
    expect(result.unattributed).toEqual([]);
  });

  it("ignores an empty path rather than throwing", () => {
    const result = attributeIssues(
      [{ path: [], message: "boom" }],
      committedRowIds
    );

    expect(result.byRowId.size).toBe(0);
    expect(result.unattributed).toEqual([]);
  });

  it("ignores a valid row path whose field is not a known blocker — the error floor covers it", () => {
    const result = attributeIssues(
      [{ path: ["rows", 0, "amount"], message: "Expected number" }],
      committedRowIds
    );

    expect(result.byRowId.size).toBe(0);
    expect(result.unattributed).toEqual([]);
  });

  it("returns empty results for no issues", () => {
    const result = attributeIssues([], committedRowIds);

    expect(result.byRowId.size).toBe(0);
    expect(result.unattributed).toEqual([]);
  });
});
