import { useState } from "react"
import { ChevronLeft } from "../components/icons"
import { Badge, Button, Card, Select } from "../components/ui"

export type CreditLogContext = {
  farmer: string; farmerId: string; contract: string; contractId: string; invoice: string; amount: number
  crop: string; tobacco: string; region: string; segment: string; date: string; load: string
}

type StepStatus = "Passed" | "Failed" | "Skipped"
type Step = { name: string; rule: string; group: string; inputs: string[]; validations: string; calculations: string; decisions: string; outputs: string; status: StepStatus }

const brl = (n: number) => `R$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const cropYear = (crop: string) => crop.slice(0, 4)

/** First steps of the tobacco buying credit run. The remaining rules are added once the client sends them. */
function buildSteps(c: CreditLogContext): Step[] {
  const year = cropYear(c.crop)
  return [
    {
      name: "Receive analysis inputs", rule: "PA_RULE_001", group: "Basic Check",
      inputs: [
        `Crop year: ${year}`, `Farmer ID: ${c.farmerId} (${c.farmer})`, `Genetic type: ${c.tobacco}`, `Contract: ${c.contract} (ID ${c.contractId})`,
        `Crop region: ${c.region}`, `Segment: ${c.segment}`, `Credit type: Purchase invoice (EN ${c.invoice})`,
        "Claims in run order: Afubra forecast ON, FUNRURAL ON, Policy reserve ON, Debt ON",
        `Trigger: purchase invoice ${c.invoice}, ${brl(c.amount)}, ${c.date}`,
      ],
      validations: "Crop year, farmer, genetic type, contract, region and segment are present",
      calculations: "None", decisions: "All inputs found. Continue Payment Analysis", outputs: "Go to next step", status: "Passed",
    },
    {
      name: "Deviation or deceased flag", rule: "PA_RULE_002", group: "Basic Check",
      inputs: ["Credit type: Purchase invoice", "Deviator flag for this credit type: ON", "Competitor losses (any crop year): 0", "Deceased: no"],
      validations: "The farmer has a competitor loss (Deviator flag ON) or a deceased justification",
      calculations: "None", decisions: "No deviation or deceased flag. Continue Payment Analysis", outputs: "Go to next step", status: "Passed",
    },
    {
      name: "Open the audit log", rule: "PA_RULE_003", group: "Log",
      inputs: ["Run: #1 of this credit", `Account credit: ${c.invoice}`, `Credit date: ${c.date}`],
      validations: "The audit log is opened before any decision",
      calculations: "None", decisions: "Audit opened. Continue Payment Analysis", outputs: "Audit log of run #1 of this credit opened", status: "Passed",
    },
    {
      name: "Clear the previous analysis", rule: "PA_RULE_004", group: "Log",
      inputs: ["Earlier runs of this credit: 0"],
      validations: "No balance, limit or indicator is carried over from an earlier run",
      calculations: "None", decisions: "Balances, limits and indicators start from zero; earlier runs are kept, not reused", outputs: "Run context initialised", status: "Passed",
    },
    {
      name: "Current crop season", rule: "PA_RULE_005", group: "Basic Check",
      inputs: [`Crop year: ${year}`],
      validations: "The contract crop season is the current crop season",
      calculations: "None", decisions: `Crop season ${c.crop} is current. Continue Payment Analysis`, outputs: "Go to next step", status: "Passed",
    },
  ]
}

const STATUS_TONE: Record<StepStatus, "green" | "red" | "neutral"> = { Passed: "green", Failed: "red", Skipped: "neutral" }
const th = "px-4 py-3 text-left whitespace-nowrap"
const td = "px-4 py-4 align-top"

export function TobaccoCreditLog({ ctx, onBack }: { ctx: CreditLogContext; onBack: () => void }) {
  const steps = buildSteps(ctx)
  const runs = [`#1 · ${ctx.date}, 10:46:11 · Completed`]
  const [run, setRun] = useState(runs[0])
  const failed = steps.some((s) => s.status === "Failed")

  const meta = [
    { label: "Trigger", value: `Purchase invoice ${ctx.invoice}` }, { label: "Credit", value: brl(ctx.amount) },
    { label: "Farmer", value: `${ctx.farmer} (${ctx.farmerId})` }, { label: "Crop year", value: cropYear(ctx.crop) },
    { label: "Tobacco", value: ctx.tobacco }, { label: "Contract", value: ctx.contract }, { label: "Region", value: ctx.region },
    { label: "Segment", value: ctx.segment }, { label: "Date", value: ctx.date },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[19px] font-800 text-ink">Simulation Audit Log</h1>
        <Button variant="outline" onClick={onBack}><ChevronLeft size={16} /> Back to {ctx.load}</Button>
      </div>

      <Card className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 lg:grid-cols-9">
        {meta.map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className="text-[10.5px] font-800 uppercase tracking-wide text-muted">{m.label}</dt>
            <dd className="mt-0.5 truncate text-[13.5px] font-700 text-ink" title={m.value}>{m.value}</dd>
          </div>
        ))}
      </Card>

      <Card className="flex h-[calc(100vh-330px)] min-h-[460px] flex-col overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[14.5px] font-800 text-ink">Step-by-Step Analysis</h2>
            <span className="tabular-nums text-[12px] font-600 text-muted">{steps.length} steps</span>
            <Badge tone={failed ? "red" : "green"}>{failed ? "Stopped" : "Completed"}</Badge>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-600 text-muted">Run</span>
            <Select value={run} onChange={setRun} options={runs.map((r) => ({ value: r, label: r }))} className="w-[300px]" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1200px] text-[13px]">
            <thead className="sticky top-0 z-10 bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
              <tr>
                <th className={`${th} w-[200px]`}>Step</th>
                <th className={`${th} w-[300px]`}>Inputs</th>
                <th className={th}>Validations</th>
                <th className={th}>Calculations</th>
                <th className={th}>Decisions</th>
                <th className={th}>Outputs</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={s.rule} className="border-t border-line transition hover:bg-canvas/60">
                  <td className={td}>
                    <p className="font-800 text-ink">Step {i + 1}</p>
                    <p className="mt-0.5 font-600 text-ink-soft">{s.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted">{s.rule} · {s.group}</p>
                  </td>
                  <td className={`${td} text-ink`}>{s.inputs.map((x) => <p key={x} className="leading-relaxed">{x}</p>)}</td>
                  <td className={`${td} leading-relaxed text-ink-soft`}>{s.validations}</td>
                  <td className={`${td} text-ink-soft`}>{s.calculations}</td>
                  <td className={`${td} leading-relaxed text-ink`}>{s.decisions}</td>
                  <td className={`${td} leading-relaxed text-ink-soft`}>{s.outputs}</td>
                  <td className={td}><Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
