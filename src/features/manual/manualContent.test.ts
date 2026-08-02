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
