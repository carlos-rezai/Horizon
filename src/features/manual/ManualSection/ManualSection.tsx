import type { Ref } from "react";
import ManualDetailRow from "../ManualDetailRow/ManualDetailRow";
import type { ManualTopic } from "../manualTypes";
import {
  StyledSection,
  StyledSectionHead,
  StyledTopicIcon,
  StyledTopicTitle,
  StyledBlurb,
  StyledDetails,
} from "./ManualSection.styles";

interface ManualSectionProps {
  topic: ManualTopic;
  /** The drawer's scroll-spy registration. The section knows nothing about
   *  scrolling — it just hands its own element up. */
  ref?: Ref<HTMLElement>;
}

/**
 * One topic in the content pane. The blurb sits above the detail rows on
 * purpose: a reader has to be able to judge whether a topic answers their
 * question without expanding anything.
 *
 * A topic with no rows yet is a legitimate shape, not an error — it renders as
 * its blurb alone until the copy slices fill it in.
 */
export default function ManualSection({ topic, ref }: ManualSectionProps) {
  const TopicIcon = topic.icon;

  return (
    <StyledSection ref={ref}>
      <StyledSectionHead>
        <StyledTopicIcon data-testid="manual-topic-icon">
          <TopicIcon size={18} />
        </StyledTopicIcon>
        <StyledTopicTitle>{topic.title}</StyledTopicTitle>
      </StyledSectionHead>

      <StyledBlurb>{topic.blurb}</StyledBlurb>

      {topic.details.length > 0 && (
        <StyledDetails>
          {topic.details.map((detail) => (
            <ManualDetailRow key={detail.heading} detail={detail} />
          ))}
        </StyledDetails>
      )}
    </StyledSection>
  );
}
