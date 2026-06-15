import { useState } from "react";
import { Upload } from "lucide-react";
import Button from "../../../primitives/Button/Button";
import {
  StyledDropzone,
  StyledIconWrap,
  StyledText,
  StyledTitle,
  StyledHint,
} from "./Dropzone.styles";

interface Props {
  onPick: () => void;
}

export default function Dropzone({ onPick }: Props) {
  const [over, setOver] = useState(false);

  return (
    <StyledDropzone
      $over={over}
      onClick={onPick}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onPick();
      }}
    >
      <StyledIconWrap $over={over}>
        <Upload size={22} />
      </StyledIconWrap>
      <StyledText>
        <StyledTitle>Drop a bank statement to import</StyledTitle>
        <StyledHint>
          CSV from Sparkasse, DKB, ING and more · or click to browse
        </StyledHint>
      </StyledText>
      <Button
        variant="secondary"
        icon="Plus"
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
      >
        Choose file
      </Button>
    </StyledDropzone>
  );
}
