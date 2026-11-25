import { useState, type ReactNode } from "react"
import { Card, Select } from "../components/ui"

/* Developer reference for the eleven THEN-box actions of a Payment Analysis rule.
   Source: "What a rule can do when it fires" + Payment Analysis Functional Specification v0.1. */

type Effect = "Yes" | "No" | "Held" | "Ignored" | "Reversed"
type SpecRef = { block: string; title: string; excerpt: string }
type RuleAction = {
  key: string
  name: string
  group: string
  color: string
  soft: string
  happens: string
  fill: string
  usedIn: string
  run: "Continues" | "Jumps" | "Ends"
  effects: { credit: Effect; debt: Effect; retention: Effect; freePayment: Effect }
  trace: string
  refs: SpecRef[]
}

const GROUPS = ["Taking from the credit, or not", "Sending the run somewhere else", "Overriding the policy or the payment", "Undoing a posting"]

const ACTIONS: RuleAction[] = [
  {
    key: "take", name: "Take a value", group: GROUPS[0], color: "#1f7a46", soft: "#edf8f0",
    happens: "This claim takes an amount out of the credit. What is left carries on to the next claim.",
    fill: "How much — a share from a parameter, a fixed amount, everything that is left, or the lower of two amounts. Never a typed formula.",
    usedIn: "Funrural takes the rate-table amount (ref 44). Debt takes the lower of the debt and what is left.",
    run: "Continues", effects: { credit: "Yes", debt: "Yes", retention: "Yes", freePayment: "No" },
    trace: "Claim, amount source, amount taken and credit balance after.",
    refs: [
      { block: "44", title: "Funrural amount", excerpt: "Funrural components and rates are read from their owning screen and applied to the credit." },
      { block: "—", title: "Debt amortization", excerpt: "The engine reads the open debt immediately before amortizing and settles in the priority order held by the debt register." },
    ],
  },
  {
    key: "skip", name: "Skip this claim", group: GROUPS[0], color: "#5b6478", soft: "#f1f3f7",
    happens: "Takes nothing this time. The credit is untouched and the run carries on to the next claim.",
    fill: "Nothing.",
    usedIn: "Funrural finds the posting was already made when the invoice was issued (ref 45).",
    run: "Continues", effects: { credit: "No", debt: "No", retention: "No", freePayment: "No" },
    trace: "Claim evaluated, condition that caused the skip.",
    refs: [{ block: "45", title: "Funrural already posted", excerpt: "The posting is normally created when the invoice is issued, so the engine checks for an existing posting first and never posts twice for the same invoice." }],
  },
  {
    key: "protect", name: "Protect an amount", group: GROUPS[0], color: "#1d7a80", soft: "#e8f6f6",
    happens: "Sets an amount aside that debt, retention and the policy limit may not touch. It is paid to the farmer whatever the debt is.",
    fill: "How much — the same four ways as Take a value.",
    usedIn: "A negotiated Policy 7 amount — the field technician agreed it before the delivery.",
    run: "Continues", effects: { credit: "Yes", debt: "No", retention: "No", freePayment: "Yes" },
    trace: "Protected amount, its source and the approval reference.",
    refs: [{ block: "—", title: "PL7 free amount", excerpt: "The requested amount is capped by the revenue on the row and the cumulative remaining Free Payment Limit." }],
  },
  {
    key: "hold", name: "Hold the credit", group: GROUPS[0], color: "#6b4fb8", soft: "#f2eefb",
    happens: "Takes nothing and does not close the credit. It waits, and a later run can still use it. Nothing is lost.",
    fill: "Nothing.",
    usedIn: "A credit marked to stay in the account (ref 39). A free payment below the minimum, kept for the next run.",
    run: "Continues", effects: { credit: "Held", debt: "No", retention: "No", freePayment: "Held" },
    trace: "Reason the credit was held and the amount left open.",
    refs: [{ block: "39", title: "Credit retained in account", excerpt: "Which credits remain retained in account is configured on its owning screen; the credit stays open for a later run." }],
  },
  {
    key: "jump", name: "Jump to a claim", group: GROUPS[1], color: "#c0352b", soft: "#fdeeec",
    happens: "The run goes straight to the claim you name. The claims in between do not run, and the trace records each one as skipped, with this rule as the reason.",
    fill: "Which claim. Required — a jump with no target cannot be published.",
    usedIn: "Deviator, Exception, Recheio or Commercial disagreement jump from the profile flags straight to Debt (refs 2, 16).",
    run: "Jumps", effects: { credit: "No", debt: "Yes", retention: "Yes", freePayment: "No" },
    trace: "Target claim plus every skipped claim, each citing this rule.",
    refs: [
      { block: "2", title: "Deviator and risk level", excerpt: "When one of these flags is set the engine ignores the payment policy for the run: it goes to debt amortization and retention still runs." },
      { block: "16", title: "Recheio and commercial disagreement", excerpt: "Buying flags read before the policy is applied; the flag is recorded as the reason." },
    ],
  },
  {
    key: "stop", name: "Stop the run", group: GROUPS[1], color: "#c0352b", soft: "#fdeeec",
    happens: "The analysis ends here. Nothing is posted, the credit stays exactly as it was, and the reason is written to the trace.",
    fill: "The reason.",
    usedIn: "A hard failure — the farmer record or the crop cannot be read.",
    run: "Ends", effects: { credit: "No", debt: "No", retention: "No", freePayment: "No" },
    trace: "Stage and reason; no postings.",
    refs: [{ block: "—", title: "Commit as one transaction", excerpt: "On any error nothing is committed and the failure is recorded with the block and the reason, so a failed run leaves no partial allocation behind." }],
  },
  {
    key: "block", name: "Block the payment", group: GROUPS[2], color: "#c0352b", soft: "#fdeeec",
    happens: "The policy still applies and debt and retention run as normal — but the free payment at the end is not generated. The amount stays on the credit, retained, never lost.",
    fill: "Nothing — the amount is kept automatically.",
    usedIn: "A deceased farmer — the rule sits in Free payment. No valid bank account.",
    run: "Continues", effects: { credit: "Held", debt: "Yes", retention: "Yes", freePayment: "Held" },
    trace: "Block reason, so the farmer can be told why.",
    refs: [{ block: "—", title: "Bank account check", excerpt: "An invalid account does not stop the run — debt recovery and retention complete and only the free payment is held, with the reason recorded." }],
  },
  {
    key: "cancel", name: "Cancel the policy", group: GROUPS[2], color: "#b88a12", soft: "#fdf6e3",
    happens: "The payment policy stops protecting anything. Debt recovers everything it can, retention still runs, and only what is left is paid. The farmer can still receive money — just less.",
    fill: "Nothing.",
    usedIn: "Indebtedness over the limit. A tobacco return.",
    run: "Continues", effects: { credit: "Yes", debt: "Yes", retention: "Yes", freePayment: "Yes" },
    trace: "Policy cancelled, with the triggering condition.",
    refs: [{ block: "—", title: "Policy ceiling", excerpt: "Estimate 100,000 with debt 40,000 gives net revenue of 60,000 and a 30% ceiling of 18,000 — cancelling the policy removes that ceiling's protection." }],
  },
  {
    key: "force", name: "Force the payment", group: GROUPS[2], color: "#6b4fb8", soft: "#f2eefb",
    happens: "The free payment is made in full. The policy and debt recovery are ignored for this credit.",
    fill: "Who approved it.",
    usedIn: "An operator releases a payment, with approval.",
    run: "Continues", effects: { credit: "Yes", debt: "Ignored", retention: "Ignored", freePayment: "Yes" },
    trace: "Approver, timestamp and amount released.",
    refs: [{ block: "—", title: "Audit record", excerpt: "The new system records every evaluated condition, including the conditions that were false." }],
  },
  {
    key: "flag", name: "Flag for a later claim", group: GROUPS[2], color: "#1f3a6b", soft: "#eaf0fa",
    happens: "No money moves. A mark is written on the credit that a later claim, or the next run, reads and acts on.",
    fill: "Which flag, and the value to write.",
    usedIn: "The Afubra forecast — carried into Policy reserve, where it is netted off the debt so the ceiling rises. The credit marked as used (ref 63). A credit-bureau negative widening what Debt recovers.",
    run: "Continues", effects: { credit: "No", debt: "No", retention: "No", freePayment: "No" },
    trace: "Flag name and value written.",
    refs: [
      { block: "63", title: "Update the utilisation indicator", excerpt: "Marks the credit as used so a later stage cannot reuse allocated value." },
      { block: "—", title: "Indemnity forecast", excerpt: "The forecast is not a payment; it only enlarges the calculation base. Whether it is considered is a switch on the profile." },
    ],
  },
  {
    key: "reverse", name: "Reverse a posting", group: GROUPS[3], color: "#5b6478", soft: "#f1f3f7",
    happens: "Undoes an amount already posted by posting the opposite entry. The original stays; the two cancel out. Never a negative amount.",
    fill: "Which posting.",
    usedIn: "A self-funding block reduced after it was already taken. An RP balance used for debt that must go back.",
    run: "Continues", effects: { credit: "Reversed", debt: "Reversed", retention: "Reversed", freePayment: "No" },
    trace: "Original posting reference and the opposite entry.",
    refs: [{ block: "—", title: "Posting table", excerpt: "A reversal is posted alongside the original as its opposite entry; nothing is deleted." }],
  },
]

