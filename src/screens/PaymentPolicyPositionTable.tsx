import { useState } from "react"
import { Check } from "../components/icons"
import { Button, Field, Select } from "../components/ui"

export type PositionTablePolicy = { code: number; name: string; positionTable: string }
type PositionTableTab = "percentage" | "minimum"
type Entry = { id: string; validFrom: string; node: string; tobacco: string; position: string; color: string; quality: string; paid: string; volume: string; minimum: string }

const ENTRIES: Entry[] = [
  { id: "p1", validFrom: "2026-09-01", node: "GT 502", tobacco: "Virginia", position: "", color: "", quality: "", paid: "100.00", volume: "100.00", minimum: "800.00" },
  { id: "p2", validFrom: "2026-09-01", node: "GT 105", tobacco: "Virginia", position: "X", color: "", quality: "", paid: "100.00", volume: "100.00", minimum: "" },
  { id: "p3", validFrom: "2026-09-01", node: "GT 105", tobacco: "Virginia", position: "C", color: "", quality: "", paid: "80.00", volume: "100.00", minimum: "" },
]

export function PaymentPolicyPositionTable({ policy, onSave }: { policy: PositionTablePolicy; onSave: (positionTable: string) => void }) {
  const [tab, setTab] = useState<PositionTableTab>("percentage")
  const [tobacco, setTobacco] = useState("Virginia")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [node, setNode] = useState("All")
  const metrics = tab === "percentage" ? (["paid", "volume"] as const) : (["minimum"] as const)

  const toggleEntry = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  return <div className="space-y-5">
    <div className="border-b border-line">
      <div className="flex gap-6">
        <button type="button" onClick={() => setTab("percentage")} className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${tab === "percentage" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>By % Value</button>
        <button type="button" onClick={() => setTab("minimum")} className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${tab === "minimum" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>Min. 1st Delivery</button>
      </div>
    </div>
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
      <div className="grid min-w-[620px] grid-cols-4 gap-3">
        <Field label="Crop year"><Select value="2026/27" onChange={() => {}} options={[{ value: "2026/27", label: "2026/27" }]} /></Field>
        <Field label="Policy"><Select value={String(policy.code)} onChange={() => {}} options={[{ value: String(policy.code), label: `${policy.code} ${policy.name}` }]} /></Field>
        <Field label="Tobacco type"><Select value={tobacco} onChange={setTobacco} options={[{ value: "Virginia", label: "Virginia" }, { value: "Burley", label: "Burley" }]} /></Field>
        <Field label="Node"><Select value={node} onChange={setNode} options={[{ value: "All", label: "All" }, { value: "GT 502", label: "GT 502" }, { value: "GT 105", label: "GT 105" }, { value: "GT 102", label: "GT 102" }]} /></Field>
      </div>
      <Button disabled={!selectedIds.length} onClick={() => onSave(`${selectedIds.length} ${selectedIds.length === 1 ? "entry" : "entries"}`)}><Check size={16} /> Assign Selected</Button>
    </div>
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-[13px]"><thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand"><tr><th className="w-[54px] px-4 py-3">Select</th><th className="px-4 py-3">Valid from</th><th className="px-4 py-3">Node</th><th className="px-4 py-3">Tobacco type</th><th className="px-4 py-3">Position</th><th className="px-4 py-3">Color</th><th className="px-4 py-3">Quality</th>{metrics.map((metric) => <th key={metric} className="px-4 py-3">{metric === "paid" ? "% paid free" : metric === "volume" ? "% max volume" : "Min 1st delivery"}</th>)}</tr></thead><tbody>{ENTRIES.map((row) => <tr key={row.id} className={`border-t border-line transition ${selectedIds.includes(row.id) ? "bg-brand-soft/40" : "hover:bg-canvas/60"}`}><td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleEntry(row.id)} className="h-4 w-4 rounded accent-[#004f9e]" aria-label={`Select ${row.node} ${row.position || "all positions"}`} /></td><td className="px-4 py-3 tabular-nums text-ink-soft">{row.validFrom}</td><td className="px-4 py-3 font-600 text-ink">{row.node}</td><td className="px-4 py-3 text-ink-soft">{row.tobacco}</td><td className="px-4 py-3">{row.position || "—"}</td><td className="px-4 py-3">{row.color || "—"}</td><td className="px-4 py-3">{row.quality || "—"}</td>{metrics.map((metric) => <td key={metric} className="px-4 py-3 tabular-nums text-ink">{row[metric] || "—"}</td>)}</tr>)}</tbody></table></div></div>
  </div>
}
