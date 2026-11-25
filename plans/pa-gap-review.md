# Payment Analysis – change list review (nothing changed yet)

Files: `src/screens/PaymentAnalysis.tsx` (claims profile, matrix, rules, editor), `src/screens/PaymentSimulation.tsx` (Credit List & Logs), `src/screens/PaymentAnalysisParameters.tsx`, `src/components/AppShell.tsx`, `src/App.tsx`.

## Status per item

| # | Item | Status | What needs to be done |
|---|------|--------|------------------------|
| 1 | Rename to "Credit Types & Claim Rules" | Partly done | Sidebar and breadcrumbs already say it. The page H1 on the main screen still says "Payment Analysis" (PaymentAnalysis.tsx ~l.805), so change it. |
| 2 | Save on Credit-Claim Matrix | Missing | `ComparePage` is read-only. The matrix cells need to become toggles bound to `runsByType`, and a Save button (with the existing save-confirm modal and dirty tracking) goes in a header bar. |
| 3 | Rename "Credit Logs" to "Credit List & Logs" | Done | Sidebar, breadcrumb and H1 already match. |
| 4 | Back button on Matrix | Missing | Add a header with the title plus a Back button that returns to the profile view. |
| 5 | Remove "Risk level" flag | Missing | Remove `risk` from the `Flags` type, the flag list (l.88), `INITIAL_FLAGS` and `INITIAL_FLAGS_BY_TYPE`. |
| 6 | Claim Rules as separate screen | Partly done | Today it is a sub-view opened by a button on the main screen. To finish: add a sidebar entry "Claim Rules" under Payment Analysis (AppShell plus App.tsx screen key and breadcrumbs), and remove the button from the main screen header. |
| 7 | Credit ID column | Missing | Add a `creditId` field to the log records and make Credit ID the first column. |
| 8 | "Mode of Payment Analysis" section in Parameters | Missing | The Parameters screen only wraps `DeductionParameters`. Add a card above it with a two-sided toggle (Instantaneous / Batch Job Based). Changing it opens the "Are you sure…" Yes/No modal, then the "Please double-confirm… MAJOR FINANCIAL AND SYSTEM PERFORMANCE implications" Confirm/Cancel modal. Confirm applies the change and shows a top banner: "Mode of Payment Analysis has been changed". Cancel or No keeps the old value. |
| 9 | Crop year to Crop Season | Missing | Change the table header (l.877) and the detail meta label (l.599). |
| 10 | Region to Hierarchical Node | Missing | Change the header (l.880). |
| 11 | Date to Created (timestamp) | Missing | Rename the header and change the data to `dd/mm/yyyy hh:mm`. |
| 12 | Credit to Processing Status | Unclear | There is no "Credit" column. The closest are "Status" and "Trigger" (which shows the credit event and amount). Assumption: rename **Status** to Processing Status. |
| 13 | Swap Contract and Tobacco | Missing | The order becomes …Crop Season, Contract, Tobacco… in both the header and the cells. |
| 14 | View button next to Edit in rules list | Missing | Add an eye icon that opens the editor in read-only mode (new `readOnly` flag on the editor view). |
| 15 | Remove Reference column | Missing | Remove the "Ref" header and cell, and adjust the group-header `colSpan`. |
| 16 | When to Rule Name | Missing | Change the header text. |
| 17 | Remove Parameter tested | Missing | Remove the header and cell. |
| 18 | Status (Active/Inactive) | Missing | `RuleRow.active` already exists (it is set in the editor). Show it as an Active/Inactive pill column. |
| 19 | Effect to Action | Missing | Rename the list header and the editor field label (l.1355). |

## Open points
- #12: confirm which column is meant.
- #2: confirm the matrix should become editable (a Save button implies it).

## Verification
Click through each screen in the preview, then run the toggle double-confirm flow on both paths (No/Cancel and Confirm).
