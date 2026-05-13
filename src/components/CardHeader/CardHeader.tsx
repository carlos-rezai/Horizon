import Heading from "../../primitives/Heading/Heading";
import { StyledCardHeader } from "./CardHeader.styles";

interface Props {
  text: string;
}

export default function CardHeader({ text }: Props) {
  return (
    <StyledCardHeader>
      <Heading level={2}>{text}</Heading>
    </StyledCardHeader>
  );
}
