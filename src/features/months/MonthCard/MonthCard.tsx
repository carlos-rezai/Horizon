import { Link } from "react-router-dom";
import { formatMonth } from "../../../utils/format/format";
import { StyledMonthCard } from "./MonthCard.styles";

interface Props {
  month: string;
}

export default function MonthCard({ month }: Props) {
  return (
    <StyledMonthCard>
      <Link to={`/months/${month}`}>{formatMonth(month)}</Link>
    </StyledMonthCard>
  );
}
