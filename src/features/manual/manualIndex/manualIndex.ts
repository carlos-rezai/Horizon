import type {
  ManualGroup,
  ManualTopic,
  ManualTopicId,
  ManualTopicRecord,
} from "../manualTypes/manualTypes";
import { MANUAL_GROUPS, MANUAL_TOPICS } from "../manualContent/manualContent";

/**
 * The only module that knows how the table of contents and the content pane
 * relate: the rail renders the groups, the pane renders this flat list, and
 * both come from the same declaration. No React, no DOM.
 *
 * Both functions take the groups and topics as arguments rather than reading
 * the content module directly, so the invariant can be tested against
 * deliberately broken fixtures — shipped content is sound by construction and
 * could never prove the validator catches anything.
 */

/** A subset of the topics, so callers may pass fixtures as well as the real set. */
type TopicLookup = Partial<ManualTopicRecord>;

/**
 * The topics in the order the groups declare them — group order first, then
 * each group's own order. Record order is irrelevant.
 */
export function orderManualTopics(
  groups: ManualGroup[],
  topics: TopicLookup
): ManualTopic[] {
  return groups.flatMap((group) =>
    group.topicIds.flatMap((id) => {
      const topic = topics[id];
      return topic ? [topic] : [];
    })
  );
}

/**
 * Everything wrong with an index, in reader-facing terms: a topic two groups
 * both claim, a topic no group lists (unreachable), and a group entry with no
 * topic behind it (a dead rail row). An empty result means the rail and the
 * pane agree.
 */
export function findManualIndexFaults(
  groups: ManualGroup[],
  topics: TopicLookup
): string[] {
  const faults: string[] = [];
  const listed = new Set<ManualTopicId>();

  groups.forEach((group) => {
    group.topicIds.forEach((id) => {
      if (listed.has(id)) {
        faults.push(`"${id}" is listed by more than one group entry`);
      }
      listed.add(id);

      if (!topics[id]) {
        faults.push(
          `"${id}" is listed by group "${group.label}" but has no topic`
        );
      }
    });
  });

  (Object.keys(topics) as ManualTopicId[]).forEach((id) => {
    if (!listed.has(id)) {
      faults.push(
        `"${id}" has a topic but no group lists it, so it is unreachable`
      );
    }
  });

  return faults;
}

/** The shipped manual, flattened once at module load. */
export const MANUAL_TOPICS_IN_ORDER: ManualTopic[] = orderManualTopics(
  MANUAL_GROUPS,
  MANUAL_TOPICS
);
