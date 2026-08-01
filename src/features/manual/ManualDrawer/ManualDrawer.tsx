import { BookOpen, X } from "lucide-react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { MANUAL_TOPICS } from "../manualContent";
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
  StyledPane,
  StyledSection,
  StyledSectionHead,
  StyledTopicIcon,
  StyledTopicTitle,
  StyledBlurb,
} from "./ManualDrawer.styles";

interface ManualDrawerProps {
  /** Drives the enter and exit transitions. Mounting belongs to the caller,
   *  which keeps the drawer in the tree until the exit has finished. */
  open: boolean;
  onClose: () => void;
}

/**
 * The manual's slide-over shell. It renders whatever the content module says
 * and reports its own motion state on the panel — `data-state` for the
 * transition and `data-motion` for whether there is one at all — since the
 * animation itself is unobservable in tests.
 */
export default function ManualDrawer({ open, onClose }: ManualDrawerProps) {
  const reduced = useReducedMotion();
  // One topic for now; the rail and the full pane arrive with the next slice.
  const topic = MANUAL_TOPICS.start;
  const TopicIcon = topic.icon;

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
        <StyledPane data-testid="manual-pane">
          <StyledSection>
            <StyledSectionHead>
              <StyledTopicIcon data-testid="manual-topic-icon">
                <TopicIcon size={18} />
              </StyledTopicIcon>
              <StyledTopicTitle>{topic.title}</StyledTopicTitle>
            </StyledSectionHead>
            <StyledBlurb>{topic.blurb}</StyledBlurb>
          </StyledSection>
        </StyledPane>
      </StyledPanel>
    </StyledOverlay>
  );
}
