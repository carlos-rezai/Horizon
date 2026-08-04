import { describe, it, expect } from "vitest";
import { Flag, LayoutDashboard } from "lucide-react";
import type {
  ManualGroup,
  ManualTopic,
  ManualTopicId,
} from "../manualTypes/manualTypes";
import { MANUAL_GROUPS, MANUAL_TOPICS } from "../manualContent/manualContent";
import {
  orderManualTopics,
  findManualIndexFaults,
  MANUAL_TOPICS_IN_ORDER,
} from "./manualIndex";

/**
 * The index is the only module that knows how the table of contents and the
 * content pane relate. Its faults are asserted against deliberately broken
 * fixtures as well as the shipped content — shipped content is sound by
 * construction, so it can never prove the validator catches anything.
 */
function stubTopic(id: ManualTopicId, title: string): ManualTopic {
  return {
    id,
    icon: id === "dashboard" ? LayoutDashboard : Flag,
    title,
    blurb: `What ${title} is for.`,
    details: [],
  };
}

function idsOf(topics: ManualTopic[]): ManualTopicId[] {
  return topics.map((topic) => topic.id);
}

describe("orderManualTopics", () => {
  it("returns topics in group order, not record order", () => {
    const groups: ManualGroup[] = [
      { label: "Overview", topicIds: ["dashboard"] },
      { label: "Getting Started", topicIds: ["start"] },
    ];
    const topics = {
      start: stubTopic("start", "Getting Started"),
      dashboard: stubTopic("dashboard", "Dashboard"),
    };

    expect(idsOf(orderManualTopics(groups, topics))).toEqual([
      "dashboard",
      "start",
    ]);
  });

  it("keeps each group's topics in the order the group lists them", () => {
    const groups: ManualGroup[] = [
      { label: "Planning", topicIds: ["month", "outlook"] },
    ];
    const topics = {
      outlook: stubTopic("outlook", "Outlook"),
      month: stubTopic("month", "Month Overview"),
    };

    expect(idsOf(orderManualTopics(groups, topics))).toEqual([
      "month",
      "outlook",
    ]);
  });

  it("flattens every group into one sequence", () => {
    const groups: ManualGroup[] = [
      { label: "Getting Started", topicIds: ["start"] },
      { label: "Overview", topicIds: ["dashboard", "streak"] },
    ];
    const topics = {
      start: stubTopic("start", "Getting Started"),
      dashboard: stubTopic("dashboard", "Dashboard"),
      streak: stubTopic("streak", "Savings Streak"),
    };

    expect(idsOf(orderManualTopics(groups, topics))).toEqual([
      "start",
      "dashboard",
      "streak",
    ]);
  });
});

describe("findManualIndexFaults", () => {
  it("reports nothing when every topic sits in exactly one group", () => {
    const groups: ManualGroup[] = [
      { label: "Getting Started", topicIds: ["start"] },
      { label: "Overview", topicIds: ["dashboard"] },
    ];
    const topics = {
      start: stubTopic("start", "Getting Started"),
      dashboard: stubTopic("dashboard", "Dashboard"),
    };

    expect(findManualIndexFaults(groups, topics)).toEqual([]);
  });

  it("reports a topic listed by two groups", () => {
    const groups: ManualGroup[] = [
      { label: "Overview", topicIds: ["dashboard"] },
      { label: "Planning", topicIds: ["dashboard"] },
    ];
    const topics = { dashboard: stubTopic("dashboard", "Dashboard") };

    const faults = findManualIndexFaults(groups, topics);

    expect(faults).not.toHaveLength(0);
    expect(faults.join(" ")).toContain("dashboard");
  });

  it("reports a topic that no group lists, so it can never be reached", () => {
    const groups: ManualGroup[] = [
      { label: "Getting Started", topicIds: ["start"] },
    ];
    const topics = {
      start: stubTopic("start", "Getting Started"),
      streak: stubTopic("streak", "Savings Streak"),
    };

    const faults = findManualIndexFaults(groups, topics);

    expect(faults).not.toHaveLength(0);
    expect(faults.join(" ")).toContain("streak");
  });

  it("reports a group entry with no topic behind it", () => {
    const groups: ManualGroup[] = [
      { label: "Data", topicIds: ["import", "categories"] },
    ];
    const topics = { import: stubTopic("import", "Import") };

    const faults = findManualIndexFaults(groups, topics);

    expect(faults).not.toHaveLength(0);
    expect(faults.join(" ")).toContain("categories");
  });
});

describe("the shipped manual index", () => {
  it("is structurally sound — no orphans, no duplicates, no dangling ids", () => {
    expect(findManualIndexFaults(MANUAL_GROUPS, MANUAL_TOPICS)).toEqual([]);
  });

  it("renders in the order the groups declare", () => {
    expect(idsOf(MANUAL_TOPICS_IN_ORDER)).toEqual(
      MANUAL_GROUPS.flatMap((group) => group.topicIds)
    );
  });

  it("covers every topic in the content module exactly once", () => {
    const listed = idsOf(MANUAL_TOPICS_IN_ORDER);

    expect(listed).toHaveLength(Object.keys(MANUAL_TOPICS).length);
    expect(new Set(listed).size).toBe(listed.length);
  });

  it("opens with Getting Started", () => {
    expect(MANUAL_TOPICS_IN_ORDER[0]?.id).toBe("start");
  });
});
