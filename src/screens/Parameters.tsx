import { useState } from "react"
import { Card, Button } from "../components/ui"
import { Plus, Check, X } from "../components/icons"

/* ------------------------------------------------------------------ */
/* Tabs                                                                 */
/* ------------------------------------------------------------------ */

export type ParamTabKey =
  | "flags"
  | "indebtedness"
  | "dispute"
  | "debt"
  | "credit"
  | "funrural"

export const TABS: { key: ParamTabKey; label: string }[] = [
  { key: "flags", label: "Farmer Flags" },
  { key: "indebtedness", label: "Indebtedness" },
  { key: "dispute", label: "Filler / Commercial Dispute" },
  { key: "debt", label: "Debt & Cluster" },
  { key: "credit", label: "Credit Hold & Utilization" },
  { key: "funrural", label: "Funrural" },
]

/* ------------------------------------------------------------------ */
/* Table model                                                         */
/* ------------------------------------------------------------------ */

export type Row = {
  id: string
  cells: string[]
  active: boolean
  /* When true the Active column shows a static label instead of a toggle. */
  readOnly?: boolean
}

type Tab = {
  key: ParamTabKey
  subtitle: string
  /* Column headers; the final "Active" column is appended automatically. */
  columns: string[]
  rows: Row[]
}

export const COLUMNS = ["Parameter", "Applies to", "Condition", "Action", "Free payment"]

