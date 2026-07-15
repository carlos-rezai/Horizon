import { Flame } from "lucide-react";
import Card from "../../../components/Card/Card";
import type { SavingsGoal } from "../savingsTypes";
import {
  StyledHeader,
  StyledTitleGroup,
  StyledFlameBadge,
  StyledOverline,
  StyledTitleRow,
  StyledTitle,
  StyledCurrent,
  StyledBest,
  StyledStrip,
  StyledTile,
  StyledTileLabel,
  StyledCaption,
} from "./SavingsStreakCard.styles";

interface SavingsStreakCardProps {
  goal: SavingsGoal;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * The collapsed Savings Streak card: the flame, current-streak count (most
 * prominent), best-ever streak, and the Jan→Dec calendar strip. Rendered
 * full-width on the Dashboard, kept distinct from the Trajectory Horizon chart.
 * The expanded per-account rows and the goal editor arrive in later phases.
 */
export default function SavingsStreakCard({ goal }: SavingsStreakCardProps) {
  const { current, best, yearTicks } = goal.streak;
  const isRecord = current > 0 && current >= best;
  const anyTracked = goal.perAccount.some((p) => p.tracked);
  const hasHistory = yearTicks.length > 0;

  return (
    <Card>
      <StyledHeader>
        <StyledTitleGroup>
          <StyledFlameBadge>
            <Flame size={22} />
          </StyledFlameBadge>
          <div>
            <StyledOverline>Motivation</StyledOverline>
            <StyledTitleRow>
              <StyledTitle>Savings Streak</StyledTitle>
              <StyledCurrent className="mono">{current} mo</StyledCurrent>
              {best > 0 && (
                <StyledBest>
                  {isRecord ? "matching your best" : `best ${best} mo`}
                </StyledBest>
              )}
            </StyledTitleRow>
          </div>
        </StyledTitleGroup>
      </StyledHeader>

      {hasHistory && (
        <>
          <StyledStrip>
            {yearTicks.map((tick, index) => {
              const label =
                tick.status === "upcoming"
                  ? "upcoming"
                  : tick.status === "met"
                    ? "goal met"
                    : "goal missed";
              return (
                <StyledTile
                  key={`${tick.year}-${tick.month}`}
                  $status={tick.status}
                  $index={index}
                  title={`${MONTHS[tick.month]} ${tick.year} · ${label}`}
                >
                  <StyledTileLabel $status={tick.status}>
                    {MONTHS[tick.month].slice(0, 3)}
                  </StyledTileLabel>
                </StyledTile>
              );
            })}
          </StyledStrip>
          <StyledCaption>
            {yearTicks[0].year} ·{" "}
            {anyTracked
              ? "every tracked account hit its savings target"
              : "no accounts tracked yet — set a goal to start"}
          </StyledCaption>
        </>
      )}
    </Card>
  );
}
