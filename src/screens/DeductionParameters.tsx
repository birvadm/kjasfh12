import { useMemo, useState } from "react"
import { Check, Pencil, Plus, Trash2, X } from "../components/icons"
import { Button, Field, Input, Modal, Select, useToast } from "../components/ui"

type CalculationType = "Fixed" | "Percentage"

type ParameterTab = "deductions" | "minimumDelivery" | "percentageValue" | "safetyMargin"

type Deduction = {
  id: string
  name: string
  calculationType: CalculationType
  fixedAmount: string
  percentage: string
  percentageOf: string
  active: boolean
  editing?: boolean
  isNew?: boolean
}

const INITIAL_DEDUCTIONS: Deduction[] = [
  {
    id: "inss1",
    name: "INSS 1",
    calculationType: "Percentage",
    fixedAmount: "",
    percentage: "11",
    percentageOf: "Gross payment amount",
    active: true,
  },
  {
    id: "inss2",
    name: "INSS 2",
    calculationType: "Fixed",
    fixedAmount: "75.50",
    percentage: "",
    percentageOf: "",
    active: true,
  },
  {
    id: "professional-tax",
    name: "Professional Tax",
    calculationType: "Percentage",
    fixedAmount: "",
    percentage: "2.5",
    percentageOf: "Taxable earnings after INSS",
    active: false,
  },
]

const makeDeduction = (): Deduction => ({
  id: `deduction-${Date.now()}`,
  name: "",
  calculationType: "Fixed",
  fixedAmount: "0.00",
  percentage: "",
  percentageOf: "",
  active: true,
  editing: true,
  isNew: true,
})

