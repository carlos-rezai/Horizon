<!-- Draft notes for the next release. Pass to `gh release edit vX.Y.Z --notes-file` when publishing, then reset. -->

**Month Cash Flow**

Month Overview now shows the whole month, past or future, not only Variable Spending. A new Fixed Flows card lists each account's recurring income and transfers for the month — transfers out in red, transfers in in green, a credit card's settlement, annual items such as a Sondertilgung only in their month — with a "Net fixed" total and the account's Month-End Balance, marked Actual for a past month and Projected for the current and future ones. Future months no longer read €0 on every account.

**Upgrade caveat: balances anchored in the past**

An account's Current Balance now counts the recurring flows that have fallen due since its As of date. If you anchored an account in the past — entered a balance with an As of date weeks or months ago — its balance grows on upgrade by the salary, transfers and repayments since that date. That is the intended figure if those flows really happened after the anchor. If a balance now looks doubled, because you had been keeping the anchor up to date by hand, re-anchor the account: open it, enter the balance your bank shows today under Balance with today's date under As of, and save. Do not delete the recurring rules to fix it. The same applies after editing a recurring rule: the edit rewrites every month since the anchor, and re-anchoring is the correction.
