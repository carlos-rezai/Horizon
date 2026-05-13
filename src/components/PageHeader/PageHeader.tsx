import Heading from "../../primitives/Heading/Heading";
import { StyledPageHeader } from "./PageHeader.styles";

interface Props {
  text: string;
}

export default function PageHeader({ text }: Props) {
  return (
    <StyledPageHeader>
      <Heading level={1}>{text}</Heading>
    </StyledPageHeader>
  );
}
