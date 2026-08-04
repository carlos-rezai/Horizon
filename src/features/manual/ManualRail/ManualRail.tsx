import type {
  ManualGroup,
  ManualTopicId,
  ManualTopicRecord,
} from "../manualTypes/manualTypes";
import {
  StyledRail,
  StyledGroup,
  StyledGroupLabel,
  StyledRailEntry,
} from "./ManualRail.styles";

interface ManualRailProps {
  groups: ManualGroup[];
  topics: ManualTopicRecord;
  /** The topic the reader is currently level with, marked as current. */
  activeTopicId: ManualTopicId;
  onJumpTo: (id: ManualTopicId) => void;
}

/**
 * The manual's table of contents: every topic under its group label, in index
 * order. It navigates and never routes — clicking an entry scrolls the pane
 * beside it, so nothing unmounts and a reader can always carry on scrolling
 * past the topic they arrived at.
 *
 * It renders what it is given rather than reading the content modules itself,
 * which is what keeps it testable against a small fixture instead of the whole
 * manual.
 */
export default function ManualRail({
  groups,
  topics,
  activeTopicId,
  onJumpTo,
}: ManualRailProps) {
  return (
    <StyledRail aria-label="Manual topics">
      {groups.map((group) => (
        <StyledGroup key={group.label}>
          <StyledGroupLabel data-testid="manual-group-label">
            {group.label}
          </StyledGroupLabel>
          {group.topicIds.map((id) => {
            const topic = topics[id];
            const EntryIcon = topic.icon;
            const isActive = activeTopicId === id;

            return (
              <StyledRailEntry
                key={id}
                type="button"
                $active={isActive}
                aria-current={isActive ? "true" : undefined}
                onClick={() => onJumpTo(id)}
              >
                <EntryIcon size={15} />
                {topic.title}
              </StyledRailEntry>
            );
          })}
        </StyledGroup>
      ))}
    </StyledRail>
  );
}
