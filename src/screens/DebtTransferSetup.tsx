import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Check, Info, X } from "../components/icons"
import { Button, Checkbox, Field, Input, Modal, Select, useToast } from "../components/ui"
import type { TransferSetup } from "./DebtTransfer"

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Destination debt codes are picked from the catalogue; the group + type are then filled by the system.
const DEST_DEBTS = [
  { value: "", label: "Keep origin debt (leave empty)", group: "", assumed: false },
  { value: "51", label: "51 Debt assumed from another farmer", group: "Internal Debt", assumed: true },
  { value: "52", label: "52 Rescheduled internal debt", group: "Internal Debt", assumed: true },
]
type DestRow = { debt: string; installment: string; dueDate: string; value: number }

export function DebtTransferSetup({ value, onBack, onDone }: { value: TransferSetup; onBack: () => void; onDone: () => void }) {
  const toast = useToast()
  const [destDebt, setDestDebt] = useState("")
  const [group, setGroup] = useState(false)
  const [split, setSplit] = useState(false)
  const [installments, setInstallments] = useState("3")
  const [dueOverrides, setDueOverrides] = useState<Record<number, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [justification, setJustification] = useState(value.justification)

  const count = Math.max(1, Number.parseInt(installments, 10) || 1)

  const catalogue = DEST_DEBTS.find((option) => option.value === destDebt) ?? DEST_DEBTS[0]
  const total = value.lines.reduce((sum, line) => sum + line.value, 0)
  const assumedLabel = catalogue.assumed ? `${catalogue.value} - Debt assumed` : null
  const debtType = catalogue.assumed ? (value.lines[0]?.type ?? "") : ""

  // Reset any hand-typed due dates whenever the shape of the destination changes.
  useEffect(() => {
    setDueOverrides({})
  }, [destDebt, group, split, installments])

  const setMode = (next: "group" | "split", on: boolean) => {
    if (next === "group") {
      setGroup(on)
      if (on) setSplit(false)
    } else {
      setSplit(on)
      if (on) setGroup(false)
    }
  }

  const baseRows = useMemo<DestRow[]>(() => {
    if (group) {
      return [{ debt: assumedLabel ?? "Grouped debt", installment: "-", dueDate: value.lines[0]?.dueDate ?? "", value: total }]
    }
    if (split) {
      const per = Math.floor((total / count) * 100) / 100
      return Array.from({ length: count }, (_, i) => ({
        debt: assumedLabel ?? value.lines[0]?.debt ?? "Debt",
        installment: `${i + 1}/${count}`,
        dueDate: value.lines[i]?.dueDate ?? value.lines[0]?.dueDate ?? "",
        value: i === count - 1 ? Number((total - per * (count - 1)).toFixed(2)) : per,
      }))
    }
    return value.lines.map((line) => ({ debt: assumedLabel ?? line.debt, installment: line.installment, dueDate: line.dueDate, value: line.value }))
  }, [assumedLabel, count, group, split, total, value.lines])

  const caption = !catalogue.assumed
    ? "No destination debt chosen — the origin debts are kept"
    : group
      ? `Grouped — ${value.lines.length} lines become one`
      : split
        ? `Split — one debt becomes ${count} installments`
        : "Default — nothing grouped, nothing split"

  const confirm = () => {
    toast({ tone: "success", title: "Transfer confirmed", body: `${money(total)} transferred to ${value.destLabel} · Pending documents.` })
    onDone()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="min-w-[280px]">
          <p className="text-[11px] font-700 uppercase tracking-wide text-muted">Set up the transfer</p>
          <p className="mt-1 text-[16px] font-700 text-ink">{value.originLabel} → {value.destLabel}</p>
          <p className="mt-1 text-[12.5px] text-muted">{caption}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={onBack}><X size={16} /> Cancel</Button>
          <Button onClick={() => setConfirmOpen(true)}><Check size={16} /> Confirm</Button>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-[12.5px] font-500 text-muted">
              <span>Debt</span>
              <span title="Choosing a destination debt automatically fills in the debt group and debt type." aria-label="Choosing a destination debt automatically fills in the debt group and debt type." className="inline-flex cursor-help text-muted/75 transition hover:text-brand">
                <Info size={14} />
              </span>
            </div>
            <Select value={destDebt} onChange={setDestDebt} searchable options={DEST_DEBTS.map((option) => ({ value: option.value, label: option.label }))} />
          </div>
          <Field label="Debt group"><Input value={catalogue.group} disabled placeholder="Filled by the system" /></Field>
          <Field label="Debt type"><Input value={debtType} disabled placeholder="Filled by the system" /></Field>
        </div>
        {!catalogue.assumed ? <p className="mt-2 text-[11.5px] italic text-[#c07a1a]">If left empty, each line keeps its origin debt, group and type.</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-10 gap-y-3 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <Checkbox checked={group} onChange={(on) => setMode("group", on)} label="Group into a single debt" />
        <div className="flex items-center gap-3">
          <Checkbox checked={split} onChange={(on) => setMode("split", on)} label="Split into" />
          <Input value={installments} inputMode="numeric" onChange={(event) => setInstallments(event.target.value.replace(/[^0-9]/g, ""))} onBlur={() => setInstallments(String(count))} disabled={!split} className="h-9 w-16 text-center tabular-nums" />
          <span className="text-[13.5px] text-ink-soft">installments</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
          <div className="border-b border-[#efdca1] bg-[#fff6db] px-4 py-3 text-[13px] font-700 text-[#856019]">Selected on {value.originLabel}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[12.5px]">
              <thead className="bg-[#fffaf0] text-[10.5px] font-700 uppercase tracking-wide text-[#856019]"><tr><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5">Due date</th><th className="px-3 py-2.5 text-right">Value</th></tr></thead>
              <tbody>{value.lines.map((line) => (
                <tr key={line.id} className="border-t border-line">
                  <td className="px-3 py-2.5 text-ink">{line.debt}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{line.installment}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{line.dueDate}</td>
                  <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{money(line.value)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
          <div className="flex items-center gap-2 border-b border-[#cde9d5] bg-[#edf8f0] px-4 py-3 text-[13px] font-700 text-[#28734b]"><ChevronRight size={16} className="shrink-0" /> Lands on {value.destLabel}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-[12.5px]">
              <thead className="bg-[#f5fbf6] text-[10.5px] font-700 uppercase tracking-wide text-[#28734b]"><tr><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5"><span className="inline-flex items-center gap-1">Due date<span title="The due date can be edited for each destination debt." aria-label="The due date can be edited for each destination debt." className="inline-flex cursor-help text-current/70"><Info size={13} /></span></span></th><th className="px-3 py-2.5 text-right">Value</th></tr></thead>
              <tbody>{baseRows.map((row, i) => (
                <tr key={i} className={`border-t border-line ${catalogue.assumed ? "bg-[#fdece0]/60" : "bg-brand-soft/20"}`}>
                  <td className="px-3 py-2.5 font-600 text-ink">{row.debt}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{row.installment}</td>
                  <td className="px-3 py-2.5"><Input value={dueOverrides[i] ?? row.dueDate} onChange={(event) => setDueOverrides((prev) => ({ ...prev, [i]: event.target.value }))} className="h-9 w-32 tabular-nums" /></td>
                  <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{money(row.value)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm transfer" width="max-w-md">
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-ring bg-brand-soft/60 p-4 text-[13.5px] leading-relaxed text-ink-soft">
            <p className="font-700 text-ink">Validate this transfer?</p>
            <p className="mt-1">{money(total)} will be transferred from {value.originLabel} to {value.destLabel}.</p>
          </div>
          <Field label="Goes to">
            <div className="flex h-10 items-center rounded-lg border border-line bg-white px-3 text-[14px] text-ink">Pending documents</div>
          </Field>
          <Field label="Justification">
            <textarea value={justification} onChange={(event) => setJustification(event.target.value)} rows={4} placeholder="Describe the reason for this transfer" className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft placeholder:text-muted/70" />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button disabled={!justification.trim()} onClick={confirm}><Check size={16} /> Yes, confirm</Button>
        </div>
      </Modal>
    </div>
  )
}
