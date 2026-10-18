<!-- Draft notes for the next release. Pass to `gh release edit vX.Y.Z --notes-file` when publishing, then reset. -->

Horizon v1.4.0 shows where your money has been, not only where it is going. Balances are now worked out backwards from a balance you know, so past months are real figures rather than guesses. The History page and the Dashboard trajectory draw that past next to the projection, Month Overview shows the whole month, and imports learn your categories. The release also fixes the first round of problems found while using Horizon day to day. Your database carries over; read the upgrade caveat under Month Cash Flow if you entered a balance with an As of date in the past.

**Fixes from live use**

- A recurring transfer now has a direction control (to or from an account), and you always type a positive amount. The source account shows the transfer as a red −amount. The destination account shows a read-only green +amount marked with where it came from.
- The Mortgage Countdown has a proper empty state, and a single flow sets up the mortgage, its origination and its annual repayment.
- The Outlook accordion is now called **Projection** and has one column per account.
- A Sondertilgung is counted only from the annual repayment and only while Restschuld remains, never from the monthly rate.

**Balance Anchor**

Every account's balance now starts from one known balance on one known day: the account form's **Balance** and **As of** fields, such as today's figure from your bank app or a statement's closing Saldo. Horizon adds the transactions after that day and works backwards through the transactions before it. Importing older statements now extends the account's history without changing today's balance. Before the earliest known balance, months show as unknown ("No data before …", "—"), never as €0. A recurring flow no longer changes a balance before its account's As of date. To re-anchor an account, edit its balance and date.

**Financial History**

The mortgage's whole life is on one line: History starts at the mortgage's origination and draws a dotted Paydown Bridge up to your first recorded data. The bridge never shows invented monthly figures. The Dashboard's Trajectory Horizon draws up to ten years of real history to the left of the projection, under an "ACTUALS" label, and the TODAY marker now sits where today really is. A new History Trends card shows monthly **Saved** and **Spent** bars with a 12-month average line.

**Month Cash Flow**

Month Overview now shows the whole month, past or future, not only Variable Spending. A new Fixed Flows card lists each account's recurring income and transfers for the month — transfers out in red, transfers in in green, a credit card's settlement, annual items such as a Sondertilgung only in their month — with a "Net fixed" total and the account's Month-End Balance, marked Actual for a past month and Projected for the current and future ones. Future months no longer read €0 on every account.

**Upgrade caveat: balances anchored in the past**

An account's Current Balance now counts the recurring flows that have fallen due since its As of date. If you anchored an account in the past — entered a balance with an As of date weeks or months ago — its balance grows on upgrade by the salary, transfers and repayments since that date. That is the intended figure if those flows really happened after the anchor. If a balance now looks doubled, because you had been keeping the anchor up to date by hand, re-anchor the account: open it, enter the balance your bank shows today under Balance with today's date under As of, and save. Do not delete the recurring rules to fix it. The same applies after editing a recurring rule: the edit rewrites every month since the anchor, and re-anchoring is the correction.

**Import Category Learning**

Imported rows no longer land almost entirely in Miscellaneous. When you commit a statement, Horizon remembers the category each payee ended up in, and the next statement brings that payee in already categorized, marked "Learned" in the review step. A payee it has not learned yet but recognises from a built-in list of common merchants arrives in your matching category, marked "Suggested". When that merchant's category is one you do not have — a food delivery with no Dining category, say — Horizon proposes it instead of guessing: a strip above the review table offers "Create category" or "Dismiss". One correction is enough per payee: changing a row's category moves every other row from the same payee that you have not set yourself, and the commit teaches the whole group. Everything stays on your device and is rule-based; there is no rule editor, and corrections in the review step are how you teach it.

**Things to know about category learning**

- Learning starts from your next import. Statements you have already committed are not re-categorized.
- Dismissing a proposed category is permanent: Horizon will not propose it again. If you change your mind, create the category yourself in Category Management, and future imports will use it.
- A shared counterparty such as PayPal or Amazon Payments learns one category for every merchant behind it. Correct those rows one by one in the review step; when a payee's rows end up in different categories, the category most of them carry is the one learned.