const EFFECT_TEXT: Record<Effect, { tone: string; dot: string; label: string }> = {
  Yes: { tone: "text-[#1f7a46]", dot: "bg-[#1f7a46]", label: "Changes" },
  No: { tone: "text-muted", dot: "bg-[#c4cfe4]", label: "Untouched" },
  Held: { tone: "text-[#6b4fb8]", dot: "bg-[#6b4fb8]", label: "Held for later" },
  Ignored: { tone: "text-[#8a5a14]", dot: "bg-[#b88a12]", label: "Ignored" },
  Reversed: { tone: "text-[#1f3a6b]", dot: "bg-[#1f3a6b]", label: "Reversed" },
}
const RUN_TEXT = {
  Continues: "The run carries on to the next claim.",
  Jumps: "The run jumps ahead to the target claim.",
  Ends: "The run ends here. Nothing is committed.",
}

const sentences = (t: string) => t.split(/(?<=\.)\s+/).filter(Boolean)

function Step({ n, title, color, last, children }: { n: number; title: string; color: string; last?: boolean; children: ReactNode }) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && <span className="absolute left-[13px] top-8 bottom-0 w-px bg-line" />}
      <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-800 text-white" style={{ background: color }}>
        {n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13.5px] font-700 text-ink">{title}</p>
        <div className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{children}</div>
      </div>
    </li>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-800 uppercase tracking-[0.08em] text-muted">{children}</p>
}

