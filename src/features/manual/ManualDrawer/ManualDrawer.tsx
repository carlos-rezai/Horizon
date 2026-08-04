import { useRef, type RefObject } from "react";
import { BookOpen, X } from "lucide-react";
import { useDialogKeyboard } from "../../../hooks/useDialogKeyboard";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import ManualRail from "../ManualRail/ManualRail";
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
  /** Where focus goes on close when nothing in the page opened the drawer —
   *  the Electron Help menu leaves the keyboard outside the window entirely,
   *  so there is no trigger to hand it back to. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * The manual's slide-over shell: the table-of-contents rail on the left and
 * every topic, all at once, in the scrolling pane on the right. The drawer wires
 * the two together through the scroll spy — the rail says where to go, the pane
 * says where the reader now is — and owns nothing else about either.
 *
 * The panel reports its own motion state — `data-state` for the transition and
 * `data-motion` for whether there is one at all — since the animation itself is
 * unobservable in tests.
 *
 * While it is open the drawer owns the keyboard: focus moves onto the panel,
 * Tab cycles within it, and closing hands the position back to wherever it came
 * from.
 */
export default function ManualDrawer({
  open,
  onClose,
  returnFocusRef,
}: ManualDrawerProps) {
  const reduced = useReducedMotion();
  const { activeTopicId, paneRef, registerSection, jumpTo } =
    useManualScrollSpy(MANUAL_TOPIC_ORDER);
  const panelRef = useRef<HTMLDivElement>(null);

  useDialogKeyboard({
    surfaceRef: panelRef,
    onClose,
    open,
    returnFocusRef,
  });

  return (
    <StyledOverlay>
      <StyledBackdrop data-testid="manual-backdrop" onClick={onClose} />
      <StyledPanel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="User Manual"
        tabIndex={-1}
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
          <ManualRail
            groups={MANUAL_GROUPS}
            topics={MANUAL_TOPICS}
            activeTopicId={activeTopicId}
            onJumpTo={jumpTo}
          />

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
