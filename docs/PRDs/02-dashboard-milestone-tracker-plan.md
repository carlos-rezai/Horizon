# Plan: Dashboard + Milestone Tracker

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/8

## Architectural decisions

- **Routes**: `GET /milestones`, `POST /milestones`, `DELETE /milestones/:id` — raw CRUD, no server-side estimation
- **Schema**: Milestone — `name` (string), `accountId` (string), `targetBalance` (integer cents)
- **Key models**: Milestone (new); Account and Projection Engine already exist
- **Frontend routing**: React Router, dashboard at `/`
- **Estimation logic**: client-side only — `findMortgagePayoffMonth` and `findMilestoneMonth` are pure functions in `src/utils/`, tested with Vitest
- **AccountKind crossing direction**: asset kinds (Girokonto, Tagesgeld, Investment, CreditCard) → `projected >= targetBalance`; Mortgage → `projected <= targetBalance`

---

## Phase 1: Account overview

**User stories**: 1, 2, 3, 4, 5, 6

### What to build

Set up React Router and create the dashboard page at `/`. Build the accounts feature: fetch `GET /accounts`, display every account with its name, AccountKind, and current balance. Show Total Liquid (Girokonto + Tagesgeld sum) at the top of the section. Liability accounts (Mortgage, CreditCard) are visually distinct from asset accounts. Show an empty state if no accounts exist.

### Acceptance criteria

- [ ] Dashboard renders at `/`
- [ ] All accounts appear with name, AccountKind, and current balance
- [ ] Total Liquid is displayed at the top of the account overview
- [ ] Mortgage and CreditCard accounts are visually distinct from asset accounts
- [ ] Empty state is shown when no accounts exist

---

## Phase 2: Mortgage countdown

**User stories**: 7, 8, 9, 10, 11, 12

### What to build

Add the projection feature: fetch `GET /projection` and expose the raw snapshots. Extract `findMortgagePayoffMonth(snapshots, mortgageAccountId)` as a tested pure utility that returns the first "YYYY-MM" where the Mortgage projected balance reaches zero, or `null`. Render one countdown card per Mortgage account showing the current Restschuld and "X years Y months remaining" to the Payoff Month. If the Payoff Month is null, show "Not paid off within 10-year horizon." The section is hidden entirely if no Mortgage accounts exist.

### Acceptance criteria

- [ ] `findMortgagePayoffMonth` pure function has full test coverage (reaches zero → correct month; never reaches zero → null)
- [ ] One countdown card per Mortgage account, labelled by account name
- [ ] Each card shows current Restschuld and "X years Y months remaining"
- [ ] "Not paid off within 10-year horizon" shown when projection does not reach zero
- [ ] Mortgage countdown section is hidden when no Mortgage accounts exist

---

## Phase 3: Milestone tracker

**User stories**: 13, 14, 15, 16, 17, 18, 19, 20

### What to build

Add the Milestone model and backend: `GET /milestones` returns raw milestone records; `POST /milestones` creates a milestone (validates `name`, `accountId`, `targetBalance`, and that `accountId` references a real account); `DELETE /milestones/:id` removes permanently. Extract `findMilestoneMonth(snapshots, accountId, targetBalance, accountKind)` as a tested pure utility that returns the first "YYYY-MM" where the projected balance crosses the target, or `null`. Build the milestones feature: fetch milestones and projection, compute estimated completion month per milestone, render the list with name + target account + estimated month. Provide a create form and delete button. Show empty state when no milestones exist.

### Acceptance criteria

- [ ] `findMilestoneMonth` pure function has full test coverage (asset account reaches target; asset never reaches target → null; Mortgage decreases to target; deactivated recurring excluded → null)
- [ ] `POST /milestones` returns 201 with the created milestone
- [ ] `POST /milestones` returns 400 when required fields are missing
- [ ] `POST /milestones` returns 404 when `accountId` does not reference a real account
- [ ] `GET /milestones` returns all milestones
- [ ] `DELETE /milestones/:id` returns 204 and removes the milestone
- [ ] `DELETE /milestones/:id` returns 404 for an unknown id
- [ ] Each milestone card shows name, target account name, target balance, and estimated completion month
- [ ] "Not reached within 10-year horizon" shown when projection does not cross the target
- [ ] Create form accepts name, account selection, and target balance
- [ ] Delete removes the milestone from the list immediately
- [ ] Empty state shown when no milestones exist
