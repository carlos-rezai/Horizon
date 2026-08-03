import { describe, it, expect } from "vitest";
import type { ManualTopicId } from "./manualTypes";
import { MANUAL_GROUPS, MANUAL_TOPICS } from "./manualContent";

/**
 * Structural assertions only. The wording of individual claims is verified
 * against shipped code by hand as it is written (the App-Wins Rule) — asserting
 * sentences here would turn every copy edit into a test failure for no safety
 * gained. What is guarded is that the manual's shape cannot rot: ten topics,
 * five groups, every topic reachable, every claim in this module.
 */
const EXPECTED_TOPIC_IDS: ManualTopicId[] = [
  "start",
  "dashboard",
  "streak",
  "outlook",
  "month",
  "history",
  "import",
  "accounts",
  "categories",
  "settings",
];

/** The AccountKind union, in the order Getting Started walks a reader through
 *  it — the closed set from the ubiquitous language, not a copy decision. */
const ACCOUNT_KINDS = [
  "Girokonto",
  "Tagesgeld",
  "Mortgage",
  "CreditCard",
  "Investment",
];

/**
 * The topics whose copy has actually been written. Each copy slice appends to
 * this list; a topic outside it is still a stub and is exempt from the
 * populated-row invariant below.
 */
const WRITTEN_TOPIC_IDS: ManualTopicId[] = [
  "start",
  "dashboard",
  "streak",
  "outlook",
  "month",
  "history",
  "import",
  "accounts",
  "categories",
];

/** Every word a topic's detail rows say, as one searchable string. */
const detailText = (id: ManualTopicId): string =>
  MANUAL_TOPICS[id].details
    .flatMap((detail) => [
      detail.heading,
      detail.body,
      ...(detail.terms ?? []).flatMap((entry) => [
        entry.term,
        entry.definition,
      ]),
    ])
    .join("\n");

/** Every word a topic says, as one searchable string. */
const topicText = (id: ManualTopicId): string =>
  [MANUAL_TOPICS[id].title, MANUAL_TOPICS[id].blurb, detailText(id)].join("\n");

/** The row of a topic whose heading matches — the rows are the manual's
 *  answers, so a claim that has to reach a reader is asserted on the row that
 *  carries it, not on the topic as a whole. */
const rowOf = (id: ManualTopicId, heading: RegExp) =>
  MANUAL_TOPICS[id].details.find((detail) => heading.test(detail.heading));

describe("manual groups", () => {
  it("clusters the topics under the five fixed labels, in order", () => {
    expect(MANUAL_GROUPS.map((group) => group.label)).toEqual([
      "Getting Started",
      "Overview",
      "Planning",
      "Data",
      "System",
    ]);
  });

  it("gives every group at least one topic", () => {
    MANUAL_GROUPS.forEach((group) => {
      expect(group.topicIds.length).toBeGreaterThan(0);
    });
  });
});

describe("manual topics", () => {
  it("documents all ten topics", () => {
    expect(Object.keys(MANUAL_TOPICS).sort()).toEqual(
      [...EXPECTED_TOPIC_IDS].sort()
    );
  });

  it("keys every topic by its own id", () => {
    EXPECTED_TOPIC_IDS.forEach((id) => {
      expect(MANUAL_TOPICS[id].id).toBe(id);
    });
  });

  it("gives every topic a title and a blurb a reader can judge it by", () => {
    EXPECTED_TOPIC_IDS.forEach((id) => {
      expect(MANUAL_TOPICS[id].title.trim()).not.toBe("");
      expect(MANUAL_TOPICS[id].blurb.trim()).not.toBe("");
    });
  });

  it("gives every topic an icon component rather than a name to look up", () => {
    EXPECTED_TOPIC_IDS.forEach((id) => {
      expect(MANUAL_TOPICS[id].icon).toBeTypeOf("object");
    });
  });
});

