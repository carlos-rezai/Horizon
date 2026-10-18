import { describe, it, expect } from "vitest";
import type { ManualTopicId } from "../manualTypes/manualTypes";
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
 * The topics whose copy has actually been written. Each copy slice appended to
 * this list; with Settings written it is the whole set, so no topic is exempt
 * from the populated-row invariant below any more and none can be added exempt.
 */
const WRITTEN_TOPIC_IDS: ManualTopicId[] = EXPECTED_TOPIC_IDS;

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

  // Live-Use Repair #2 (issue #226): the origination step no longer starts
  // from an existing Mortgage account and the pencil — it sends the reader to
  // the Mortgage Countdown empty state and the one-form setup.
  describe("the origination step", () => {
    const step = () => rowOf("start", /mortgage/i);

    it("sends the reader to the Set up mortgage button on the empty Mortgage Countdown", () => {
      expect(step()).toBeDefined();
      expect(step()?.body).toContain("Set up mortgage");
      expect(step()?.body).toContain("Mortgage Countdown");
    });

    // Live-Use Repair #2 (issue #227): the same form sets up the repayment.
    it("describes the Repayment group: paid from a Girokonto or Tagesgeld, the monthly rate, the day and an optional Sondertilgung", () => {
      expect(step()?.body).toMatch(/paid from/i);
      expect(step()?.body).toContain("Girokonto or Tagesgeld");
      expect(step()?.body).toMatch(/monthly rate/i);
      expect(step()?.body).toMatch(/day of (the )?month/i);
      expect(step()?.body).toMatch(/Sondertilgung/);
      expect(step()?.body).toContain("November");
    });

    it("quotes the note shown when no account can fund the repayment", () => {
      expect(step()?.body).toContain(
        "Add a Girokonto to set up the monthly repayment."
      );
    });

    it("no longer defers the monthly repayment to a later step", () => {
      expect(step()?.body).not.toMatch(/added in step 3/i);
    });

    it("describes the one form: the Restschuld today and the origination together", () => {
      expect(step()?.body).toContain("Restschuld today");
      expect(step()?.body).toMatch(/one form/i);
      expect(step()?.body).toMatch(/original principal/i);
      expect(step()?.body).toMatch(/term/i);
    });

    it("no longer assumes the Mortgage account was added beforehand", () => {
      expect(step()?.body).not.toMatch(/If you added a Mortgage account/);
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

  // Live-Use Repair #2 (issue #226): the card is no longer an Empty-Hidden
  // Surface. With no Mortgage account it shows an empty state whose button
  // opens the one-form Mortgage Setup, and the manual says so.
  describe("the Mortgage Countdown empty state and setup", () => {
    const row = () => rowOf("dashboard", /Mortgage Countdown/);

    it("quotes the empty state and its button", () => {
      expect(row()).toBeDefined();
      expect(row()?.body).toContain("No mortgage yet");
      expect(row()?.body).toContain("Set up mortgage");
    });

    it("describes the setup as one form for the mortgage and its origination", () => {
      expect(row()?.body).toContain("Restschuld today");
      expect(row()?.body).toMatch(/one form/i);
      expect(row()?.body).toMatch(/original principal/i);
    });

    // Live-Use Repair #2 (issue #227): the setup form also carries the repayment.
    it("says the setup form also sets up the repayment and its Sondertilgung", () => {
      expect(row()?.body).toMatch(/repayment/i);
      expect(row()?.body).toMatch(/monthly rate/i);
      expect(row()?.body).toMatch(/Sondertilgung/);
      expect(row()?.body).toMatch(/paid from/i);
    });

    it("no longer says the card is absent until a Mortgage account exists", () => {
      expect(row()?.body).not.toMatch(/not on the Dashboard until/i);
    });
  });

  // Live-Use Repair #2 (issue #225): a mortgage nothing pays off gets an
  // honest footer instead of "Not paid off within …". The manual quotes it and
  // keeps the beyond-the-horizon note distinct from it.
  describe("the Mortgage Countdown footer", () => {
    const row = () => rowOf("dashboard", /Mortgage Countdown/);

    it("quotes the no-repayment footer", () => {
      expect(row()?.body).toContain("No repayment set up");
      expect(row()?.body).toMatch(/recurring transfer into/i);
    });

    it("still describes the not-paid-off-within-the-horizon note", () => {
      expect(row()?.body).toMatch(/horizon/i);
    });
  });

  // Financial History (issue #245): the Trajectory Horizon draws up to ten
  // years of Reconstructed Actuals — the Past Lead-in — on an ACTUALS band
  // before the projection, and the TODAY Marker sits where today really is.
  describe("the Past Lead-in on the Trajectory Horizon", () => {
    const row = () => rowOf("dashboard", /Trajectory Horizon/);

    it("names the ACTUALS band the lead-in is drawn on", () => {
      expect(row()?.body).toContain("ACTUALS");
    });

    it("says the lead-in reaches back up to ten years of real past balances", () => {
      expect(row()?.body).toMatch(/ten years|120 months/i);
      expect(row()?.body).toMatch(/past/i);
    });

    it("places the TODAY Marker between the actuals on its left and the projection on its right", () => {
      expect(row()?.body).toContain("TODAY");
      expect(row()?.body).toMatch(/left/i);
      expect(row()?.body).toMatch(/right/i);
    });

    it("no longer calls the chart only a ten-year projection", () => {
      expect(row()?.body).not.toMatch(
        /^A ten-year projection of every account/
      );
    });
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

  // Live-Use Repair #4: the accordion is titled “Projection” and has one
  // column per account between Period and Total Liquid; Net Cashflow and
  // Sondertilgung are no longer columns, and ST months are still tinted.
  it("describes the accordion's title and its per-account columns", () => {
    const row = rowOf("outlook", /accordion/i);

    expect(row).toBeDefined();
    expect(row?.body).toContain("“Projection”");
    expect(row?.body).toMatch(/each account|every account|per account/i);
    expect(row?.body).toContain("Total Liquid");
    expect(row?.body).toContain("Restschuld");
    expect(row?.body).toMatch(/tint/i);
  });

  // Live-Use Repair #5: Total Sondertilgung counts only the annual transfers
  // into the Mortgage up to payoff — never the monthly repayment, never a
  // Restschuld step-down as such.
  describe("the Total Sondertilgung definition", () => {
    const definition = (): string =>
      MANUAL_TOPICS.outlook.details
        .flatMap((detail) => detail.terms ?? [])
        .find((entry) => entry.term === "Total Sondertilgung")?.definition ??
      "";

    it("counts only the annual extras up to payoff", () => {
      expect(definition()).toMatch(/annual/i);
      expect(definition()).toMatch(/payoff|paid off/i);
    });

    it("says the monthly repayment is not counted", () => {
      expect(definition()).toMatch(/monthly/i);
    });

    it("no longer reads Sondertilgung off Restschuld step-downs", () => {
      expect(definition()).not.toMatch(/steps down/i);
    });
  });

  it("no longer lists Net Cashflow or Sondertilgung as accordion columns", () => {
    const row = rowOf("outlook", /accordion/i);

    expect(row?.body).not.toContain("Net Cashflow");
    expect(row?.body).not.toMatch(/Sondertilgung (are|is) summed/i);
    expect(row?.body).not.toMatch(/Sondertilgung columns/i);
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

  // Month Cash Flow (issue #255): the page is no longer variable-only. The
  // blurb names the recurring flows and the month-end balance it now shows.
  it("says in its blurb that the month shows its fixed flows and month-end balances", () => {
    const { blurb } = MANUAL_TOPICS.month;

    expect(blurb).toMatch(/fixed/i);
    expect(blurb).toMatch(/month-end balance/i);
  });

  // The Fixed Flows card, as MonthCashFlow renders it: one group per account
  // with recurring income and transfers, muted "In balance anchor" rows left
  // out of "Net fixed", and a Month-End Balance captioned Actual / Projected or
  // "No data before …".
  describe("the Fixed flows row", () => {
    const row = () => rowOf("month", /fixed flows/i);

    it("gives the Fixed Flows card a row of its own", () => {
      expect(row()).toBeDefined();
    });

    it("explains the rows: recurring income and transfers, per account", () => {
      expect(row()).toBeDefined();
      expect(row()?.body).toMatch(/recurring/i);
      expect(row()?.body).toMatch(/income/i);
      expect(row()?.body).toMatch(/transfer/i);
      expect(row()?.body).toMatch(/account/i);
    });

    it("explains the muted rows, quoting In balance anchor and Net fixed", () => {
      expect(row()).toBeDefined();
      expect(row()?.body).toContain("In balance anchor");
      expect(row()?.body).toContain("Net fixed");
    });

    it("explains the balance basis: Actual, Projected, or No data before", () => {
      expect(row()).toBeDefined();
      expect(row()?.body).toMatch(/month-end balance/i);
      expect(row()?.body).toContain("Actual");
      expect(row()?.body).toContain("Projected");
      expect(row()?.body).toContain("No data before");
    });
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

  // Financial History (issue #245): the Year Archive is no longer import-gated.
  // A year is listed when any month in it has recorded data in a series other
  // than the Paydown Bridge; the statement badge shows only on a year that has
  // statements.
  describe("the Year Archive row", () => {
    const row = () => rowOf("history", /year archive/i);

    it("says a bridge-only year is left out, not that only imported years appear", () => {
      expect(row()).toBeDefined();
      expect(row()?.body).toMatch(/bridge/i);
      expect(row()?.body).not.toMatch(
        /only years holding at least one imported statement/i
      );
    });

    it("says the statement badge shows only on a year that has statements", () => {
      expect(row()?.body).toMatch(/statement/i);
      expect(row()?.body).toMatch(/no badge|without (a )?badge|badge only/i);
    });
  });

  // Financial History (issue #245): History starts at the History Span — the
  // earliest of every account's Known Since month and the Mortgage Start Date —
  // not at the first import.
  describe("the History Span", () => {
    it("says History reaches back to the mortgage's start date", () => {
      expect(detailText("history")).toMatch(/start date/i);
    });

    it("no longer calls History built from imported statements only", () => {
      expect(MANUAL_TOPICS.history.blurb).not.toMatch(/statements only/i);
    });

    it("quotes the empty state that invites an import or a mortgage origination", () => {
      expect(detailText("history")).toContain(
        "Import a bank statement or add your mortgage's origination to see your history"
      );
    });
  });

  // Financial History (issue #245): the Paydown Bridge joins the Origination
  // Point to the Mortgage's Known Since. It is a connection, never an estimate:
  // the copy says "No monthly data" and never "estimated" or "interpolated".
  describe("the Paydown Bridge", () => {
    const row = () => rowOf("history", /bridge|paydown/i);
    const body = (): string => row()?.body ?? "";

    it("gives the bridge a row of its own", () => {
      expect(row()).toBeDefined();
    });

    it("describes a dotted line from the original principal to the first known Restschuld", () => {
      expect(body()).toMatch(/dotted/i);
      expect(body()).toMatch(/original principal/i);
      expect(body()).toMatch(/Restschuld/);
    });

    it("quotes the tooltip's No monthly data and the amount paid off", () => {
      expect(body()).toContain("No monthly data");
      expect(body()).toMatch(/paid off/i);
    });

    it("never calls the bridge estimated or interpolated", () => {
      expect(row()).toBeDefined();
      expect(topicText("history")).not.toMatch(/estimat|interpolat/i);
    });
  });

  // Financial History (issue #245): the History Trends card plots Monthly
  // Savings or Monthly Spending as bars with a trailing-12-month average, and
  // the one range governs it and the chart alike.
  describe("the History Trends card", () => {
    const row = () => rowOf("history", /trend/i);
    const body = (): string => row()?.body ?? "";

    it("gives the trends card a row of its own", () => {
      expect(row()).toBeDefined();
    });

    it("names the Saved and Spent toggle and the two series it switches", () => {
      expect(body()).toContain("Saved");
      expect(body()).toContain("Spent");
      expect(body()).toContain("Monthly Savings");
      expect(body()).toContain("Monthly Spending");
    });

    it("describes the trailing 12-month average line", () => {
      expect(body()).toMatch(/12-month|twelve-month|12-mo/i);
      expect(body()).toMatch(/average/i);
    });

    it("tells Monthly Savings apart from Net Cashflow", () => {
      expect(body()).toMatch(/balance/i);
      expect(body()).toContain("Net Cashflow");
    });

    it("says an unknown month draws no bar and quotes its tooltip", () => {
      expect(body()).toMatch(/no bar/i);
      expect(body()).toContain("No data before");
    });

    it("says the range chips govern the trends as well as the chart", () => {
      const chips = rowOf("history", /range chips/i);

      expect(chips?.body).not.toMatch(/chart alone/i);
      expect(chips?.body).toMatch(/trend|Saved|Spent/i);
    });
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

  // Issue #258 — the review step's category comes from a Category Rule learned
  // when an earlier import was committed, shown with a "Learned" chip; anything
  // without one falls back to Miscellaneous. The keyword guess is retired, so a
  // row that still promises it describes behaviour the app no longer has.
  describe("Category Learning (#258)", () => {
    it("names the Learned chip in the review row, and the Miscellaneous fallback", () => {
      const row = rowOf("import", /review/i);

      expect(row?.body).toMatch(/\bLearned\b/);
      expect(row?.body).toMatch(/Miscellaneous/);
    });

    // Issue #260 — a Keyword Group hit arrives with a "Suggested" chip.
    it("names the Suggested chip in the review row", () => {
      const row = rowOf("import", /review/i);

      expect(row?.body).toMatch(/\bSuggested\b/);
    });

    // Issue #262 — a Keyword Group hit for a category the user does not have
    // arrives as a Category Proposal: a strip with Create category and
    // Dismiss, and a "New: {name}" chip on its rows. A dismissal is remembered
    // only once the import is committed.
    it("describes Category Proposals with their Create category and Dismiss actions", () => {
      const text = detailText("import");

      expect(text).toMatch(/propos/i);
      expect(text).toMatch(/Create category/);
      expect(text).toMatch(/Dismiss/);
      expect(text).toMatch(/New:/);
    });

    it("says a dismissed proposal is not offered again once the import is committed", () => {
      const text = detailText("import");

      expect(text).toMatch(
        /dismiss[^.]*(again|remember)|(again|remember)[^.]*dismiss/i
      );
    });

    it("says a committed import is what teaches a category", () => {
      const row = rowOf("import", /review/i);

      expect(row?.body).toMatch(/commit|import/i);
      expect(row?.body).toMatch(/remember|learn/i);
    });

    // Issue #263 — Same-Counterparty Propagation: one correction moves every
    // untouched row from the same payee, a row the user already set is never
    // overwritten, and the whole group teaches the Category Rule on commit.
    it("describes Same-Counterparty Propagation in the review row", () => {
      const row = rowOf("import", /review/i);

      expect(row?.body).toMatch(/same payee/i);
      expect(row?.body).toMatch(/never overwritten/i);
      expect(row?.body).toMatch(/teaches the whole group/i);
    });

    it("no longer says categories are guessed from the description by keyword", () => {
      expect(topicText("import")).not.toMatch(/by keyword/i);
    });
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
  "“Transfer”",
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

  // The Transfer Direction Rule. The amount is always typed positive and the
  // To / From chips decide which account the money leaves. Input only: the
  // manual stops before Account Detail's recurring-net figure.
  it("states the transfer input rule: positive on the account the money leaves", () => {
    const text = detailText("accounts");

    expect(text).toMatch(/positive/i);
    expect(text).toMatch(/leaves|leaving/i);
  });

  // Live-Use Repair #1 (issue #224): the recurring modal's Transfer select,
  // its To / From Transfer Direction chips, positive-only transfer amounts, the
  // red/green pair across both accounts, and mirrored rows.
  describe("the recurring transfers row", () => {
    const row = () => rowOf("accounts", /transfer/i);

    it("names the Transfer select, not Transfer to account", () => {
      expect(row()?.body).toContain("“Transfer”");
      expect(detailText("accounts")).not.toContain("Transfer to account");
    });

    it("describes the To / From direction", () => {
      expect(row()?.body).toContain("“To”");
      expect(row()?.body).toContain("“From”");
      expect(row()?.body).toMatch(/direction/i);
    });

    it("says transfer amounts are typed positive, quoting the form's message", () => {
      expect(row()?.body).toMatch(/positive/i);
      expect(row()?.body).toContain(
        "Enter the transfer amount as a positive number"
      );
    });

    it("describes the red / green pairing across the two accounts", () => {
      expect(row()?.body).toMatch(/\bred\b/i);
      expect(row()?.body).toMatch(/\bgreen\b/i);
    });

    it("describes the mirrored row on the other account", () => {
      expect(row()?.body).toMatch(/mirror/i);
    });

    it("describes repayments and Sondertilgung as transfers into a Mortgage", () => {
      expect(row()?.body).toMatch(/repayment/i);
      expect(row()?.body).toContain("Sondertilgung");
      expect(row()?.body).toMatch(/into (a|your|the) Mortgage/i);
    });

    it("no longer says only Sondertilgung should point at a mortgage", () => {
      expect(detailText("accounts")).not.toMatch(/only Sondertilgung/i);
    });

    it("no longer says the form has no in/out control", () => {
      expect(detailText("accounts")).not.toMatch(/no in\/out control/i);
    });
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

const SETTINGS_SUBJECTS = [
  // The three shipped cards, as their SectionHeads label and title them.
  "Storage",
  "Database",
  "Preferences",
  "About",
  // The one stat on the Storage card that is not self-explanatory.
  "WAL mode",
  // The two Storage actions, as StorageCard labels its buttons.
  "Create backup",
  "Restore",
  // The Preferences row the auto-update toggle sits in.
  "Automatic updates",
  // The About card's action.
  "Check for updates",
];

describe("the Settings topic", () => {
  it("covers the database, backup and restore, the preferences and the app info", () => {
    const text = topicText("settings");

    SETTINGS_SUBJECTS.forEach((subject) => {
      expect(text).toContain(subject);
    });
  });

  // `SettingsStoragePage` renders exactly three cards. One row each, so a
  // reader looking at the screen can map what they see onto what they read.
  it("gives the three shipped cards a row each", () => {
    expect(rowOf("settings", /database|storage/i)).toBeDefined();
    expect(rowOf("settings", /preference/i)).toBeDefined();
    expect(rowOf("settings", /about/i)).toBeDefined();
  });

  // The Storage card is the only place the database file's location is ever
  // shown, and its two buttons are the whole in-app backup story. A reader who
  // does not know where the file is cannot protect it.
  it("names the local database path and the backup and restore actions", () => {
    const row = rowOf("settings", /database|storage/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/path|file/i);
    expect(row?.body).toMatch(/back ?up/i);
    expect(row?.body).toMatch(/restore/i);
  });

  // `AutoUpdateToggle` writes the `autoDownload` preference, which sets
  // `autoUpdater.autoDownload`. Off does not stop Horizon noticing a release —
  // it stops the download starting by itself — so the row has to say what the
  // switch actually governs rather than "updates on/off".
  it("states what the automatic-updates toggle governs", () => {
    const row = rowOf("settings", /preference/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/download/i);
  });

  // Settings -> Preferences -> Categories -> "Manage" is the only way into the
  // category manager, and the Categories topic tells the reader to come here.
  it("points at the Categories manager from the preferences row", () => {
    const row = rowOf("settings", /preference/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/categor/i);
  });

  /**
   * A prohibition, green from the start and there to stay green. The handoff
   * describes a "Notification previews" card that fires each snackbar variant.
   * `SettingsStoragePage` renders Storage, Preferences and About — nothing
   * else — so the row is cut rather than the card built.
   */
  it("promises no Notification previews card the app does not ship", () => {
    expect(rowOf("settings", /notification/i)).toBeUndefined();
    expect(topicText("settings")).not.toMatch(/notification preview/i);
  });

  /**
   * Beyond the handoff. `buildMenu` puts four things in the native menu that
   * have no in-app equivalent: `Start Fresh…`, `Show Data Folder`, and the
   * `Ctrl+,` / `Ctrl+S` accelerators. Everything else it offers — backup,
   * restore, the update check — is on the Settings screen too, which is why
   * this is one row here rather than a topic of its own.
   */
  it("carries a row for what only the native menu can do", () => {
    const row = rowOf("settings", /menu/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(/start fresh/i);
    expect(row?.body).toMatch(/show data folder/i);
    expect(row?.body).toContain("Ctrl+,");
    expect(row?.body).toContain("Ctrl+S");
  });

  /**
   * The manual's one destructive warning. `startFresh` confirms, resets and
   * reloads; there is no archive and no undo, and the backup that would have
   * saved the reader has to be taken before they click it, not after.
   */
  it("marks Start Fresh as destructive and irreversible, with a backup first", () => {
    const row = rowOf("settings", /menu/i);

    expect(row).toBeDefined();
    expect(row?.body).toMatch(
      /permanent|cannot be undone|no undo|irreversible/i
    );
    expect(row?.body).toMatch(/back ?up/i);
  });
});

/**
 * A prohibition rather than a requirement, so it has been green from the start
 * — it exists to stay green now that every copy slice has been written.
 *
 * Account Detail's "recurring net per month" is not documented anywhere,
 * deliberately: the helper behind it sums raw amounts with no link handling
 * while the projection engine subtracts them, so one transfer reads +500 on one
 * surface and -500 on the other. No honest sentence covers both, and a caveat
 * would document the inconsistency into permanence. It is a Live-Use Repair
 * defect, not a manual entry.
 */
/**
 * Month Cash Flow (issue #255): the Current Balance now counts the recurring
 * flows since the As of date, a rule edit rewrites every month since the
 * anchor, and re-anchoring is the correction. Accounts and Getting Started both
 * have to say so, each in a row a reader can find.
 */
describe.each<ManualTopicId>(["accounts", "start"])(
  "the %s topic on recurring flows in the balance",
  (id) => {
    const rows = () => MANUAL_TOPICS[id].details;

    it("says the balance counts recurring flows since the As of date", () => {
      const row = rows().find(
        (detail) =>
          /recurring/i.test(detail.body) &&
          /As of/.test(detail.body) &&
          /since/i.test(detail.body) &&
          /balance/i.test(detail.body)
      );

      expect(row).toBeDefined();
    });

    it("says editing a rule rewrites the months since the anchor", () => {
      const row = rows().find(
        (detail) =>
          /rewrit/i.test(detail.body) &&
          /rule/i.test(detail.body) &&
          /anchor/i.test(detail.body)
      );

      expect(row).toBeDefined();
    });

    it("names re-anchoring as the correction for a rewritten balance", () => {
      const row = rows().find(
        (detail) =>
          /rewrit/i.test(detail.body) && /re-anchor/i.test(detail.body)
      );

      expect(row).toBeDefined();
    });
  }
);

describe("the manual's deliberate silences", () => {
  it("says nothing about Account Detail's recurring net per month", () => {
    EXPECTED_TOPIC_IDS.forEach((id) => {
      expect(topicText(id)).not.toMatch(/recurring net/i);
    });
  });
});
