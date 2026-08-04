import type { LucideIcon } from "lucide-react";

/**
 * The manual's ten topics, as a closed union. Adding a topic is a type-level
 * decision: the id has to be added here before content, groups or the index
 * will accept it, so a topic can never exist without a home in the rail.
 */
export type ManualTopicId =
  | "start"
  | "dashboard"
  | "streak"
  | "outlook"
  | "month"
  | "history"
  | "import"
  | "accounts"
  | "categories"
  | "settings";

/** One entry in a detail row's reference list — a name and what it means. */
export interface ManualTerm {
  term: string;
  definition: string;
}

/**
 * One collapsible row inside a topic. `terms` present means the row expands
 * into a definition list instead of a paragraph.
 */
export interface ManualDetail {
  heading: string;
  body: string;
  terms?: ManualTerm[];
}

/**
 * One manual topic. `icon` holds the lucide component itself rather than a
 * name to look up, so a nonexistent icon fails at compile time and no registry
 * has to exist.
 */
export interface ManualTopic {
  id: ManualTopicId;
  icon: LucideIcon;
  title: string;
  blurb: string;
  details: ManualDetail[];
}

/** A labelled cluster of topics in the table of contents. */
export interface ManualGroup {
  label: string;
  topicIds: ManualTopicId[];
}

/** Every topic, keyed by its own id. */
export type ManualTopicRecord = Record<ManualTopicId, ManualTopic>;
