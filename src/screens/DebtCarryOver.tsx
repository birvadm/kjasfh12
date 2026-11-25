import { useState } from "react"
import { Check, X } from "../components/icons"
import { Button, Field, FieldSet, Input, Modal, Select, useToast } from "../components/ui"
import type { CarryOverSetup } from "./DebtTransfer"

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function DebtCarryOver({ value, onBack, onDone }: { value: CarryOverSetup; onBack: () => void; onDone: () => void }) {
  const toast = useToast()
  const fromYear = Number.parseInt(value.fromCrop, 10) || new Date().getFullYear()
  const [toCrop, setToCrop] = useState(String(fromYear + 1))
  const [goesTo, setGoesTo] = useState("Pending documents")
  const [justification, setJustification] = useState(`End of crop year carry over, ${value.debtType.toLowerCase()}`)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const toCropOptions = [fromYear + 1, fromYear + 2, fromYear + 3].map((year) => ({ value: String(year), label: String(year) }))

  const confirm = () => {
    toast({ tone: "success", title: "Carry over confirmed", body: `${value.debtType} debts carried over to ${toCrop} · ${goesTo}.` })
    onDone()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="min-w-[280px]">
          <p className="text-[11px] font-700 uppercase tracking-wide text-muted">Carry over</p>
          <p className="mt-1 text-[16px] font-700 text-ink">{value.farmer}</p>
          <p className="mt-1 text-[12.5px] text-muted">{value.debtType} · crop {value.fromCrop} → {toCrop}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={onBack}><X size={16} /> Cancel</Button>
          <Button onClick={() => setConfirmOpen(true)}><Check size={16} /> Carry Over</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <FieldSet title="Carry over">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Debt type"><Input value={value.debtType} disabled /></Field>
            <Field label="From crop"><Input value={value.fromCrop} disabled /></Field>
            <Field label="To crop"><Select value={toCrop} onChange={setToCrop} options={toCropOptions} /></Field>
          </div>
        </FieldSet>

        <FieldSet title="Selection">
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-brand-soft text-[11px] font-700 uppercase tracking-wide text-brand"><tr><th className="px-4 py-2.5"></th><th className="px-4 py-2.5 text-right">Total</th></tr></thead>
              <tbody>
                <tr className="border-t border-line"><td className="px-4 py-2.5 text-ink">Farmers flagged</td><td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{value.farmersFlagged}</td></tr>
                <tr className="border-t border-line"><td className="px-4 py-2.5 text-ink">Debts to move</td><td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{value.debtsToMove}</td></tr>
                <tr className="border-t border-line"><td className="px-4 py-2.5 font-600 text-ink">Value carried over</td><td className="px-4 py-2.5 text-right font-700 tabular-nums text-ink">{money(value.valueCarriedOver)}</td></tr>
              </tbody>
            </table>
          </div>
        </FieldSet>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm carry over" width="max-w-lg">
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-ring bg-brand-soft/60 p-4 text-[13.5px] leading-relaxed text-ink-soft">
            <p className="font-700 text-ink">Validate this carry over?</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-[12.5px]">
              <div><dt className="text-muted">Farmer</dt><dd className="font-600 text-ink">{value.farmer}</dd></div>
              <div><dt className="text-muted">Debt type</dt><dd className="font-600 text-ink">{value.debtType}</dd></div>
              <div><dt className="text-muted">Crop year</dt><dd className="font-600 text-ink">{value.fromCrop} → {toCrop}</dd></div>
              <div><dt className="text-muted">Value</dt><dd className="font-600 text-ink">{money(value.valueCarriedOver)}</dd></div>
            </dl>
          </div>
          <Field label="Goes to"><Select value={goesTo} onChange={setGoesTo} options={["Pending documents", "Field team approval", "Credit committee"].map((option) => ({ value: option, label: option }))} /></Field>
          <Field label="Justification"><Input value={justification} onChange={(event) => setJustification(event.target.value)} placeholder="Describe the reason for this carry over" /></Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button disabled={!justification.trim()} onClick={confirm}><Check size={16} /> Yes, confirm</Button>
        </div>
      </Modal>
    </div>
  )
}
