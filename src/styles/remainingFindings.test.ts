import { describe, it, expect } from "vitest";
import * as primitives from "../primitives";

// Issue #275 — the primitives index and the remaining Audit Findings. Each
// guard reads the sources raw, as the alignment-owner and font-faces tests do,
// so it sees what the author wrote. The rendered behaviour of each finding is
// pinned beside the unit it belongs to; these guards hold what only the source
// can show: who imports what, and which local controls still carry a ring.

/** Each `export const Name = styled…` block, by export name. */
function styledBlocks(
  source: string
): Array<{ name: string; tag: string; body: string }> {
  const starts = [
    ...source.matchAll(/export const (\w+)\s*=\s*styled(?:\.(\w+))?/g),
  ];
  return starts.map((match, i) => ({
    name: match[1],
    tag: match[2] ?? "",
    body: source.slice(match.index, starts[i + 1]?.index ?? source.length),
  }));
}

function block(source: string | undefined, name: string): string | undefined {
  return styledBlocks(source ?? "").find((b) => b.name === name)?.body;
}

// ---------------------------------------------------------------------------
// Finding 35 — every primitive is exported from the index, and Toggle and
// SwatchPicker are imported only through it.
// ---------------------------------------------------------------------------

const primitiveIndex = Object.values(
  import.meta.glob("../primitives/index.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>
)[0];

/** Each PascalCase primitive folder, from the component file it holds. */
const primitiveFolders = Object.keys(
  import.meta.glob(["../primitives/*/*.tsx", "!../primitives/**/*.test.tsx"])
)
  .map((path) => path.split("/"))
  .filter(([, , folder, file]) => file === `${folder}.tsx`)
  .map(([, , folder]) => folder);

const appSources = import.meta.glob(
  [
    "../features/**/*.{ts,tsx}",
    "../components/**/*.{ts,tsx}",
    "../layouts/**/*.{ts,tsx}",
    "../pages/**/*.{ts,tsx}",
    "../hooks/**/*.{ts,tsx}",
    "!../**/*.test.{ts,tsx}",
  ],
  { query: "?raw", import: "default", eager: true }
) as Record<string, string>;

describe("Audit Finding 35 — the primitives index", () => {
  it("exports Toggle and SwatchPicker", () => {
    const exported = primitives as Record<string, unknown>;
    expect(typeof exported.Toggle).toBe("function");
    expect(typeof exported.SwatchPicker).toBe("function");
  });

  it("exports every primitive folder", () => {
    expect(primitiveFolders.length).toBeGreaterThan(18);
    const missing = primitiveFolders.filter(
      (folder) =>
        !new RegExp(
          `\\{ default as ${folder} \\} from "\\./${folder}/${folder}"`
        ).test(primitiveIndex ?? "")
    );
    expect(missing).toEqual([]);
  });

  it("leaves no deep import of Toggle or SwatchPicker outside the primitives", () => {
    expect(Object.keys(appSources).length).toBeGreaterThan(50);
    const offenders = Object.entries(appSources)
      .filter(([, source]) =>
        /primitives\/(Toggle\/Toggle|SwatchPicker\/SwatchPicker)["']/.test(
          source
        )
      )
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Finding 34 — both colour pickers are the SwatchPicker, at one swatch size.
// ---------------------------------------------------------------------------

describe("Audit Finding 34 — one swatch picker", () => {
  const accountModal =
    appSources[
      "../features/accounts/AccountCreateModal/AccountCreateModal.tsx"
    ];
  const accountStyles =
    appSources[
      "../features/accounts/AccountCreateModal/AccountCreateModal.styles.ts"
    ];
  const categoryModal =
    appSources[
      "../features/categories/CategoryManagerModal/CategoryManagerModal.tsx"
    ];

  it("the account colour row is the SwatchPicker", () => {
    expect(accountModal).toBeDefined();
    expect(accountModal).toMatch(/<SwatchPicker\b/);
  });

  it("the account modal keeps no local swatch of its own", () => {
    expect(accountStyles).toBeDefined();
    expect(block(accountStyles, "StyledColorSwatch")).toBeUndefined();
  });

  it("the category colour popover is the SwatchPicker too", () => {
    expect(categoryModal).toMatch(/<SwatchPicker\b/);
  });
});

// ---------------------------------------------------------------------------
// Finding 32 — every button-like control carries the Button ring: gold 2px,
// offset 2px. A control that stays local after the fixes still carries it,
// declared in place or through a shared focus-ring fragment.
// ---------------------------------------------------------------------------

const styleModules = import.meta.glob(
  [
    "../features/**/*.styles.ts",
    "../components/**/*.styles.ts",
    "../layouts/**/*.styles.ts",
    "../primitives/**/*.styles.ts",
  ],
  { query: "?raw", import: "default", eager: true }
) as Record<string, string>;

const goldRing =
  /&:focus-visible\s*\{[^}]*outline:\s*2px solid \$\{\(\{ theme \}\) => theme\.colors\.primary\};[^}]*outline-offset:\s*2px;/;
const sharedRing = /\$\{focusRing\}/;

function carriesRing(body: string): boolean {
  return goldRing.test(body) || sharedRing.test(body);
}

describe("Audit Finding 32 — one focus ring for buttons and chips", () => {
  it("every styled button declares the gold 2px ring, offset 2px", () => {
    expect(Object.keys(styleModules).length).toBeGreaterThan(40);
    const offenders = Object.entries(styleModules).flatMap(([path, source]) =>
      styledBlocks(source)
        .filter(({ tag, body }) => tag === "button" && !carriesRing(body))
        .map(({ name }) => `${path} ${name}`)
    );
    expect(offenders).toEqual([]);
  });

  it("a clickable DataRow (the accordion headers) carries the same ring", () => {
    const dataRow = styleModules["../components/DataRow/DataRow.styles.ts"];
    expect(dataRow).toBeDefined();
    expect(carriesRing(dataRow)).toBe(true);
  });

  it("the Toggle carries the same ring", () => {
    const toggle = styleModules["../primitives/Toggle/Toggle.styles.ts"];
    expect(block(toggle, "StyledToggle")).toBeDefined();
    expect(carriesRing(block(toggle, "StyledToggle") ?? "")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Finding 4 — the Import account chips are the ChoiceChip; the History range
// and the legend chips sit at Control Height sm.
// ---------------------------------------------------------------------------

describe("Audit Finding 4 — chips at one height", () => {
  it("the Import account chips are the ChoiceChip", () => {
    const wizard =
      appSources["../features/import/ImportWizard/ImportWizard.tsx"];
    expect(wizard).toBeDefined();
    expect(wizard).toMatch(/<ChoiceChip\b/);
    expect(
      block(
        styleModules["../features/import/ImportWizard/ImportWizard.styles.ts"],
        "StyledChip"
      )
    ).toBeUndefined();
  });

  it("the History range control takes its height from Control Height sm", () => {
    const history =
      styleModules["../features/history/HistoryChart/HistoryChart.styles.ts"];
    expect(history).toBeDefined();
    expect(history).toMatch(/sizing\.control\.sm/);
  });

  ["StyledChip", "StyledShowAllButton"].forEach((name) => {
    it(`the SeriesLegend ${name} takes its height from Control Height sm`, () => {
      const legend =
        styleModules["../components/SeriesLegend/SeriesLegend.styles.ts"];
      expect(block(legend, name)).toMatch(/sizing\.control\.sm/);
    });
  });
});

// ---------------------------------------------------------------------------
// Finding 10 — the calendar shows its month navigation, and today and the
// keyboard-selected day read in the gold tokens, not react-datepicker blue.
// ---------------------------------------------------------------------------

describe("Audit Finding 10 — calendar navigation and today", () => {
  const datePicker =
    styleModules["../primitives/DatePicker/DatePicker.styles.ts"] ?? "";

  /** The body of the first rule whose selector list names `selector`. */
  function rule(selector: string): string | undefined {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = datePicker.match(
      new RegExp(`${escaped}(?![\\w-])[^{]*\\{([^}]*)\\}`)
    );
    return match?.[1];
  }

  it("styles the navigation buttons themselves, not only their icon", () => {
    expect(rule(".react-datepicker__navigation")).toBeDefined();
  });

  it("draws the keyboard-selected day in a gold token", () => {
    expect(rule(".react-datepicker__day--keyboard-selected")).toMatch(
      /theme\.colors\.primary/
    );
  });

  it("draws today in a gold token", () => {
    expect(rule(".react-datepicker__day--today")).toMatch(
      /theme\.colors\.primary/
    );
  });
});

// ---------------------------------------------------------------------------
// The register — every finding still open closes with issue #275, except
// Finding 29, which the visual-only rule rejects: its fix gives Add recurring
// and Add expense a heading they do not have (new copy) and moves their
// in-form submit buttons into the Modal footer (a behaviour change).
// ---------------------------------------------------------------------------

const register = Object.values(
  import.meta.glob("../../docs/ui-audit/findings.md", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>
)[0];

function entry(n: number): string | undefined {
  return register?.split(/^### /m).find((s) => s.startsWith(`${n}. `));
}

describe("The findings register — issue #275", () => {
  [3, 4, 5, 10, 11, 12, 13, 19, 30, 31, 32, 33, 34, 35].forEach((n) => {
    it(`closes Audit Finding ${n} with issue #275`, () => {
      expect(entry(n)).toBeDefined();
      expect(entry(n)).toMatch(/\*\*Status:\*\* Closed — issue #275/);
    });
  });

  it("rejects Audit Finding 29 with its reason", () => {
    expect(entry(29)).toBeDefined();
    expect(entry(29)).toMatch(/\*\*Status:\*\* Rejected — \S.*\./);
  });

  it("leaves no finding open", () => {
    expect(register).toBeDefined();
    expect(register.match(/\*\*Status:\*\* Open\./g) ?? []).toEqual([]);
  });
});
