import { MONTHS } from "../../utils/format/format";
import {
  StyledDayBlock,
  StyledDayNum,
  StyledDayMonth,
} from "./DayBlock.styles";

interface DayBlockProps {
  /** ISO date "YYYY-MM-DD" */
  date: string;
}

/** A date as a row's leading block: the day number over the short month. */
export default function DayBlock({ date }: DayBlockProps) {
  const day = parseInt(date.slice(8, 10), 10);
  const monthIdx = parseInt(date.slice(5, 7), 10) - 1;
  return (
    <StyledDayBlock>
      <StyledDayNum>{day}</StyledDayNum>
      <StyledDayMonth>{MONTHS[monthIdx]}</StyledDayMonth>
    </StyledDayBlock>
  );
}
