/**
 * The **Conformance Allowlist**: the raw `button`, `input`, `select` and
 * `textarea` styled elements outside `primitives/` that Primitive Conformance
 * accepts, each with the reason no primitive fits it.
 *
 * Written from what remained after the UI Consistency Audit fixes (issues #267
 * to #275), this list may only shrink. When an entry's control moves onto a
 * primitive, remove the entry; never add one to quiet the guard.
 */
export interface ConformanceAllowlistEntry {
  /** The style module, relative to `src/`. */
  file: string;
  /** The exported styled element. */
  exportName: string;
  /** Why no primitive fits it. */
  reason: string;
}

export const CONFORMANCE_ALLOWLIST: readonly ConformanceAllowlistEntry[] = [
  {
    file: "components/SeriesLegend/SeriesLegend.styles.ts",
    exportName: "StyledChip",
    reason: "legend series toggle chip",
  },
  {
    file: "components/SeriesLegend/SeriesLegend.styles.ts",
    exportName: "StyledShowAllButton",
    reason: "legend reset chip",
  },
  {
    file: "components/Snackbar/Snackbar.styles.ts",
    exportName: "StyledActionButton",
    reason: "inline text action inside the snackbar",
  },
  {
    file: "layouts/AppLayout/AppLayout.styles.ts",
    exportName: "StyledManualTrigger",
    reason: "sidebar nav item that opens the manual overlay",
  },
  {
    file: "features/accounts/AccountCreateModal/AccountCreateModal.styles.ts",
    exportName: "StyledIconButton",
    reason: "icon picker cell",
  },
  {
    file: "features/categories/CategoryManagerModal/CategoryManagerModal.styles.ts",
    exportName: "SwatchDot",
    reason: "colour swatch",
  },
  {
    file: "features/categories/CategoryManagerModal/CategoryManagerModal.styles.ts",
    exportName: "AddButton",
    reason: "dashed add-row affordance",
  },
  {
    file: "features/history/HistoryChart/HistoryChart.styles.ts",
    exportName: "StyledRangeChip",
    reason: "segmented History range control",
  },
  {
    file: "features/import/ImportWizard/ImportWizard.styles.ts",
    exportName: "StyledBlockedPill",
    reason: "error-toned call-to-action pill",
  },
  {
    file: "features/import/ImportWizard/ImportWizard.styles.ts",
    exportName: "StyledAttentionToggle",
    reason: "table filter pill (aria-pressed)",
  },
  {
    file: "features/import/ImportWizard/ReviewTable/ReviewTable.styles.ts",
    exportName: "StyledCheck",
    reason: "table row checkbox",
  },
  {
    file: "features/manual/ManualDetailRow/ManualDetailRow.styles.ts",
    exportName: "StyledToggle",
    reason: "disclosure header",
  },
  {
    file: "features/manual/ManualRail/ManualRail.styles.ts",
    exportName: "StyledRailEntry",
    reason: "table-of-contents nav item",
  },
  {
    file: "features/months/MonthYearPicker/MonthYearPicker.styles.ts",
    exportName: "StyledTrigger",
    reason: "month picker trigger, local to one feature",
  },
  {
    file: "features/months/MonthYearPicker/MonthYearPicker.styles.ts",
    exportName: "StyledMonthCell",
    reason: "calendar cell",
  },
  {
    file: "features/projection/ProjectionAccordion/ProjectionAccordion.styles.ts",
    exportName: "StyledYearHeader",
    reason: "disclosure header",
  },
  {
    file: "features/savings/SavingsStreakCard/SavingsStreakCard.styles.ts",
    exportName: "StyledTitleGroup",
    reason: "disclosure header",
  },
  {
    file: "features/settings/StorageCard/StorageCard.styles.ts",
    exportName: "HiddenFileInput",
    reason: "hidden file input",
  },
  {
    file: "features/settings/StorageStatus/StorageStatus.styles.ts",
    exportName: "HiddenFileInput",
    reason: "hidden file input",
  },
];
