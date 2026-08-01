import { BookOpen, X } from "lucide-react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import ManualSection from "../ManualSection/ManualSection";
import { MANUAL_GROUPS, MANUAL_TOPICS } from "../manualContent";
import { MANUAL_TOPICS_IN_ORDER } from "../manualIndex";
import type { ManualTopicId } from "../manualTypes";
import { useManualScrollSpy } from "../useManualScrollSpy";
import {
  StyledOverlay,
  StyledBackdrop,
  StyledPanel,
  StyledHeader,
  StyledIdentity,
  StyledHeaderIcon,
  StyledTitle,
  StyledSubtitle,
  StyledClose,
  StyledColumns,
  StyledRail,
  StyledGroup,
  StyledGroupLabel,
  StyledRailEntry,
  StyledPane,
} from "./ManualDrawer.styles";

/** Document order, fixed once at module load — the spy compares scroll offsets
 *  against it, so it must not be rebuilt on every render. */
const MANUAL_TOPIC_ORDER: ManualTopicId[] = MANUAL_TOPICS_IN_ORDER.map(
  (topic) => topic.id
);

interface ManualDrawerProps {
  /** Drives the enter and exit transitions. Mounting belongs to the caller,
   *  which keeps the drawer in the tree until the exit has finished. */
  open: boolean;
  onClose: () => void;
}

/**
 * The manual's slide-over shell: a grouped table of contents on the left and
 * every topic, all at once, on the right. The rail navigates — it never routes,
 * so nothing is unmounted by clicking it and a reader can always scroll on past
 * the topic they arrived at.
 *
 * The panel reports its own motion state — `data-state` for the transition and
 * `data-motion` for whether there is one at all — since the animation itself is
 * unobservable in tests.
 */
export default function ManualDrawer({ open, onClose }: ManualDrawerProps) {
  const reduced = useReducedMotion();
  const { activeTopicId, paneRef, registerSection, jumpTo } =
    useManualScrollSpy(MANUAL_TOPIC_ORDER);

  return (
    <StyledOverlay>
      <StyledBackdrop data-testid="manual-backdrop" onClick={onClose} />
      <StyledPanel
        role="dialog"
        aria-modal="true"
        aria-label="User Manual"
        data-testid="manual-panel"
        data-state={open ? "open" : "closed"}
        data-motion={reduced ? "none" : "slide"}
        $open={open}
        $slide={!reduced}
      >
        <StyledHeader>
          <StyledIdentity>
            <StyledHeaderIcon>
              <BookOpen size={18} />
            </StyledHeaderIcon>
            <div>
              <StyledTitle>User Manual</StyledTitle>
              <StyledSubtitle>How to use Horizon</StyledSubtitle>
            </div>
          </StyledIdentity>
          <StyledClose
            type="button"
            aria-label="Close manual"
            onClick={onClose}
          >
            <X size={19} />
          </StyledClose>
        </StyledHeader>

        <StyledColumns>
          <StyledRail aria-label="Manual topics">
            {MANUAL_GROUPS.map((group) => (
              <StyledGroup key={group.label}>
                <StyledGroupLabel data-testid="manual-group-label">
                  {group.label}
                </StyledGroupLabel>
                {group.topicIds.map((id) => {
                  const topic = MANUAL_TOPICS[id];
                  const EntryIcon = topic.icon;
                  const isActive = activeTopicId === id;

                  return (
                    <StyledRailEntry
                      key={id}
                      type="button"
                      $active={isActive}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => jumpTo(id)}
                    >
                      <EntryIcon size={15} />
                      {topic.title}
                    </StyledRailEntry>
                  );
                })}
              </StyledGroup>
            ))}
          </StyledRail>

          <StyledPane data-testid="manual-pane" ref={paneRef}>
            {MANUAL_TOPICS_IN_ORDER.map((topic) => (
              <ManualSection
                key={topic.id}
                topic={topic}
                ref={(element) => registerSection(topic.id, element)}
              />
            ))}
          </StyledPane>
        </StyledColumns>
      </StyledPanel>
    </StyledOverlay>
  );
}
