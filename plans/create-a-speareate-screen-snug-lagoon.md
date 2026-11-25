# Rule Actions — align with the walkthrough transcript

## Context
In the walkthrough, Arun said:
- Only some THEN actions can be parameterised: "maybe 3, not all".
- **Flag for a later claim** and **Reverse a posting** (self-funding) must have their logic coded.
- The product has three screens:
  1. a 6×6 matrix that switches claims and flags on or off per credit type;
  2. a rule list built from that matrix;
  3. a rule add/edit screen, where the action is chosen once the rule is satisfied.
- Parameterisable actions get fields; the rest are coded.

## Gaps found in the current screen (`src/screens/RuleActions.tsx`)
1. **No parameterised-vs-coded distinction.** This is the main gap. Every action currently has a "Developer must configure" box, which implies all of them are configured by fields. Flag and Reverse look configurable ("Which flag and the value to write", "Which posting"), but the transcript says they need code.
2. **No link to the three-screen flow.** A developer can't see where an action sits: Matrix → Rule → THEN action.
3. **Runtime inputs are mixed with parameters.** Stop (reason) and Force (approver) are entered when the rule fires, not set up as rule parameters.
4. **Rule-level vs code-level work isn't separated.** For coded actions, the screen doesn't say what the developer has to write.

## Proposed classification (new `impl` field on each action)
| Type | Actions | Meaning |
|---|---|---|
| **Parameterised** (fields on rule edit) | Take a value, Protect an amount, Jump to a claim | Admin fills fields: amount source (4 options) or target claim |
| **Fixed switch** (no fields) | Skip, Hold, Block, Cancel the policy | Choosing the action is enough; behaviour is built into the engine |
| **Fixed + runtime input** | Stop the run (reason), Force the payment (approver) | No rule parameters; a value is captured when the rule fires |
| **Coded** | Flag for a later claim, Reverse a posting | The rule only names the flag or posting; the logic is written in code |

This matches the transcript's "3 parameterisable", and puts Flag and Reverse in Coded.

## Changes (RuleActions.tsx only)
- Add an `impl` field and, for each action, either:
  - `params`: the field list, e.g. Take → Amount source {Parameter %, Fixed amount, All remaining, Lower of two}, plus a value; or
  - `codeNotes`: what must be coded, e.g. Flag → what writes the flag, which later claim reads it, and how it changes that claim (Afubra forecast → Policy reserve ceiling; utilisation indicator ref 63; credit-bureau negative → Debt scope). Reverse → find the original posting, post the opposite entry, link both, and apply the self-funding / RP-back cases.
- Header: show a pill with the type (Parameterised / Fixed / Coded) beside the action name.
- Add a thin 3-step strip above the flow: Credit-type matrix → Rule (IF) → THEN action, with the current step highlighted.
- Replace the side card "Developer must configure" with one of:
  - **Fields on the rule edit screen** (for Parameterised): the field list;
  - **No configuration** (for Fixed), with the runtime input noted if there is one;
  - **Must be coded** (for Coded): the code notes, in an amber-tinted card.
- Keep the 5-step flow, the examples and the spec refs unchanged.

## Verification
- Check for no new errors in `RuleActions.tsx` with `npx tsc --noEmit`.
- Switch through all 11 actions and check that the type pill and side card match the table.