export const TAB_DATA: Record<ParamTabKey, Tab> = {
  flags: {
    key: "flags",
    subtitle: "Farmer flags read before the policy — each can re-route the run (Agri360 step 2).",
    columns: COLUMNS,
    rows: [
      { id: "deviation", active: true, cells: ["Deviation", "Farmer", "Farmer flagged as deviator", "Policy ignored — debt + retention only", "Blocked"] },
      { id: "risk", active: true, cells: ["Exception (Risk Level)", "Farmer", "Elevated risk classification", "Free-payment ceiling restricted", "Blocked"] },
      { id: "deceased", active: true, cells: ["Deceased", "Farmer", "Farmer deceased", "Credit held for estate", "Blocked"] },
    ],
  },
  indebtedness: {
    key: "indebtedness",
    subtitle: "Indebtedness ratio and the threshold that governs the policy route (Agri360 step 12).",
    columns: COLUMNS,
    rows: [
      { id: "ratio", active: true, cells: ["Indebtedness ratio", "Farmer", "Current debt ÷ estimated revenue × 100 ≥ 40%", "Block free payment until debt settled", "Blocked"] },
      { id: "revenue", active: true, readOnly: true, cells: ["Revenue basis", "Farmer", "C_CALC_ENDVTO (estimate × avg price)", "Denominator of the ratio", "—"] },
      { id: "recalc", active: true, cells: ["Final recalculation", "Farmer", "Remaining debt ÷ revenue after payments", "Update ending indebtedness", "—"] },
    ],
  },
  dispute: {
    key: "dispute",
    subtitle: "Flags that override the FT payment policy (Agri360 step 16).",
    columns: COLUMNS,
    rows: [
      { id: "filler", active: true, cells: ["Filler (“Recheio”)", "Farmer", "Flagged as filler", "Disregard FT policy; amortize debt + withholdings", "Remaining balance only"] },
      { id: "commercial", active: true, cells: ["Commercial Dispute", "Farmer", "Open commercial disagreement", "Same override as filler", "Remaining balance only"] },
    ],
  },
  debt: {
    key: "debt",
    subtitle: "Debt pool and linked-cluster configuration (Agri360 steps 22, 24).",
    columns: COLUMNS,
    rows: [
      { id: "linked", active: true, cells: ["Linked crops (ref 22)", "Cluster", "Crops linked to farmer / cluster", "Include in debt pool", "—"] },
      { id: "future", active: true, cells: ["Cluster future debt (ref 24)", "Cluster", "Anticipation securities present", "Retain for future debt", "—"] },
      { id: "bureau", active: true, cells: ["Credit bureau (ref 25)", "Farmer", "Negative at credit bureau", "Block release", "Blocked"] },
    ],
  },
  credit: {
    key: "credit",
    subtitle: "Rules that hold a credit or track its utilization (Agri360 steps 39, 63).",
    columns: COLUMNS,
    rows: [
      { id: "held", active: true, cells: ["Credit held (ref 39)", "Credit", "Credit flagged to remain held", "Hold credit", "Held"] },
      { id: "utilization", active: true, cells: ["Credit utilization (ref 63)", "Credit", "After appropriation", "Mark credit used / partially used", "—"] },
      { id: "deceased", active: true, cells: ["Deceased override (ref 64)", "Farmer", "Farmer deceased", "Hold free payment", "Held"] },
      { id: "minimum", active: true, readOnly: true, cells: ["Minimum free payment", "Credit", "Below configured minimum", "Hold as pending until later credits reach it", "Held"] },
    ],
  },
  funrural: {
    key: "funrural",
    subtitle: "Gilrat, Senar and INSS on invoice credits — Buying trigger only (Agri360 steps 44, 45, 46).",
    columns: COLUMNS,
    rows: [
      { id: "balance", active: true, cells: ["Funrural balance (ref 44)", "Buying only", "Gilrat / Senar / INSS rate table", "Take amount from rate table", "—"] },
      { id: "launch", active: true, cells: ["Launch exists (ref 45)", "Buying only", "Posting already exists", "Skip if already launched", "—"] },
      { id: "title", active: true, cells: ["Create title (ref 46)", "Buying only", "No existing launch", "Create receivable title + posting", "—"] },
    ],
  },
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-[44px] shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-brand" : "bg-[#c4cfe4]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-all duration-200 ${checked ? "left-[21px]" : "left-0.5"}`} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function Parameters({ initialTab }: { initialTab?: ParamTabKey } = {}) {
  const [tab, setTab] = useState<ParamTabKey>(initialTab ?? "flags")
  const [state, setState] = useState<Record<string, boolean>>(() => {
    const seed: Record<string, boolean> = {}
    for (const t of Object.values(TAB_DATA)) for (const r of t.rows) seed[`${t.key}:${r.id}`] = r.active
    return seed
  })

  /* Parameters added by the user, per tab; a non-null draft renders as an inline editable row. */
  const [added, setAdded] = useState<Record<string, Row[]>>({})
  const [draft, setDraft] = useState<string[] | null>(null)

  const active = TAB_DATA[tab]
  const rows = [...active.rows, ...(added[tab] ?? [])]
  const startNew = () => setDraft(active.columns.map(() => ""))
  const saveDraft = () => {
    if (!draft || !draft[0].trim()) return
    const id = `new-${Date.now()}`
    setAdded((cur) => ({ ...cur, [tab]: [...(cur[tab] ?? []), { id, active: true, cells: draft.map((c) => c.trim() || "—") }] }))
    setState((cur) => ({ ...cur, [`${tab}:${id}`]: true }))
    setDraft(null)
  }
  const toggle = (rowId: string) => setState((cur) => ({ ...cur, [`${tab}:${rowId}`]: !cur[`${tab}:${rowId}`] }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[19px] font-800 text-ink">Parameters</h1>
        <p className="mt-0.5 text-[13px] text-muted">Configure the claim parameters that the payment analysis engine reads at run time.</p>
      </div>

      {/* Tab strip */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex items-center gap-1">
          {TABS.map((t) => {
            const on = t.key === tab
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setDraft(null) }}
                className={`shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-700 transition ${
                  on ? "bg-brand text-white shadow-sm" : "text-ink-soft hover:bg-brand-soft hover:text-brand"
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-[13px] text-muted">{active.subtitle}</p>
          <Button size="sm" onClick={startNew} disabled={draft !== null} className="shrink-0">
            <Plus size={15} /> New parameter
          </Button>
        </div>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand">
              <tr>
                {active.columns.map((c, i) => (
                  <th key={c} className={`${i === 0 ? "px-5" : "px-4"} py-3.5`}>{c}</th>
                ))}
                <th className="px-4 py-3.5 text-right">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const on = state[`${tab}:${r.id}`]
                return (
                  <tr key={r.id} className="border-t border-line align-top">
                    {r.cells.map((cell, i) => (
                      <td key={i} className={`${i === 0 ? "px-5 font-700 text-ink" : "px-4 text-ink-soft"} py-3.5`}>{cell}</td>
                    ))}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {r.readOnly ? (
                          <span className="text-[12px] font-600 text-muted">Read-only</span>
                        ) : (
                          <>
                            <span className={`text-[12px] font-700 ${on ? "text-[#1f7a46]" : "text-muted"}`}>{on ? "On" : "Off"}</span>
                            <Toggle checked={on} onChange={() => toggle(r.id)} label={r.cells[0]} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {draft && (
                <tr className="border-t border-line bg-brand-soft/40 align-top">
                  {draft.map((v, i) => (
                    <td key={i} className={`${i === 0 ? "pl-5 pr-2" : "px-2"} py-2.5`}>
                      <input
                        autoFocus={i === 0}
                        value={v}
                        onChange={(e) => setDraft((d) => d && d.map((x, j) => (j === i ? e.target.value : x)))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveDraft()
                          if (e.key === "Escape") setDraft(null)
                        }}
                        placeholder={active.columns[i]}
                        className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[13px] text-ink outline-none placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand-soft"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={saveDraft}
                        disabled={!draft[0].trim()}
                        title="Save parameter"
                        className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white transition hover:bg-brand-dark disabled:opacity-40"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setDraft(null)}
                        title="Cancel"
                        className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white text-muted transition hover:text-ink"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

export default Parameters
