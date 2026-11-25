import { useState } from "react"
import { Check, Pencil, Plus, X } from "../components/icons"
import { Button, Field, Input, Select, useToast } from "../components/ui"

type Rule = {
  id: number
  criterion: string
  table: string
  field: string
  operator: string
  comparisonTable: string
  comparisonField: string
  value: string
  result: string
  appliesTo: string
  status: "Active" | "Inactive"
}

function ParameterStatusToggle({ active, onChange }: { active: boolean; onChange: (active: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={active} onClick={() => onChange(!active)} className={`flex items-center gap-2 text-[12px] font-700 ${active ? "text-[#187247]" : "text-muted"}`}><span className={`relative h-5 w-9 rounded-full transition ${active ? "bg-[#187247]" : "bg-[#c7d2e6]"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${active ? "left-[18px]" : "left-0.5"}`} /></span>{active ? "Active" : "Inactive"}</button>
}

function StatusPill({ status }: { status: "Active" | "Inactive" }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-600 ${status === "Active" ? "bg-[#edf8f1] text-[#187247]" : "bg-canvas text-muted"}`}>{status}</span>
}

const initialRules: Rule[] = [
  {
    id: 1,
    criterion: "Destination farmer has no registration in the crop year",
    table: "Farmer contract", field: "Crop registration", operator: "Not equals", comparisonTable: "Transfer", comparisonField: "Crop year", value: "-",
    result: "Block",
    appliesTo: "Everyone", status: "Active",
  },
  {
    id: 2,
    criterion: "Destination farmer is inactive",
    table: "Farmer", field: "Status", operator: "Equals", comparisonTable: "", comparisonField: "", value: "-",
    result: "Block",
    appliesTo: "Everyone", status: "Active",
  },
  {
    id: 3,
    criterion: "Debt type is not transferable",
    table: "Debt", field: "Debt type", operator: "Not equals", comparisonTable: "Debt type", comparisonField: "Transferable", value: "-",
    result: "Greyed out",
    appliesTo: "Everyone", status: "Active",
  },
  {
    id: 4,
    criterion: "Transfer value above the available balance",
    table: "Debt installment", field: "Balance", operator: "Less than", comparisonTable: "Transfer", comparisonField: "Transfer value", value: "-",
    result: "Block",
    appliesTo: "Everyone", status: "Active",
  },
  {
    id: 5,
    criterion: "Debt is overdue",
    table: "Debt installment", field: "Overdue", operator: "Equals", comparisonTable: "", comparisonField: "", value: "-",
    result: "Not listed",
    appliesTo: "Field Technician", status: "Active",
  },
  {
    id: 6,
    criterion: "Indebtedness after the transfer",
    table: "Farmer", field: "Indebtedness", operator: "Greater than", comparisonTable: "Transfer", comparisonField: "After transfer", value: "40%",
    result: "Requires approval",
    appliesTo: "Everyone", status: "Active",
  },
  {
    id: 7,
    criterion: "Financed debt must be converted first",
    table: "Debt", field: "Financing status", operator: "Equals", comparisonTable: "", comparisonField: "", value: "-",
    result: "Block",
    appliesTo: "Everyone", status: "Active",
  },
  {
    id: 8,
    criterion: "Destination segment lower than origin segment",
    table: "Farmer", field: "Segment", operator: "Less than", comparisonTable: "Origin farmer", comparisonField: "Segment", value: "Not set",
    result: "To define",
    appliesTo: "Everyone", status: "Inactive",
  },
]

const emptyRule = (): Omit<Rule, "id"> => ({
  criterion: "",
  table: "Farmer", field: "", operator: "Equals", comparisonTable: "", comparisonField: "",
  value: "",
  result: "Block",
  appliesTo: "Everyone",
  status: "Active",
})

type ParametersTab = "risk" | "carryover"

export function DebtTransferParameters() {
  const [activeTab, setActiveTab] = useState<ParametersTab>("risk")

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-6 border-b border-line">
        <button
          type="button"
          onClick={() => setActiveTab("risk")}
          className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${activeTab === "risk" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
        >
          Risk assessment parameters
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("carryover")}
          className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${activeTab === "carryover" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
        >
          Carry over parameters
        </button>
      </div>

      {activeTab === "risk" ? <RiskAssessmentParameters /> : <CarryOverParameters />}
    </div>
  )
}

function RiskAssessmentParameters() {
  const toast = useToast()
  const [cropYear, setCropYear] = useState("2026/27")
  const [rules, setRules] = useState(initialRules)
  const [draft, setDraft] = useState<Omit<Rule, "id"> | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const save = () => {
    if (!draft?.criterion.trim()) return
    setRules((current) => editingId
      ? current.map((rule) => rule.id === editingId ? { ...draft, id: editingId } : rule)
      : [...current, { ...draft, id: current.length + 1 }])
    setDraft(null)
    setEditingId(null)
    toast({
      tone: "success",
      title: "Rule saved",
      body: "The debt transfer parameter has been added.",
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <Field label="Crop year" className="w-[170px]">
          <Select
            value={cropYear}
            onChange={setCropYear}
            options={["2025/26", "2026/27", "2027/28"].map((value) => ({
              value,
              label: value,
            }))}
          />
        </Field>
        {draft ? (
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={() => { setDraft(null); setEditingId(null) }}>
              <X size={16} /> Cancel
            </Button>
            <Button onClick={save} disabled={!draft.criterion.trim()}>
              <Check size={16} /> Save
            </Button>
          </div>
        ) : (
          <Button onClick={() => { setDraft(emptyRule()); setEditingId(null) }}>
            <Plus size={16} /> Add new
          </Button>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-[13px]">
            <thead className="bg-brand-soft text-[11px] font-700 uppercase tracking-wide text-brand">
              <tr>
                <th className="w-14 px-3 py-3">#</th><th className="min-w-[260px] px-3 py-3">Rule Name</th><th className="min-w-[130px] px-3 py-3">Table Selection</th><th className="min-w-[130px] px-3 py-3">Field Selection</th><th className="min-w-[120px] px-3 py-3">Condition operator</th><th className="min-w-[150px] px-3 py-3">Comparison Table Selection</th><th className="min-w-[130px] px-3 py-3">Field Selection</th><th className="w-24 px-3 py-3">Value</th><th className="min-w-[130px] px-3 py-3">Applies To Role</th><th className="min-w-[130px] px-3 py-3">Rule Action</th><th className="w-24 px-3 py-3">Status</th><th className="w-20 px-3 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className={`border-t border-line ${
                    rule.id === 5 || rule.id === 6
                      ? "bg-brand-soft/35"
                      : ""
                  }`}
                >
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{rule.id}</td><td className="px-3 py-2.5 text-ink">{rule.criterion}</td><td className="px-3 py-2.5 text-ink-soft">{rule.table}</td><td className="px-3 py-2.5 text-ink-soft">{rule.field}</td><td className="px-3 py-2.5 text-ink-soft">{rule.operator}</td><td className="px-3 py-2.5 text-ink-soft">{rule.comparisonTable || "—"}</td><td className="px-3 py-2.5 text-ink-soft">{rule.comparisonField || "—"}</td><td className="px-3 py-2.5">{rule.value}</td><td className="px-3 py-2.5">{rule.appliesTo}</td><td className="px-3 py-2.5 text-ink-soft">{rule.result}</td><td className="px-3 py-2.5"><StatusPill status={rule.status} /></td><td className="px-3 py-2.5 text-center"><button type="button" disabled={Boolean(draft)} onClick={() => { setDraft({ ...rule }); setEditingId(rule.id) }} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-35" aria-label={`Edit ${rule.criterion}`}><Pencil size={15} /></button></td>
                </tr>
              ))}
              {draft ? (
                <tr className="border-t border-brand bg-brand-soft/30">
                  <td className="px-3 py-2.5 font-700 tabular-nums text-brand">{editingId ?? rules.length + 1}</td>
                  <td className="px-2 py-1.5">
                    <Input
                      autoFocus
                      value={draft.criterion}
                      onChange={(event) =>
                        setDraft({ ...draft, criterion: event.target.value })
                      }
                      placeholder="Describe the criterion"
                      className="h-9"
                    />
                  </td>
                  <td className="px-2 py-1.5"><Select value={draft.table} onChange={(table) => setDraft({ ...draft, table })} options={["Farmer", "Farmer contract", "Debt", "Debt installment", "Transfer"].map((value) => ({ value, label: value }))} className="[&>button]:h-9" /></td><td className="px-2 py-1.5"><Select value={draft.field} onChange={(field) => setDraft({ ...draft, field })} options={["Status", "Balance", "Debt type", "Segment", "Indebtedness", "Crop registration"].map((value) => ({ value, label: value }))} className="[&>button]:h-9" /></td><td className="px-2 py-1.5"><Select value={draft.operator} onChange={(operator) => setDraft({ ...draft, operator })} options={["Equals", "Not equals", "Greater than", "Less than"].map((value) => ({ value, label: value }))} className="[&>button]:h-9" /></td><td className="px-2 py-1.5"><Select value={draft.comparisonTable} onChange={(comparisonTable) => setDraft({ ...draft, comparisonTable })} options={["", "Transfer", "Origin farmer", "Debt type"].map((value) => ({ value, label: value || "None" }))} className="[&>button]:h-9" /></td><td className="px-2 py-1.5"><Select value={draft.comparisonField} onChange={(comparisonField) => setDraft({ ...draft, comparisonField })} options={["", "Crop year", "Transfer value", "After transfer", "Segment", "Transferable"].map((value) => ({ value, label: value || "None" }))} className="[&>button]:h-9" /></td>
                  <td className="px-2 py-1.5">
                    <Input
                      value={draft.value}
                      onChange={(event) =>
                        setDraft({ ...draft, value: event.target.value })
                      }
                      placeholder="Value"
                      className="h-9"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Select
                      value={draft.appliesTo}
                      onChange={(appliesTo) => setDraft({ ...draft, appliesTo })}
                      options={[
                        "Everyone",
                        "Field Technician",
                        "Finance",
                      ].map((value) => ({ value, label: value }))}
                      className="[&>button]:h-9"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Select
                      value={draft.result}
                      onChange={(result) => setDraft({ ...draft, result })}
                      options={["Block", "Greyed out", "Not listed", "Requires approval"].map(
                        (value) => ({ value, label: value }),
                      )}
                      className="[&>button]:h-9"
                    />
                  </td>
                  <td className="px-2 py-1.5"><ParameterStatusToggle active={draft.status === "Active"} onChange={(active) => setDraft({ ...draft, status: active ? "Active" : "Inactive" })} /></td>
                  <td className="px-3 py-2.5 text-center text-muted">—</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

type CropParameter = {
  id: number
  node: string
  geneticType: string
  minimumBalance: string
  parameterDate: string
  status: "Active" | "Inactive"
}

const initialCropParameters: CropParameter[] = [
  { id: 1, node: "001 - Brazil", geneticType: "VA", minimumBalance: "R$ 500,00", parameterDate: "2027-08-31", status: "Active" },
  { id: 2, node: "001 - Brazil", geneticType: "BY", minimumBalance: "R$ 350,00", parameterDate: "2027-08-31", status: "Active" },
  { id: 3, node: "034 - Santa Cruz do Sul", geneticType: "DK", minimumBalance: "R$ 1.000,00", parameterDate: "2027-08-31", status: "Active" },
  { id: 4, node: "102 - Territory A", geneticType: "MD", minimumBalance: "R$ 5.600,00", parameterDate: "2027-09-30", status: "Active" },
  { id: 5, node: "001 - Brazil", geneticType: "CO", minimumBalance: "R$ 9.400,00", parameterDate: "2027-10-31", status: "Inactive" },
]

const GENETIC_TYPES = ["VA", "BY", "DK", "MD", "CO"]
const CROP_NODES = ["001 - Brazil", "034 - Santa Cruz do Sul", "102 - Territory A"]

const formatDate = (iso: string) => {
  if (!iso) return "—"
  const [year, month, day] = iso.split("-")
  return year && month && day ? `${day}/${month}/${year}` : iso
}

function CarryOverParameters() {
  const toast = useToast()
  const [nodeFilter, setNodeFilter] = useState("All")
  const [geneticFilter, setGeneticFilter] = useState("All")
  const [rows, setRows] = useState(initialCropParameters)
  const [draft, setDraft] = useState<Omit<CropParameter, "id"> | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const busy = draft !== null

  const visibleRows = rows.filter((row) =>
    (nodeFilter === "All" || row.node === nodeFilter) &&
    (geneticFilter === "All" || row.geneticType === geneticFilter),
  )

  // Only the Active/Inactive status is editable — every other field is fixed.
  const save = () => {
    if (!draft || editingId === null) return
    setRows((current) => current.map((row) => row.id === editingId ? { ...draft, id: editingId } : row))
    setDraft(null)
    setEditingId(null)
    toast({
      tone: "success",
      title: "Status updated",
      body: "The carry-over parameter status has been updated.",
    })
  }

  const cancel = () => { setDraft(null); setEditingId(null) }

  // In edit mode only the Status toggle is interactive; the rest stay read-only.
  const editCells = (
    <>
      <td className="px-4 py-3 font-600 text-ink">{draft?.node}</td>
      <td className="px-4 py-3 text-ink-soft">{draft?.geneticType}</td>
      <td className="px-4 py-3 tabular-nums text-ink">{draft?.minimumBalance}</td>
      <td className="px-4 py-3 tabular-nums text-ink-soft">{formatDate(draft?.parameterDate ?? "")}</td>
      <td className="px-2 py-1.5">
        <ParameterStatusToggle active={draft?.status === "Active"} onChange={(active) => draft && setDraft({ ...draft, status: active ? "Active" : "Inactive" })} />
      </td>
      <td className="px-4 py-1.5 text-center text-muted">—</td>
    </>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Hierarchical node" className="w-[220px]">
            <Select
              value={nodeFilter}
              onChange={setNodeFilter}
              options={["All", ...CROP_NODES].map((value) => ({ value, label: value === "All" ? "All nodes" : value }))}
              searchable
            />
          </Field>
          <Field label="Genetic type" className="w-[170px]">
            <Select
              value={geneticFilter}
              onChange={setGeneticFilter}
              options={["All", ...GENETIC_TYPES].map((value) => ({ value, label: value === "All" ? "All types" : value }))}
            />
          </Field>
        </div>
        {busy ? (
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={cancel}>
              <X size={16} /> Cancel
            </Button>
            <Button onClick={save}>
              <Check size={16} /> Save
            </Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[13px]">
            <thead className="bg-brand-soft text-[11px] font-700 uppercase tracking-wide text-brand">
              <tr>
                <th className="w-14 px-4 py-3">#</th>
                <th className="min-w-[220px] px-4 py-3">Hierarchical node</th>
                <th className="min-w-[140px] px-4 py-3">Genetic type</th>
                <th className="min-w-[280px] px-4 py-3">Minimum debt balance</th>
                <th className="min-w-[160px] px-4 py-3">Parameter date</th>
                <th className="w-24 px-4 py-3">Status</th>
                <th className="w-24 px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                editingId === row.id ? (
                  <tr key={row.id} className="border-t border-brand bg-brand-soft/30">
                    <td className="px-4 py-1.5 font-700 tabular-nums text-brand">{row.id}</td>
                    {editCells}
                  </tr>
                ) : (
                  <tr key={row.id} className="border-t border-line hover:bg-canvas/45">
                    <td className="px-4 py-3 tabular-nums text-ink-soft">{row.id}</td>
                    <td className="px-4 py-3 font-600 text-ink">{row.node}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.geneticType}</td>
                    <td className="px-4 py-3 tabular-nums text-ink">{row.minimumBalance}</td>
                    <td className="px-4 py-3 tabular-nums text-ink-soft">{formatDate(row.parameterDate)}</td>
                    <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => { setDraft({ ...row }); setEditingId(row.id) }}
                        className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label={`Edit ${row.node} ${row.geneticType}`}
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                )
              ))}
              {visibleRows.length === 0 ? (
                <tr className="border-t border-line">
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-muted">No parameters match the selected filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
