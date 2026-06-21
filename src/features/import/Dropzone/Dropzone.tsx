import { useRef, useState } from "react";
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
  /** A CSV was dropped or chosen. */
  onFile: (file: File) => void;
}

export default function Dropzone({ onFile }: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const browse = () => inputRef.current?.click();

  return (
    <StyledDropzone
      $over={over}
      onClick={browse}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
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
          browse();
        }}
      >
        Choose file
      </Button>
    </StyledDropzone>
  );
}