describe("the Getting Started topic", () => {
  it("is titled Getting Started", () => {
    expect(MANUAL_TOPICS.start.title).toBe("Getting Started");
  });

  it("carries the six ordered setup steps", () => {
    expect(MANUAL_TOPICS.start.details).toHaveLength(6);
  });

  it("gives every step a heading", () => {
    MANUAL_TOPICS.start.details.forEach((detail) => {
      expect(detail.heading.trim()).not.toBe("");
    });
  });

  // Structure, not wording: a step that expands into nothing is not a step.
  it("gives every step a body a reader can act on", () => {
    MANUAL_TOPICS.start.details.forEach((detail) => {
      expect(detail.body.trim()).not.toBe("");
    });
  });

  it("expands step 1 into all five account kinds", () => {
    const terms = MANUAL_TOPICS.start.details[0].terms ?? [];

    expect(terms.map((entry) => entry.term)).toEqual(ACCOUNT_KINDS);
  });

  it("defines every account kind it names", () => {
    const terms = MANUAL_TOPICS.start.details[0].terms ?? [];

    expect(terms).toHaveLength(ACCOUNT_KINDS.length);
    terms.forEach((entry) => {
      expect(entry.definition.trim()).not.toBe("");
    });
  });
});

describe.each(WRITTEN_TOPIC_IDS)("the %s topic's rows", (id) => {
  it("carries detail rows a reader can act on", () => {
    const { details } = MANUAL_TOPICS[id];

    expect(details.length).toBeGreaterThan(0);
    details.forEach((detail) => {
      expect(detail.heading.trim()).not.toBe("");
      expect(detail.body.trim()).not.toBe("");
    });
  });
});

/**
 * Subject coverage, not wording. Each required string below is a label the
 * shipped screen actually puts in front of the reader — a KPI tile's caption, a
 * section head, a badge — so rewriting a sentence keeps these green and only
 * dropping the subject entirely turns them red. Asserting the sentences
 * themselves would make every copy edit a test failure for no safety gained.
 */
const DASHBOARD_SUBJECTS = [
  // The four KPI tiles, as KpiStrip labels them.
  "Total Liquid",
  "Restschuld",
  "Net Cashflow",
  "To Payoff",
  // The chart, the mortgage card and the plan widget.
  "Trajectory Horizon",
  "Mortgage Countdown",
  "Plan Summary",
];

describe("the Dashboard topic", () => {
  it("covers every part of the Dashboard it documents", () => {
    const text = topicText("dashboard");

    DASHBOARD_SUBJECTS.forEach((subject) => {
      expect(text).toContain(subject);
    });
  });

  // The card is an Empty-Hidden Surface: MortgageCountdown renders nothing
  // until an account of kind Mortgage exists. A reader who has not added one
  // needs to know the card's absence is by design, not a fault.
  it("names the precondition the Mortgage Countdown card waits on", () => {
    const row = MANUAL_TOPICS.dashboard.details.find((detail) =>
      detail.heading.includes("Mortgage Countdown")
    );

    expect(row).toBeDefined();
    expect(row?.body).toContain("Mortgage account");
  });
});

const STREAK_SUBJECTS = [
  // The two goal modes, as the editor's toggle labels them.
  "Milestone",
  "Manual",
  // The row state a Trackable Account with no target shows.
  "Not tracked",
  // The two kinds that are never trackable.
  "Mortgage",
  "CreditCard",
  // Where the streak is measured from: reconstructed history, not projections.
  "History",
];

describe("the Savings Streak topic", () => {
  it("covers the goal modes, the tracked accounts and how the streak is derived", () => {
    const text = topicText("streak");

    STREAK_SUBJECTS.forEach((subject) => {
      expect(text).toContain(subject);
    });
  });
});

const OUTLOOK_SUBJECTS = [
  // The summary strip's three StatBlock labels.
  "Total Liquid",
  "Debt-free",
  "Total Sondertilgung",
  // The year accordion, by the section title it renders.
  "Projection Accordion",
  // Where a month row lands, and the page header's action.
  "Month Overview",
  "Recalculate",
];

