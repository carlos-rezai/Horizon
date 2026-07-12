import { describe, it, expect } from "vitest";
import { buildSeriesDescriptors, type SeriesAccount } from "./trajectory";

const COLORS = { liquid: "#E6B559", restschuld: "#CE8278" };

const GIRO: SeriesAccount = {
  id: "giro",
  name: "Everyday",
  color: "#4C8FBF",
  kind: "Girokonto",
};
const TAGES: SeriesAccount = {
  id: "tages",
  name: "Reserve",
  color: null,
  kind: "Tagesgeld",
};

describe("buildSeriesDescriptors", () => {
  it("leads with the Total Liquid SUM series, then one series per account", () => {
    const descriptors = buildSeriesDescriptors([GIRO, TAGES], false, COLORS);

    expect(descriptors.map((d) => d.key)).toEqual([
      "totalLiquid",
      "giro",
      "tages",
    ]);
    expect(descriptors[0]).toEqual({
      key: "totalLiquid",
      name: "Total Liquid",
      color: "#E6B559",
      kind: "liquid",
      dashed: false,
    });
  });

  it("preserves the given account order and marks each as a plain account line", () => {
    const descriptors = buildSeriesDescriptors([GIRO, TAGES], false, COLORS);
    const accountSeries = descriptors.filter((d) => d.kind === "account");

    expect(accountSeries.map((d) => d.name)).toEqual(["Everyday", "Reserve"]);
    expect(accountSeries.every((d) => !d.dashed)).toBe(true);
  });

  it("resolves a per-account colour, falling back to the kind colour when unset", () => {
    const descriptors = buildSeriesDescriptors([GIRO, TAGES], false, COLORS);

    // GIRO carries an explicit colour; TAGES has none and resolves by kind.
    expect(descriptors.find((d) => d.key === "giro")?.color).toBe("#4C8FBF");
    expect(descriptors.find((d) => d.key === "tages")?.color).not.toBe(
      "#4C8FBF"
    );
    expect(descriptors.find((d) => d.key === "tages")?.color).toBeTruthy();
  });

  it("appends a dashed Restschuld series only when a mortgage exists", () => {
    const withMortgage = buildSeriesDescriptors([GIRO], true, COLORS);
    const withoutMortgage = buildSeriesDescriptors([GIRO], false, COLORS);

    expect(withMortgage.at(-1)).toEqual({
      key: "restschuld",
      name: "Restschuld",
      color: "#CE8278",
      kind: "debt",
      dashed: true,
    });
    expect(withoutMortgage.some((d) => d.key === "restschuld")).toBe(false);
  });
});