export default function RuleActions() {
  const [key, setKey] = useState(ACTIONS[0].key)
  const a = ACTIONS.find((x) => x.key === key) ?? ACTIONS[0]
  const happens = sentences(a.happens)
  const examples = sentences(a.usedIn)
  const needsInput = !a.fill.startsWith("Nothing")

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div>
        <h1 className="text-[19px] font-800 text-ink">Rule Actions</h1>
        <p className="mt-0.5 text-[13px] text-muted">Developer reference — pick a THEN action to see exactly what the engine does when a rule fires with it.</p>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,360px)_1fr] md:items-end">
          <div>
            <p className="mb-1.5 text-[12.5px] font-500 text-muted">THEN action</p>
            <Select searchable value={key} onChange={(v) => v && setKey(v)} options={ACTIONS.map((x) => ({ value: x.key, label: x.name }))} />
          </div>
          <p className="text-[13px] text-muted md:pb-2.5">
            Category: <span className="font-700 text-ink">{a.group}</span>
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Execution flow */}
        <Card className="p-6">
          <div className="mb-6 flex items-start gap-3">
            <span className="mt-1 h-10 w-1 rounded-full" style={{ background: a.color }} />
            <div>
              <p className="text-[12px] font-700" style={{ color: a.color }}>When the rule fires with</p>
              <h2 className="text-[22px] font-800 leading-tight text-ink">{a.name}</h2>
              <p className="mt-1 text-[13.5px] text-ink-soft">{happens[0]}</p>
            </div>
          </div>

          <ol>
            <Step n={1} title="The rule's IF condition evaluates to true" color={a.color}>
              The engine reaches this claim, evaluates every condition (true and false are both audited) and picks this action.
            </Step>
            <Step n={2} title="The engine performs the action" color={a.color}>
              <ul className="space-y-1">
                {happens.map((s) => (
                  <li key={s} className="flex gap-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />{s}</li>
                ))}
              </ul>
            </Step>
            <Step n={3} title="Effect on the money" color={a.color}>
              <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                {([["Credit", a.effects.credit], ["Debt", a.effects.debt], ["Retention", a.effects.retention], ["Free payment", a.effects.freePayment]] as const).map(([l, e]) => (
                  <div key={l}>
                    <p className="text-[12px] text-muted">{l}</p>
                    <p className={`flex items-center gap-1.5 text-[13px] font-700 ${EFFECT_TEXT[e].tone}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${EFFECT_TEXT[e].dot}`} />
                      {EFFECT_TEXT[e].label}
                    </p>
                  </div>
                ))}
              </div>
            </Step>
            <Step n={4} title={`Run ${a.run.toLowerCase()}`} color={a.color}>
              {RUN_TEXT[a.run]}
            </Step>
            <Step n={5} title="Written to the audit trace" color={a.color} last>
              {a.trace}
            </Step>
          </ol>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          <Card className="p-5">
            <Label>Developer must configure</Label>
            <p className={`mt-2 text-[13.5px] leading-relaxed ${needsInput ? "font-600 text-ink" : "text-muted"}`}>{a.fill}</p>
            {needsInput && <p className="mt-2 text-[12px] text-muted">Required before the rule can be published.</p>}
          </Card>

          <Card className="p-5">
            <Label>Real examples</Label>
            <ul className="mt-2 space-y-2">
              {examples.map((s) => (
                <li key={s} className="text-[13px] leading-relaxed text-ink-soft">{s}</li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <Label>Spec references</Label>
            <ul className="mt-3 space-y-3">
              {a.refs.map((r) => (
                <li key={r.title}>
                  <p className="text-[13px] font-700 text-ink">
                    {r.block !== "—" && <span className="mr-1.5 text-brand">#{r.block}</span>}
                    {r.title}
                  </p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{r.excerpt}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <p className="border-t border-line pt-4 text-[12.5px] text-muted">
        <span className="font-700 text-ink-soft">Always true:</span> a held or blocked payment is retained, never lost. A reversal is never a negative amount — it is the opposite entry posted alongside the original.
      </p>
    </div>
  )
}