describe("the Outlook topic", () => {
  it("covers the summary strip, the year accordion, the month jump and Recalculate", () => {
    const text = topicText("outlook");

    OUTLOOK_SUBJECTS.forEach((subject) => {
      expect(text).toContain(subject);
    });
  });

  // The App-Wins Rule applied to a name: the sidebar entry and the page's
  // overline read "Outlook", but the header the reader is looking at says
  // "Financial Plan". A manual that only ever says "Outlook" sends them
  // looking for a title that is not on the screen.
  it("names the screen by the page title the reader actually sees", () => {
    expect(topicText("outlook")).toContain("Financial Plan");
  });

  // The engine projects recurring transactions and nothing else, so an Outlook
  // with no rows is an empty input, not a broken projection. The blurb's
  // one-line teaser was written in an earlier slice; the row a reader expands
  // for an answer has to carry it too.
  it("states in its rows that the projection is driven only by recurring transactions", () => {
    expect(detailText("outlook")).toMatch(/recurring/i);
  });
});

const MONTH_SUBJECTS = [
  // The stat strip's headline label and the spending card's section label.
  "Variable Spending",
  // The spending card's default tab and its action.
  "All accounts",
  "Add expense",
  // The donut card and the comparison card, as SectionHead labels them.
  "Breakdown",
  "Year comparison",
];

describe("the Month Overview topic", () => {
  it("covers navigation, the spending list, the one-off expense, the donut and the comparison", () => {
    const text = topicText("month");

    MONTH_SUBJECTS.forEach((subject) => {
      expect(text).toContain(subject);
    });
  });

  // The arrows step anywhere; the picker does not. Its grid is bounded by
  // deriveMonthPickerBounds to [earliest imported month, displayed month], so a
  // greyed-out cell means "nothing imported that far back" rather than a dead
  // control.
  it("names the import bound the month picker is confined to", () => {
    const row = rowOf("month", /navigation/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/import/i);
  });

  // The handoff calls this row "Planned". It shipped: YearComparison renders
  // real per-category bars off useYearComparison. The corrected row describes
  // what it does — cumulative spend from Jan 1 through the viewed month against
  // the same span last year — and no placeholder language survives.
  it("describes the year comparison as shipped behaviour", () => {
    const row = rowOf("month", /year comparison/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/jan/i);
    expect(row?.body).toMatch(/last year/i);
  });

  it("leaves no planned-or-coming-soon language in the year-comparison row", () => {
    const row = rowOf("month", /year comparison/i);

    expect(row).toBeDefined();
    expect(row?.body).not.toMatch(/planned|coming soon|not yet|placeholder/i);
  });
});

const HISTORY_SUBJECTS = [
  // The three range chips, as HistoryChart labels them.
  "1 Year",
  "3 Years",
  "All history",
  // The archive and the chart above it.
  "Year Archive",
  "Historical Trajectory",
];

describe("the History topic", () => {
  it("covers the range chips, the Year Archive and the chart", () => {
    const text = topicText("history");

    HISTORY_SUBJECTS.forEach((subject) => {
      expect(text).toContain(subject);
    });
  });

  // History and Outlook draw the same accounts on the same axes. What separates
  // them is that one is reconstructed from statements and the other is
  // projected, and the rows have to say so — not just the blurb.
  it("states in its rows that History is reconstructed actuals, not a projection", () => {
    expect(detailText("history")).toMatch(/reconstruct|actual/i);
  });

  // YearArchive is import-gated: it renders only years present in `years`, even
  // when `points` carry others. A missing year is missing data.
  it("states that the Year Archive lists only years with an imported statement", () => {
    const row = rowOf("history", /year archive/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/import/i);
    expect(row?.body).toMatch(/statement/i);
  });
});

const IMPORT_SUBJECTS = [
  // The Import page's action, as ImportView's PageHeader labels it.
  "New import",
  // The wizard's second step, as STEP_LABELS names it.
  "Map columns",
  // The history card, as ImportHistory's head titles it.
  "Import history",
];

