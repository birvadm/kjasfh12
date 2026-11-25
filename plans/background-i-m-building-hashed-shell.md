# Payment Analysis Simulator — regroup Retention + General Analysis, and a real Applied-Rule simulation

## Context
Two pieces of the Payment Analysis simulator (`src/screens/PaymentSimulation.tsx`, `SimulationPage`) are confusing the user, per the latest Excel screenshot (attachment 55264977) and feedback:

1. **Retention (RP) and General Analysis overlap.** I previously added read-only mirror rows (`RuleValueRow`) for *Retention Rule*, *Indebtedness > 40%* and *Has Retention Block* into the General Analysis card, while their real controls still lived in the Retention/Debt cards. The result duplicates the same items in two cards and mixes value pills in among real toggles — "confusing and overlapping." The user wants the cards grouped to match the Excel blocks, clean and modern, with each control appearing once.
2. **Applied Rule must be a simulation, not logs.** My earlier change made the Applied Rule cell open the audit-log popup. The user explicitly rejected this: "you are showing just logs that is not what the requirement is." They want an actual per-row simulation for the applied rule.

The Excel groups assumptions as: **DEBT ASSUMPTIONS**, **PAYMENT POLICY ASSUMPTIONS**, **ESTIMATE RP ASSUMPTIONS**, **PSA RP ASSUMPTIONS**, **GENERAL ANALYSIS ASSUMPTIONS** (Retention Rule, Indebtedness > 40%, Linked Farmer Chain?, Rehandling Flag?, Deviation Flag?, Amortization Order, Has Retention Block, Include Afubra Forecast?), **DELIVERY SCHEDULE**.

All work is inside `SimulationPage` / `runEngine` in `src/screens/PaymentSimulation.tsx`. No `App.tsx` route or breadcrumb changes.

## Change 1 — Regroup the assumption cards to match the Excel, single source of truth
File: `src/screens/PaymentSimulation.tsx`, `SimulationPage` (cards at ~lines 849–947).

Keep the same 4-card grid but realign each card to an Excel block and stop duplicating controls:

- **Card 3 "Retention (RP)"** (lines 891–929): remove the `Retention Block` toggle (line 895–898) and keep only the Estimate-RP fields (Retention Start %, Retention Amount) / PSA-RP fields (Retention %, PSA + Freight, derived PSA Retention Amount). The Estimate-vs-PSA `Segmented` (line 894) stays here **or** moves to General Analysis — move it to General Analysis so the card only holds the amount inputs for the active basis. Update the subtitle to "Amounts for the selected retention rule."
- **Card 4 "General Analysis Assumptions"** (lines 931–946): this becomes the single home for the Excel General-Analysis rows, all rendered consistently:
  - **Retention Rule** — the `Segmented` (Estimate / PSA) moved here (drives which fields Card 3 shows). Rendered at the top with `FieldLabel`, same as Amortization Order.
  - **Amortization Order** — existing `Segmented` (keep).
  - **Has Retention Block** — a real `RuleToggle` bound to `a.retentionBlock` (`onChange={() => set("retentionBlock", !a.retentionBlock)}`), replacing the read-only `RuleValueRow`.
  - **Linked Farmer Chain / Rehandling Flag / Deviation Flag / Include Afubra Forecast** — existing `RuleToggle`s (keep).
  - **Indebtedness > 40%** — this is *derived* (`result.indebtednessOver40` from debt ÷ net revenue) and cannot be a genuine toggle, so it is **removed from the toggle list** (the source of the visual inconsistency the user flagged) and kept only as the derived `DerivedBox` in the Debt card (line 887) where it belongs. This removes the value-pill-among-toggles confusion.
- **Delete the now-unused `RuleValueRow` component** (~line 1099) and its remaining usages, since every General-Analysis row is now either a `Segmented` control or a `RuleToggle`.

Result: Retention Rule and Has Retention Block each appear exactly once (in General Analysis), Card 3 holds only the RP amount fields, and Indebtedness > 40% shows once as a derived box in the Debt card — matching the Excel grouping with no overlap.

## Change 2 — Applied Rule becomes an editable per-row simulation (replaces the logs drill-in)
File: `src/screens/PaymentSimulation.tsx`, `runEngine` (lines 276–351) and the delivery table (lines 984–1022).

Let the user override the applied rule per delivery and see the numbers recompute live — a true what-if simulation instead of the audit popup.

- **State:** add per-row override map in `SimulationPage`, e.g. `const [ruleOverride, setRuleOverride] = useState<Record<number, string>>({})`. Reset it in `reset()`.
- **Engine:** extend `Delivery`/`runEngine` to accept an optional forced rule per row. When a row has an override, the allocation branch is forced:
  - `Free payment` → skip debt settlement and RP retention for that row (`debtPayment = 0`, `rpRetention = 0`; free payment still capped as today).
  - `Debt settlement` → allocate non-free to debt first, no RP retention.
  - `Retention (RP)` → allocate the retention cap first (ignoring the `pastTrigger` gate for that row), then debt.
  - `Blocked by flag` → `freePayment = 0`, `debtPayment = 0`, `rpRetention = 0`.
  With no override, behavior is unchanged (auto-derived `appliedRule`). Downstream rows recompute because `debtBalance`/`cumFree` carry forward.
- **Table cell** (lines 1011–1019): replace the `<button>`-that-opens-audit with a compact inline `Select`/`Segmented` seeded from the row's current `appliedRule`, `onChange={(v) => setRuleOverride((m) => ({ ...m, [r.id]: v }))}`. Options: Free payment, Debt settlement, Retention (RP), Blocked by flag. Show a subtle "overridden" marker (e.g. a dot or muted "auto" vs "manual" hint) when a row differs from its auto value, plus a small "reset row" affordance to clear the override.
- **Keep the audit popup** reachable only via the existing header **"View full audit"** button (line 952). Remove `auditFocus`/`setAuditFocus` and the `initialSectionId` seeding that only existed to support the Applied-Rule drill-in (revert `AuditDialog` call at line 1050 to no `initialSectionId`, and drop the now-unused `initialSectionId` prop threading in `AuditTrace`/`AuditDialog` if nothing else uses it).

## Verification
Dev server is already running.
1. Simulator → confirm cards read Debt / Payment Policy / Retention (RP) / General Analysis; Retention Rule and Has Retention Block appear only in General Analysis (as a selector and a toggle); Indebtedness > 40% appears only as a derived box in the Debt card. No duplicated rows.
2. Toggle Has Retention Block and switch Retention Rule (Estimate/PSA) in General Analysis → Card 3's fields and the delivery numbers update.
3. In the delivery table, change a row's **Applied Rule** dropdown → that row's Debt Payment / RP Retention / Free Payment and all downstream Debt Balance / Cum. Free recompute live; clearing the override restores the auto result. Confirm this does NOT open the audit log.
4. "View full audit" header button still opens the audit dialog.
5. Confirm a clean build via `figma logs`.