export function DeductionParameters({ hideTabs = false }: { hideTabs?: boolean } = {}) {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<ParameterTab>("deductions")
  const [deductions, setDeductions] = useState(INITIAL_DEDUCTIONS)
  const [status, setStatus] = useState("All")
  const [editSnapshots, setEditSnapshots] = useState<Record<string, Deduction>>({})
  const [pendingDelete, setPendingDelete] = useState<Deduction | null>(null)
  const newDeduction = deductions.find((deduction) => deduction.isNew)

  const visibleDeductions = useMemo(
    () =>
      deductions.filter((deduction) =>
        status === "All" ? true : status === "Active" ? deduction.active : !deduction.active,
      ),
    [deductions, status],
  )

  const updateDeduction = (id: string, update: Partial<Deduction>) =>
    setDeductions((current) =>
      current.map((deduction) =>
        deduction.id === id ? { ...deduction, ...update } : deduction,
      ),
    )

  const removeDeduction = (id: string) =>
    setDeductions((current) => current.filter((deduction) => deduction.id !== id))

  const addDeduction = () => {
    if (!newDeduction) setDeductions((current) => [...current, makeDeduction()])
  }

  const saveDeduction = (deduction: Deduction) => {
    updateDeduction(deduction.id, { editing: false, isNew: false })
    setEditSnapshots((current) => {
      const { [deduction.id]: _, ...rest } = current
      return rest
    })
    toast({
      title: deduction.isNew ? "Deduction added" : "Deduction updated",
      body: deduction.name || "New deduction",
      tone: "success",
    })
  }

  const startEditing = (deduction: Deduction) => {
    setEditSnapshots((current) => ({ ...current, [deduction.id]: deduction }))
    updateDeduction(deduction.id, { editing: true })
  }

  const cancelEditing = (deduction: Deduction) => {
    if (deduction.isNew) {
      removeDeduction(deduction.id)
      return
    }
    const snapshot = editSnapshots[deduction.id]
    if (snapshot) {
      updateDeduction(deduction.id, snapshot)
      setEditSnapshots((current) => {
        const { [deduction.id]: _, ...rest } = current
        return rest
      })
    } else {
      updateDeduction(deduction.id, { editing: false })
    }
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    removeDeduction(pendingDelete.id)
    toast({ title: "Deduction deleted", body: pendingDelete.name, tone: "success" })
    setPendingDelete(null)
  }

  return (
    <div className="space-y-5">
      <div className={hideTabs ? "hidden" : "border-b border-line"}>
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("deductions")}
            className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${activeTab === "deductions" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
          >
            Deduction Parameters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("percentageValue")}
            className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${activeTab === "percentageValue" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
          >
            By % Value
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("minimumDelivery")}
            className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${activeTab === "minimumDelivery" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
          >
            Min. 1st Delivery
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("safetyMargin")}
            className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${activeTab === "safetyMargin" ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
          >
            Safety Margin
          </button>
        </div>
      </div>

      <div className={activeTab === "deductions" ? "space-y-5" : "hidden"}>
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <Field label="Status" className="w-[150px]">
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: "All", label: "All" },
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
        </Field>
        <Button onClick={addDeduction} disabled={Boolean(newDeduction)}>
          <Plus size={16} /> Add deduction
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left text-[13px]">
            <thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand">
              <tr>
                <th className="min-w-[190px] px-4 py-3">Deduction name</th>
                <th className="min-w-[195px] px-4 py-3">Calculation type</th>
                <th className="min-w-[150px] px-4 py-3 text-right">Fixed value</th>
                <th className="min-w-[150px] px-4 py-3 text-right">Percentage</th>
                <th className="min-w-[250px] px-4 py-3">Percentage of</th>
                <th className="w-[125px] px-4 py-3">Status</th>
                <th className="w-[154px] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDeductions.map((deduction) => (
                <tr key={deduction.id} className="border-t border-line align-top hover:bg-canvas/45">
                  <td className="px-4 py-3">
                    {deduction.editing ? (
                      <Input
                        value={deduction.name}
                        placeholder="e.g. Professional Tax"
                        onChange={(event) =>
                          updateDeduction(deduction.id, { name: event.target.value })
                        }
                      />
                    ) : (
                      <span className="inline-flex h-10 items-center font-600 text-ink">{deduction.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {deduction.editing ? (
                      <Select
                        value={deduction.calculationType}
                        onChange={(calculationType) =>
                          updateDeduction(deduction.id, {
                            calculationType: calculationType as CalculationType,
                            fixedAmount:
                              calculationType === "Fixed"
                                ? deduction.fixedAmount || "0.00"
                                : "",
                            percentage: calculationType === "Fixed" ? "" : deduction.percentage,
                            percentageOf: calculationType === "Fixed" ? "" : deduction.percentageOf,
                          })
                        }
                        options={[
                          { value: "Fixed", label: "Fixed" },
                          { value: "Percentage", label: "Percentage" },
                        ]}
                      />
                    ) : (
                      <span className="inline-flex rounded-full border border-brand-soft bg-brand-soft/45 px-2.5 py-1 text-[12px] font-600 text-brand">{deduction.calculationType}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {deduction.editing && deduction.calculationType === "Fixed" ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right"
                        value={deduction.fixedAmount}
                        placeholder="0.00"
                        onChange={(event) =>
                          updateDeduction(deduction.id, { fixedAmount: event.target.value })
                        }
                      />
                    ) : (
                      <span className="inline-flex h-10 items-center tabular-nums text-ink">{deduction.calculationType === "Fixed" ? deduction.fixedAmount || "—" : "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {deduction.editing && deduction.calculationType === "Percentage" ? (
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className="pr-8 text-right"
                          value={deduction.percentage}
                          placeholder="0.00"
                          onChange={(event) =>
                            updateDeduction(deduction.id, { percentage: event.target.value })
                          }
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">%</span>
                      </div>
                    ) : (
                      <span className="inline-flex h-10 items-center tabular-nums text-ink">{deduction.calculationType === "Percentage" ? `${deduction.percentage || "0"}%` : "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {deduction.calculationType === "Percentage" ? deduction.editing ? (
                      <Input
                        value={deduction.percentageOf}
                        placeholder="e.g. Gross payment amount"
                        onChange={(event) =>
                          updateDeduction(deduction.id, { percentageOf: event.target.value })
                        }
                      />
                    ) : (
                      <span className="inline-flex h-10 items-center text-ink-soft">{deduction.percentageOf || "—"}</span>
                    ) : (
                      <span className="inline-flex h-10 items-center text-muted">Not applicable</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {deduction.editing ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={deduction.active}
                        aria-label={`Set ${deduction.name || "deduction"} ${deduction.active ? "inactive" : "active"}`}
                        onClick={() => updateDeduction(deduction.id, { active: !deduction.active })}
                        className={`relative h-9 w-16 rounded-full transition ${deduction.active ? "bg-[#075baa]" : "bg-[#c4cfe4]"}`}
                      >
                        <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-[0_1px_2px_rgba(15,30,61,0.18)] transition-all ${deduction.active ? "left-8" : "left-1"}`} />
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-600 ${deduction.active ? "border-[#ccebd8] bg-[#edf8f1] text-[#187247]" : "border-line bg-canvas text-muted"}`}><span className={`h-2 w-2 rounded-full ${deduction.active ? "bg-[#187247]" : "bg-muted"}`} />{deduction.active ? "Active" : "Inactive"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {deduction.editing ? (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          aria-label={`Save ${deduction.name || "deduction"}`}
                          title="Save deduction"
                          onClick={() => saveDeduction(deduction)}
                          className="grid h-[52px] w-[52px] place-items-center rounded-[14px] border-[3px] border-[#eaa400] text-muted transition hover:bg-[#fff9e8] hover:text-ink"
                        >
                          <Check size={23} strokeWidth={1.8} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Cancel editing ${deduction.name || "deduction"}`}
                          title="Cancel editing"
                          onClick={() => cancelEditing(deduction)}
                          className="grid h-[52px] w-[32px] place-items-center text-[#647190] transition hover:text-ink"
                        >
                          <X size={22} strokeWidth={1.8} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${deduction.name || "deduction"}`}
                          title="Edit deduction"
                          onClick={() => startEditing(deduction)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!visibleDeductions.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted">
                    No deductions match the selected status.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete deduction?"
        width="max-w-md"
      >
        <p className="text-[14px] leading-6 text-ink-soft">
          Delete <span className="font-700 text-ink">{pendingDelete?.name || "this deduction"}</span>? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button className="border-[#b53b2d] bg-[#b53b2d] text-white hover:bg-[#922d22]" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
      </div>

      {activeTab === "minimumDelivery" ? <PolicyPositionTable mode="minimum" /> : null}
      {activeTab === "percentageValue" ? <PolicyPositionTable mode="percentage" /> : null}
      {activeTab === "safetyMargin" ? <SafetyMarginField /> : null}

    </div>
  )
}

type DeliveryRule = {
  id: string
  policy: string
  validFrom: string
  node: string
  tobacco: string
  position: string
  color: string
  quality: string
  paid: string
  volume: string
  minimum: string
  safety: string
  active: boolean
  editing?: boolean
}

function SafetyMarginField() {
  const [safetyMargin, setSafetyMargin] = useState("10")
  const [draft, setDraft] = useState(safetyMargin)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const toast = useToast()

  const startEditing = () => {
    setDraft(safetyMargin)
    setEditing(true)
  }

  const cancelEditing = () => {
    setDraft(safetyMargin)
    setEditing(false)
  }

  const saveSafetyMargin = () => {
    setSafetyMargin(draft)
    setEditing(false)
    setConfirming(false)
    toast({ tone: "success", title: "Safety margin saved" })
  }

  return (
    <>
      <div className="max-w-md rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <Field label="Safety margin %">
          {editing ? (
            <div className="space-y-3">
              <div className="relative">
                <Input
                  autoFocus
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  className="pr-8"
                  aria-label="Safety margin percentage"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">%</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelEditing}>Cancel</Button>
                <Button onClick={() => setConfirming(true)} disabled={!draft.trim()}><Check size={16} /> Save</Button>
              </div>
            </div>
          ) : (
            <div className="flex h-10 items-center justify-between rounded-lg border border-line bg-canvas/45 pl-3 pr-1.5">
              <span className="tabular-nums text-[14px] text-ink">{safetyMargin || "0"}%</span>
              <button
                type="button"
                onClick={startEditing}
                aria-label="Edit safety margin"
                title="Edit safety margin"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
        </Field>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Save safety margin?" width="max-w-md">
        <p className="text-[14px] leading-6 text-ink-soft">
          Update the safety margin to <span className="font-700 text-ink">{draft || "0"}%</span>?
        </p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button onClick={saveSafetyMargin}><Check size={16} /> Confirm save</Button>
        </div>
      </Modal>
    </>
  )
}

const INITIAL_DELIVERY_RULES: DeliveryRule[] = [
  { id: "delivery-1", policy: "", validFrom: "01/09/2026", node: "HN1", tobacco: "Virginia", position: "", color: "", quality: "", paid: "100.00", volume: "100.00", minimum: "800.00", safety: "10", active: true },
  { id: "delivery-2", policy: "", validFrom: "01/09/2026", node: "HN2", tobacco: "Virginia", position: "X", color: "", quality: "", paid: "100.00", volume: "100.00", minimum: "", safety: "15", active: true },
  { id: "delivery-3", policy: "", validFrom: "01/09/2026", node: "HN3", tobacco: "Virginia", position: "C", color: "", quality: "", paid: "80.00", volume: "100.00", minimum: "", safety: "20", active: true },
]

function PaymentPositionTable({ mode }: { mode: "minimum" | "percentage" }) {
  const toast = useToast()
  const [rules, setRules] = useState(INITIAL_DELIVERY_RULES)
  const [status, setStatus] = useState("All")
  const [pendingDelete, setPendingDelete] = useState<DeliveryRule | null>(null)
  const [tobacco, setTobacco] = useState("Virginia")
  const [node, setNode] = useState("All")
  const fields = mode === "minimum"
    ? (["position", "color", "quality", "minimum"] as const)
    : (["position", "color", "quality", "paid", "volume"] as const)

  const patch = (id: string, update: Partial<DeliveryRule>) =>
    setRules((current) => current.map((rule) => (rule.id === id ? { ...rule, ...update } : rule)))
  const visibleRules = rules.filter(() => status === "All")
  const deleteRule = () => setPendingDelete(null)

  const addRule = () =>
    setRules((current) => [
      ...current,
      { id: `delivery-${Date.now()}`, policy: "", active: true, validFrom: "01/09/2026", node: node === "All" ? "HN1" : node, tobacco, position: "", color: "", quality: "", paid: "100.00", volume: "100.00", minimum: "", safety: "", editing: true },
    ])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="grid min-w-[620px] grid-cols-4 gap-3">
          <Field label="Policy"><Select value="Payment policy" onChange={() => {}} options={[{ value: "Payment policy", label: "Payment policy" }]} /></Field>
          <Field label="Crop year"><Select value="2026/27" onChange={() => {}} options={[{ value: "2026/27", label: "2026/27" }]} /></Field>
          <Field label="Tobacco type"><Select value={tobacco} onChange={setTobacco} options={[{ value: "Virginia", label: "Virginia" }, { value: "Burley", label: "Burley" }]} /></Field>
          <Field label="Node"><Select value={node} onChange={setNode} options={[{ value: "All", label: "All" }, { value: "HN1", label: "HN1" }, { value: "HN2", label: "HN2" }]} /></Field>
        </div>
        <Button onClick={addRule}><Plus size={16} /> Add entry</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[13px]">
            <thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand">
              <tr>
                <th className="min-w-[120px] px-4 py-3">Valid from</th>
                <th className="min-w-[100px] px-4 py-3">Node</th>
                <th className="min-w-[130px] px-4 py-3">Tobacco type</th>
                <th className="min-w-[100px] px-4 py-3">Position</th>
                <th className="min-w-[90px] px-4 py-3">Color</th>
                <th className="min-w-[100px] px-4 py-3">Quality</th>
                {mode === "percentage" ? <><th className="min-w-[120px] px-4 py-3">% paid free</th><th className="min-w-[130px] px-4 py-3">% max volume</th></> : <th className="min-w-[150px] px-4 py-3">Min 1st delivery</th>}
                <th className="w-[116px] px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-t border-line align-top hover:bg-canvas/45">
                  <td className="px-4 py-3">
                    {rule.editing ? <Input value={rule.policy} placeholder="e.g. Standard tobacco payment" onChange={(event) => patch(rule.id, { policy: event.target.value })} /> : <span className="inline-flex h-10 items-center font-600 text-ink">{rule.policy}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {rule.editing ? <Input value={rule.minimum} placeholder="e.g. 500 kg" onChange={(event) => patch(rule.id, { minimum: event.target.value })} /> : <span className="inline-flex h-10 items-center tabular-nums text-ink">{rule.minimum}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {rule.editing ? (
                      <button type="button" role="switch" aria-checked={rule.active} aria-label={`Set ${rule.policy || "minimum delivery"} ${rule.active ? "inactive" : "active"}`} onClick={() => patch(rule.id, { active: !rule.active })} className={`relative h-9 w-16 rounded-full transition ${rule.active ? "bg-[#075baa]" : "bg-[#c4cfe4]"}`}>
                        <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-[0_1px_2px_rgba(15,30,61,0.18)] transition-all ${rule.active ? "left-8" : "left-1"}`} />
                      </button>
                    ) : <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-600 ${rule.active ? "border-[#ccebd8] bg-[#edf8f1] text-[#187247]" : "border-line bg-canvas text-muted"}`}><span className={`h-2 w-2 rounded-full ${rule.active ? "bg-[#187247]" : "bg-muted"}`} />{rule.active ? "Active" : "Inactive"}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {rule.editing ? (
                      <div className="flex justify-end gap-3">
                        <button type="button" aria-label={`Save ${rule.policy || "minimum delivery"}`} title="Save" onClick={() => { patch(rule.id, { editing: false }); toast({ title: "Minimum delivery saved", body: rule.policy || "New minimum delivery", tone: "success" }) }} className="grid h-[52px] w-[52px] place-items-center rounded-[14px] border-[3px] border-[#eaa400] text-muted transition hover:bg-[#fff9e8] hover:text-ink"><Check size={23} strokeWidth={1.8} /></button>
                        <button type="button" aria-label="Cancel editing" title="Cancel" onClick={() => patch(rule.id, { editing: false })} className="grid h-[52px] w-[32px] place-items-center text-[#647190] transition hover:text-ink"><X size={22} strokeWidth={1.8} /></button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button type="button" aria-label={`Edit ${rule.policy}`} title="Edit" onClick={() => patch(rule.id, { editing: true })} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"><Pencil size={16} /></button>
                        <button type="button" aria-label={`Delete ${rule.policy}`} title="Delete" onClick={() => setPendingDelete(rule)} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-[#fff2f0] hover:text-[#b53b2d]"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!visibleRules.length ? <tr><td colSpan={4} className="px-4 py-12 text-center text-[13px] text-muted">No minimum-delivery parameters match the selected status.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} title="Delete minimum delivery?" width="max-w-md">
        <p className="text-[14px] leading-6 text-ink-soft">Delete <span className="font-700 text-ink">{pendingDelete?.policy || "this minimum delivery"}</span>? This action cannot be undone.</p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button className="border-[#b53b2d] bg-[#b53b2d] text-white hover:bg-[#922d22]" onClick={deleteRule}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}

function PolicyPositionTable({ mode }: { mode: "minimum" | "percentage" }) {
  const toast = useToast()
  const [rows, setRows] = useState(INITIAL_DELIVERY_RULES)
  const [tobacco, setTobacco] = useState("Virginia")
  const [node, setNode] = useState("All")
  const columns = mode === "minimum"
    ? (["validFrom", "node", "tobacco", "position", "color", "quality", "minimum"] as const)
    : (["validFrom", "node", "tobacco", "position", "color", "quality", "paid", "volume"] as const)
  const labels = { validFrom: "Valid from", node: "Node", tobacco: "Tobacco type", position: "Position", color: "Color", quality: "Quality", paid: "% paid free", volume: "% max volume", minimum: "Min 1st delivery" }
  const update = (id: string, change: Partial<DeliveryRule>) => setRows((all) => all.map((row) => row.id === id ? { ...row, ...change } : row))
  const add = () => setRows((all) => [...all, { id: `entry-${Date.now()}`, policy: "", active: true, validFrom: "01/09/2026", node: node === "All" ? "HN1" : node, tobacco, position: "", color: "", quality: "", paid: "100.00", volume: "100.00", minimum: "", safety: "", editing: true }])
  const metricSignature = (row: DeliveryRule) => mode === "minimum" ? row.minimum.trim() : `${row.paid.trim()}|${row.volume.trim()}`
  const save = (row: DeliveryRule) => {
    const signature = metricSignature(row)
    if (signature && rows.some((item) => item.id !== row.id && metricSignature(item) === signature)) {
      toast({ tone: "info", title: "Duplicate value", body: "This value is already configured in this parameter table." })
      return
    }
    update(row.id, { editing: false })
    toast({ tone: "success", title: `${mode === "minimum" ? "Minimum delivery" : "Percentage value"} saved` })
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
      <div className="grid min-w-[620px] grid-cols-4 gap-3"><Field label="Policy"><Select value="Payment policy" onChange={() => {}} options={[{ value: "Payment policy", label: "Payment policy" }]} /></Field><Field label="Crop season"><Select value="2026/27" onChange={() => {}} options={[{ value: "2026/27", label: "2026/27" }]} /></Field><Field label="Tobacco type"><Select value={tobacco} onChange={setTobacco} options={[{ value: "Virginia", label: "Virginia" }, { value: "Burley", label: "Burley" }]} /></Field><Field label="Node"><Select value={node} onChange={setNode} options={[{ value: "All", label: "All" }, { value: "HN1", label: "HN1" }]} /></Field></div>
      <Button onClick={add}><Plus size={16} /> Add entry</Button>
    </div>
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]"><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-[13px]"><thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand"><tr>{columns.map((column) => <th key={column} className="min-w-[110px] px-4 py-3">{labels[column]}</th>)}<th className="w-[96px] px-4 py-3 text-right">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-line hover:bg-canvas/45">{columns.map((column) => <td key={column} className="px-4 py-3">{row.editing ? <Input className="h-9" value={row[column]} onChange={(event) => update(row.id, { [column]: event.target.value })} /> : <span className={`inline-flex h-10 items-center ${column === "node" ? "font-600 text-ink" : "text-ink-soft"}`}>{row[column] || "—"}</span>}</td>)}<td className="px-4 py-3 text-right">{row.editing ? <button onClick={() => save(row)} className="grid h-9 w-9 place-items-center rounded-lg text-brand hover:bg-brand-soft"><Check size={16} /></button> : <button onClick={() => update(row.id, { editing: true })} className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-brand"><Pencil size={16} /></button>}</td></tr>)}</tbody></table></div></div>
  </div>
}