describe("the Import topic", () => {
  it("covers the import action, the mapping step and the history card", () => {
    const text = topicText("import");

    IMPORT_SUBJECTS.forEach((subject) => {
      expect(text).toContain(subject);
    });
  });

  // `STEP_LABELS` is ["Account", "Map columns", "Review"], rendered as a
  // three-dot stepper the reader walks in order. A manual that summarises the
  // wizard as one lump leaves them guessing which step they are stuck on.
  it("gives the three wizard steps a row each, in the order they are walked", () => {
    const headings = MANUAL_TOPICS.import.details.map((d) => d.heading);
    const steps = [/account/i, /map columns/i, /review/i].map((step) =>
      headings.findIndex((heading) => step.test(heading))
    );

    steps.forEach((index) => expect(index).toBeGreaterThan(-1));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  });

  // The commit route persists the mapping and format per bank, and the
  // Map-columns step opens on "Mapping remembered from your last <bank> import".
  // A reader who does not know it is remembered re-checks three selects every
  // time.
  it("states in the mapping row that the column mapping is remembered per bank", () => {
    const row = rowOf("import", /map columns/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/remember/i);
    expect(row?.body).toMatch(/bank/i);
  });

  // Duplicate, recurring and pending rows arrive unchecked — a soft exclusion
  // the reader can opt back into. Re-checking them is exactly the
  // double-counting the pre-uncheck exists to prevent, so the row has to say
  // why they are off rather than leaving it to be discovered.
  it("explains in the review row why duplicate and recurring rows arrive unchecked", () => {
    const row = rowOf("import", /review/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/duplicate/i);
    expect(row?.body).toMatch(/recurring/i);
    expect(row?.body).toMatch(/uncheck/i);
  });

  // `detectStatement` matches a preset by header signature; anything it does
  // not recognise is imported under DEFAULT_BANK — "Generic" — and remembers
  // its mapping under that label. Naming the four real presets would tie the
  // manual to `bankPresets.ts`, so the copy documents the mechanism instead.
  it("states that an unrecognised export falls back to a Generic import", () => {
    expect(detailText("import")).toMatch(/generic/i);
  });

  // Written in the blurb by issue #212 as a one-line teaser. The row a reader
  // expands for reassurance about their bank data has to carry it too.
  it("states in its rows that parsing and storage are local", () => {
    expect(detailText("import")).toMatch(/local|this device/i);
  });

  /**
   * Two prohibitions, green from the start and there to stay green.
   *
   * The handoff promises "Sparkasse, DKB, ING and other common export formats"
   * — written before Real Bank CSV Import replaced the guessed presets with
   * ones built from real exports. DKB and ING have no preset and never did.
   *
   * It also promises four per-file actions in Import History. `ImportHistory`
   * renders two: Preview and Delete. Re-categorize and re-download do not
   * exist, so the copy is cut rather than the buttons built.
   */
  it("makes no bank-preset claim that Real Bank CSV Import invalidated", () => {
    expect(topicText("import")).not.toMatch(/\bDKB\b|\bING\b/);
  });

  it("promises no Import History action the app does not ship", () => {
    expect(topicText("import")).not.toMatch(
      /re-?download|re-?categoriz|re-?categoris/i
    );
  });
});

const ACCOUNT_SUBJECTS = [
  // The Account Detail card, as its SectionHead titles it.
  "Recurring transactions",
  // The optional link field, as RecurringTransactionModal labels it.
  "Transfer to account",
];

