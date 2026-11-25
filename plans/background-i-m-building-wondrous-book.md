# Combine Debt Transfer selection + setup into one screen

## Context

Today the Debt Transfer flow is split into two sequential screens:

1. **Step 1 — selection** (`DebtTransferDetail`): pick origin debt lines + choose the
   destination farmer/contract, with a live "Now / After the transfer" recap.
2. **Step 2 — setup** (`DebtTransferSetup`): choose the destination debt (Debt / Debt
   group / Debt type), group-or-split, edit destination due dates, and a **Confirm**
   button that opens the "Confirm transfer" modal (goes to *Pending documents* + a
   required justification).

The user's screenshot (`image-94.png`) shows these two steps merged into a **single
two-panel screen**: left = amber **Origin farmer debt** (selection table + a "selected
lines" detail table), right = green **Destination farmer** (Farmer/Contract selectors +
Now/After recap + the destination detail table with editable due dates), and a full-width
bottom bar with **Debt / Debt group / Debt type** selectors and the **Group into a single
debt / Split into installments** controls. The single **Transfer** button (top-right) now
opens the existing confirm popup.

The same merge must be applied to the **"Requests made by the FT"** view screen and the
**Reports** view screen. All existing functionality (validations, recap math, group/split,
editable due dates, tooltips, the confirm modal + toast, cancel navigation) stays
identical — this is a layout change only. The **Debt Transfer FT Requests → New request**
screen (`DebtTransferFTRequest.tsx`) is also re-laid-out to the same combined two-panel
shape, but its functionality is kept exactly as-is.

## Approach

Merge each two-step flow into its existing "detail" screen and retire the separate
"setup" screen route. Reuse all current state, math helpers, and the confirm `Modal`
verbatim — just relocate them into the detail component and re-lay-out the JSX to match
the screenshot.

### 1. Debt Transfer "Transfer" tab — `src/screens/DebtTransferDetail.tsx`

Turn this into the single combined screen. Change its props from
`{ value, onBack, onProceed }` to `{ value, onBack, onDone }`.

- **Keep** existing state: `selectedLines`, `transferAmounts`, `destFarmer`, `destContract`,
  `transferTotal`, `destination`, `afterIndebtedness`, `readyToSetUp`, `toggleLine`.
- **Move in from `DebtTransferSetup.tsx`**: `destDebt`, `group`, `split`, `installments`,
  `dueOverrides`, `confirmOpen`, `justification` state; the `DEST_DEBTS` catalogue; the
  `setMode`, `baseRows` (useMemo), `caption`, and `confirm()` logic (toast + `onDone`); and
  the `Modal` block (DebtTransferSetup.tsx:153-170). The "selected lines" feeding
  `baseRows`/`total` come from the live selection (`lines.filter(selectedLines) `+ their
  `transferAmounts`) instead of the passed-in `value.lines`.
- **Layout (match screenshot):**
  - Header card: title `{code} · {farmer} · contract {contract}`, right-aligned
    **Cancel** (`onBack`) + **Transfer** (`disabled={!readyToSetUp}`, opens
    `setConfirmOpen(true)`).
  - Two-column grid `lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`:
    - **Left panel (amber):** existing origin selection table (Select / Debt type / Debt /
      Inst. / Due date / Overdue / Balance / To transfer) on top; **below it** an amber
      sub-header `{code} · {farmer} · contract {contract}` and the "selected lines" detail
      table (Debt / Inst. / Due date / Value) — the current
      `DebtTransferSetup` "Selected on origin" table.
    - **Right panel (green):** Farmer + Contract Id selectors and the Now/After recap on
      top; **below it** a green sub-header `{destCode} · {destFarmer} · contract {contract}`
      and the destination detail table (Debt / Inst. / Due date [editable Input] / Value) —
      the current `DebtTransferSetup` "Lands on dest" table driven by `baseRows`.
  - **Bottom full-width bar:** Debt `Select` (+ Info tooltip), disabled Debt group / Debt
    type `Input`s, and the `Group into a single debt` / `Split into [n] installments`
    `Checkbox`es (reuse DebtTransferSetup.tsx:91-115 markup).
  - Confirm `Modal` at the end (unchanged).
- Reuse the shared `money`, `lineTypeTone`, `Modal`, `Checkbox`, `Field`, `Input`,
  `Select`, `useToast` already imported by the two source files.

### 2. "Requests made by the FT" view — `src/screens/DebtRequestDetail.tsx`

