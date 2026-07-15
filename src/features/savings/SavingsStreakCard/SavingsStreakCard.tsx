import { useState } from "react";
import { Flame, ChevronDown } from "lucide-react";
import Card from "../../../components/Card/Card";
import Avatar from "../../../primitives/Avatar/Avatar";
import Badge from "../../../primitives/Badge/Badge";
import ProgressBar from "../../../primitives/ProgressBar/ProgressBar";
import { formatBalance } from "../../../utils/format/format";
import type { SavingsGoal, PerAccountGoal } from "../savingsTypes";
import type { AccountWithBalance } from "../../../types/account";
import {
  StyledHeader,
  StyledTitleGroup,
  StyledToggle,
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
  StyledRows,
  StyledRow,
  StyledRowBody,
  StyledRowName,
  StyledAccountName,
  StyledProgress,
  StyledAmounts,
  StyledSaved,
  StyledTargetAmount,
  StyledUntrackedHint,
  StyledMonthly,
  StyledPerMonth,
} from "./SavingsStreakCard.styles";

interface SavingsStreakCardProps {
  goal: SavingsGoal;
  accounts: AccountWithBalance[];
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

/** Whole-euro target (no cents), matching the design's "8 €/mo". */
function formatMonthlyTarget(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * The Savings Streak card: a Dashboard accordion. Collapsed, it shows the
 * flame, current-streak count (most prominent), best-ever streak, and the
 * Jan→Dec calendar strip. Expanded (click the header or chevron), it keeps that
 * header and adds one row per trackable account — avatar, cumulative
 * saved-vs-target progress since the goal's start date, and the monthly target.
 * Untracked accounts (0/mo) stay visible, dimmed, with a "Not tracked" badge.
 * The streak/strip reflect all history; the per-account bars scope to
 * `startedAt`. Kept distinct from the Trajectory Horizon chart.
 */
export default function SavingsStreakCard({
  goal,
  accounts,
}: SavingsStreakCardProps) {
  const [open, setOpen] = useState(false);
  const { current, best, yearTicks } = goal.streak;
  const isRecord = current > 0 && current >= best;
  const anyTracked = goal.perAccount.some((p) => p.tracked);
  const hasHistory = yearTicks.length > 0;

  const accountById = (id: string): AccountWithBalance | undefined =>
    accounts.find((account) => account.id === id);

  const toggle = () => setOpen((o) => !o);

  return (
    <Card>
      <StyledHeader>
        <StyledTitleGroup onClick={toggle}>
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
        <StyledToggle
          type="button"
          onClick={toggle}
          $open={open}
          aria-label={open ? "Collapse" : "Expand"}
        >
          <ChevronDown size={17} />
        </StyledToggle>
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

      {open && (
        <StyledRows>
          {goal.perAccount.map((entry, index) => {
            const account = accountById(entry.id);
            if (!account) return null;
            return (
              <PerAccountRow
                key={entry.id}
                entry={entry}
                account={account}
                last={index === goal.perAccount.length - 1}
              />
            );
          })}
        </StyledRows>
      )}
    </Card>
  );
}

interface PerAccountRowProps {
  entry: PerAccountGoal;
  account: AccountWithBalance;
  last: boolean;
}

function PerAccountRow({ entry, account, last }: PerAccountRowProps) {
  const met = entry.cumulativeActual >= entry.cumulativeTarget;
  const pct =
    entry.tracked && entry.cumulativeTarget > 0
      ? Math.min(100, (entry.cumulativeActual / entry.cumulativeTarget) * 100)
      : 0;

  return (
    <StyledRow $tracked={entry.tracked} $last={last}>
      <Avatar account={account} size={34} />
      <StyledRowBody>
        <StyledRowName>
          <StyledAccountName>{account.name}</StyledAccountName>
          {!entry.tracked && <Badge tone="neutral">Not tracked</Badge>}
        </StyledRowName>
        {entry.tracked ? (
          <>
            <StyledProgress>
              <ProgressBar value={pct} />
            </StyledProgress>
            <StyledAmounts>
              <StyledSaved $met={met}>
                {formatBalance(entry.cumulativeActual)}
              </StyledSaved>{" "}
              saved of{" "}
              <StyledTargetAmount>
                {formatBalance(entry.cumulativeTarget)}
              </StyledTargetAmount>{" "}
              target
            </StyledAmounts>
          </>
        ) : (
          <StyledUntrackedHint>No monthly target set</StyledUntrackedHint>
        )}
      </StyledRowBody>
      <div>
        {entry.tracked && (
          <StyledMonthly className="mono">
            {formatMonthlyTarget(entry.target)}
            <StyledPerMonth> /mo</StyledPerMonth>
          </StyledMonthly>
        )}
      </div>
    </StyledRow>
  );
}