describe("the Accounts topic", () => {
  it("covers every account kind and the recurring-transaction surface", () => {
    const text = topicText("accounts");

    [...ACCOUNT_KINDS, ...ACCOUNT_SUBJECTS].forEach((subject) => {
      expect(text).toContain(subject);
    });
  });

  // The same closed union Getting Started walks, expanded here into what each
  // kind *does* rather than when to create it. Total Liquid and Restschuld are
  // where the kinds diverge in the projection: Girokonto and Tagesgeld sum into
  // one, Mortgage becomes the other, and CreditCard and Investment are in
  // neither.
  it("expands the kinds row into all five, in the closed union's order", () => {
    const row = rowOf("accounts", /kind/i);

    expect(row).toBeDefined();
    expect(row?.terms?.map((entry) => entry.term)).toEqual(ACCOUNT_KINDS);
    (row?.terms ?? []).forEach((entry) => {
      expect(entry.definition.trim()).not.toBe("");
    });
  });

  it("says how the kinds feed the projection, not only what they are", () => {
    const row = rowOf("accounts", /kind/i);
    const text = [row?.body, ...(row?.terms ?? []).map((e) => e.definition)]
      .filter(Boolean)
      .join("\n");

    expect(text).toContain("Total Liquid");
    expect(text).toContain("Restschuld");
  });

  // Every field `RecurringTransactionModal` asks for, since a rule with the
  // wrong day or frequency projects a wrong twenty years quietly.
  it("covers what a recurring transaction is made of, including the link", () => {
    const row = rowOf("accounts", /recurring/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/amount/i);
    expect(row?.body).toMatch(/frequency/i);
    expect(row?.body).toMatch(/day/i);
    expect(row?.body).toMatch(/categor/i);
    expect(row?.body).toMatch(/link/i);
  });

  // The Transfer Direction Rule. The form has no direction control at all — it
  // rejects a linked amount that is not greater than zero — so the sign is the
  // one thing a reader cannot infer from the fields in front of them. Input
  // only: the manual stops before Account Detail's recurring-net figure.
  it("states the transfer input rule: positive on the account the money leaves", () => {
    const text = detailText("accounts");

    expect(text).toMatch(/positive/i);
    expect(text).toMatch(/leaves|leaving/i);
  });

  /**
   * The App-Wins Rule at its sharpest. The handoff — and the issue's own
   * acceptance criterion — say deleting an account takes its recurring
   * transactions with it. It does not: `AccountHero` disables Delete while the
   * account holds any transaction, and the storage driver refuses outright when
   * a recurring row points at it from either end (`account_id` or
   * `linked_account_id`). Nothing cascades; the delete is blocked. A reader
   * told to expect a cascade meets a 409 the manual never mentioned, so the row
   * documents the refusal and the order of operations it forces.
   */
  it("states that deletion is refused while transactions or recurring rules remain", () => {
    const row = rowOf("accounts", /delet/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/refuses|cannot|can't|will not|won't|blocked/i);
    expect(row?.body).toMatch(/recurring/i);
    expect(row?.body).toMatch(/transaction/i);
  });

  it("tells the reader to back up before a deletion there is no undo for", () => {
    const row = rowOf("accounts", /delet/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/back ?up/i);
  });
});

const CATEGORY_SUBJECTS = [
  // The manager's two sections, as CategoryManagerModal labels them.
  "Default",
  "Custom",
  // The button that opens it, on the Settings Preferences card.
  "Manage",
];

describe("the Categories topic", () => {
  it("covers the manager's two sections and where it is opened from", () => {
    const text = topicText("categories");

    CATEGORY_SUBJECTS.forEach((subject) => {
      expect(text).toContain(subject);
    });
  });

  // The two sections are not two labels over one behaviour: a Default can be
  // recoloured and hidden but never renamed or deleted, and a Custom can be
  // renamed, recoloured and deleted but never hidden. One row each, so the
  // asymmetry is where a reader looks for it.
  it("gives the Default and Custom sections a row each", () => {
    expect(rowOf("categories", /default/i)).toBeDefined();
    expect(rowOf("categories", /custom/i)).toBeDefined();
  });

  it("covers adding, renaming, recolouring and removing a category", () => {
    const text = detailText("categories");

    expect(text).toMatch(/add/i);
    expect(text).toMatch(/rename/i);
    expect(text).toMatch(/colour|color/i);
    expect(text).toMatch(/delete|remove/i);
  });

  // Deleting a category transactions still reference does not fail — it opens
  // the reassign prompt, which moves them to another category (defaulting to
  // Miscellaneous) and then deletes. Unexplained, that modal reads as an error
  // rather than the second half of the action.
  it("explains the reassignment prompt a category still in use opens", () => {
    const row = rowOf("categories", /delet|remov/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/reassign/i);
    expect(row?.body).toMatch(/transaction/i);
  });
});

/**
 * A prohibition rather than a requirement, so it is green from the start — it
 * exists to stay green as the remaining copy slices are written.
 *
 * Account Detail's "recurring net per month" is not documented anywhere,
 * deliberately: the helper behind it sums raw amounts with no link handling
 * while the projection engine subtracts them, so one transfer reads +500 on one
 * surface and -500 on the other. No honest sentence covers both, and a caveat
 * would document the inconsistency into permanence. It is a Live-Use Repair
 * defect, not a manual entry.
 */
describe("the manual's deliberate silences", () => {
  it("says nothing about Account Detail's recurring net per month", () => {
    EXPECTED_TOPIC_IDS.forEach((id) => {
      expect(topicText(id)).not.toMatch(/recurring net/i);
    });
  });
});