Same merge, absorbing `DebtRequestTransferSetup.tsx`. Props change from
`{ value, onBack, onSetUp }` to `{ value, onBack, onDone }`.

- Keep the reject/**Cancel** button (`variant="danger"`, disabled when `readOnly`) and turn
  **Transfer** into the confirm-modal trigger (disabled when `readOnly`).
- Left amber panel: the requested-debts table (read-only, from `value.lines`) + the
  "Selected on origin" detail table. Right green panel: destination farmer info
  (`destCode`/`destFarmer` are fixed on the request — show as static labels, no selectors) +
  the "Lands on dest" table with editable due dates. Bottom bar: Debt / Debt group / Debt
  type + Finance note + Group/Split (from `DebtRequestTransferSetup.tsx:106-170`).
- Move in the `Modal`, `confirm()` (toast + `onDone`), `group`/`split`/`installments`/
  `dueOverrides`/`confirmOpen`/`financeNote` state, `destinationRows`/`displayedDestinationRows`,
  and the `DebtTable` helper.

### 3. Reports view — `src/screens/DebtTransferReportDetail.tsx`

Read-only, no buttons/popup. Re-lay-out `TransferTables` into the same two-panel shape:
left amber **Origin farmer** card, right green **Destination farmer** card (selectors shown
as static read-only rows), with the Before/After recap in the right panel — reusing the
existing `ReportTable` helper and its `origin`/`destination` tone colors. Leave the
`Carry over` (`CarryTable`) branch as-is.

### 4. `src/App.tsx` routing

- `debttransferdetail`: replace `onProceed`→`go("debttransfersetup")` with
  `onDone={() => go("debttransfer")}` (App.tsx:367-376).
- `debtrequestdetail`: replace `onSetUp`→`go("debtrequestsetup")` with
  `onDone={() => go("debttransfer")}` (App.tsx:384-390).
- Remove the now-unreachable `debttransfersetup` (377-383) and `debtrequestsetup`
  (391-397) render blocks, their imports, and the `debttransfersetup`/`debtrequestsetup`
  entries in the `Screen` union (App.tsx:53) and `CRUMBS` (App.tsx:59-206). Delete
  `DebtTransferSetup.tsx` and `DebtRequestTransferSetup.tsx` once unreferenced.
- Verify the `debttransferdetail` breadcrumb reads `Home › Finance › Debt Transfer ›
  Transfer` per the screenshot; adjust its `CRUMBS` entry if needed.

### 5. Debt Transfer FT Requests → New request — `src/screens/DebtTransferFTRequest.tsx`

Re-lay-out to the same combined two-panel shape, **keeping functionality identical**
(no confirm modal — it stays gated by the `ready` flag and the **Request** button still
calls `request()` → `onCreated` + toast + `onBack`; App wiring at App.tsx:365 is unchanged).

- Keep all state and logic: `farmerId`, `contract`, `selected`, `amounts`, `destFarmer`,
  `destContract`, `justification`, `origin`, `lines`, `destination`, `total`,
  `afterIndebtedness`, `ready`, `selectLine`, `request`.
- Move the header (Farmer/Contract + Cancel/Request buttons) and the comment/justification
  field into the top, then arrange the currently-stacked panels side by side in a
  `lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]` grid: **left amber** "Origin farmer debts"
  selection table (with the empty-state row preserved), **right green** "Destination farmer"
  panel with the Farmer/Contract selectors and the Now/After-the-request recap.
- This screen has no destination detail table / group-split / confirm popup, so those parts
  of the shared layout are simply omitted — matching its existing feature set.

## Verification

- Vite dev server is already running; open the preview.
- **Transfer tab:** eye a row → confirm the combined layout renders, select origin lines +
  a destination farmer/contract, watch the Now/After recap and the destination detail table
  update, toggle Group/Split, edit a destination due date, click **Transfer** → the confirm
  modal appears with "Pending documents" + required justification → confirm → success toast
  → returns to the Transfer tab. **Cancel** returns without a toast.
- **Requests made by the FT tab:** eye a "Waiting" request → same combined layout, Transfer
  opens the modal → confirm returns to the list; a non-"Waiting" request stays read-only.
- **Reports tab:** view a Transfer report → two-panel amber/origin + green/destination
  layout; Carry-over report still renders its table.
- **FT Requests → New request:** the two-panel amber/green layout renders; select
  farmer/contract + origin lines and a destination, watch the recap update, and confirm
  **Request** still creates the request (toast + returns to the list) with the same `ready`
  gating — functionality unchanged.
- Sanity typecheck/build only if the edits touch the `Screen` union or imports.
