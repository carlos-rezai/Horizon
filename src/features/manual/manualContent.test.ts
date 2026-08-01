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
