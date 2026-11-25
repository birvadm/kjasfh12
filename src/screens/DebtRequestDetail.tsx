import { useEffect, useMemo, useState } from "react"
import { Check, Info, X } from "../components/icons"
import { Button, Checkbox, Field, Input, Modal, Select, useToast } from "../components/ui"
import { DESTINATION_FARMERS, type DebtLine, type DebtRequest } from "./DebtTransfer"

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const lineTypeTone: Record<DebtLine["type"], string> = {
  Billing: "border-[#c7dcf5] bg-brand-soft text-brand",
  Investments: "border-[#f2ddb3] bg-[#fdf3e0] text-[#9a6a12]",
  "Production advance": "border-[#ccebd8] bg-[#edf8f1] text-[#187247]",
  Freight: "border-[#e2d5f2] bg-[#f4eefb] text-[#6b3fa0]",
  Supplies: "border-line bg-canvas text-ink-soft",
}

const debtOptions = [
  "Keep origin debt",
  "51 Debt assumed from another farmer",
  "52 Rescheduled internal debt",
]

export function DebtRequestDetail({
  value,
  onBack,
  onDone,
}: {
  value: DebtRequest
  onBack: () => void
  onDone: () => void
}) {
  const toast = useToast()

  const readOnly = value.status !== "Waiting"

  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(value.lines.map((line) => [line.id, true])),
  )
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(value.lines.map((line) => [line.id, money(line.balance)])),
  )
  const [debt, setDebt] = useState("Keep origin debt")
  const [financeNote, setFinanceNote] = useState("")
  const [group, setGroup] = useState(false)
  const [split, setSplit] = useState(false)
  const [installments, setInstallments] = useState("3")
  const [dueOverrides, setDueOverrides] = useState<Record<number, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState("")

  const count = Math.max(1, Number.parseInt(installments, 10) || 1)
  const total = value.lines.reduce((sum, line) => sum + line.balance, 0)
  const destination = DESTINATION_FARMERS.find((farmer) => farmer.value === value.destCode)
  const destinationContract = value.destContract || destination?.contracts[0] || "—"
  const existingDebts = destination?.existing ?? 0
  const currentIndebtedness = destination?.indebtedness ?? 0
  const afterIndebtedness = existingDebts > 0
    ? currentIndebtedness + (total / existingDebts) * currentIndebtedness
    : currentIndebtedness

  useEffect(() => {
    setDueOverrides({})
  }, [debt, group, split, installments])

  const destinationRows = useMemo(() => {
    if (group)
      return [{ debt: value.lines[0]?.debt ?? "Debt", installment: "-", dueDate: value.lines[0]?.dueDate ?? "", balance: total }]
    if (split) {
      const per = Math.floor((total / count) * 100) / 100
      return Array.from({ length: count }, (_, index) => ({
        debt: value.lines[0]?.debt ?? "Debt",
        installment: `${index + 1}/${count}`,
        dueDate: value.lines[index]?.dueDate ?? value.lines[0]?.dueDate ?? "",
        balance: index === count - 1 ? Number((total - per * (count - 1)).toFixed(2)) : per,
      }))
    }
    return value.lines.map((line) => ({ debt: line.debt, installment: line.installment, dueDate: line.dueDate, balance: line.balance }))
  }, [count, group, split, total, value.lines])

  const displayedDestinationRows = destinationRows.map((row) => ({
    ...row,
    debt: debt === "Keep origin debt" ? row.debt : debt,
  }))

  const setMode = (next: "group" | "split", on: boolean) => {
    if (next === "group") {
      setGroup(on)
      if (on) setSplit(false)
    } else {
      setSplit(on)
      if (on) setGroup(false)
    }
  }

  const rejectRequest = () => {
    toast({ tone: "info", title: "Request rejected", body: `${value.id} was rejected.` })
    onBack()
  }

  const confirm = () => {
    toast({ tone: "success", title: "Request approved", body: "The debt transfer is approved and pending documents." })
    onDone()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="min-w-[280px]">
          <p className="text-[11px] font-700 uppercase tracking-wide text-muted">Field technician request</p>
          <p className="mt-1 text-[16px] font-700 text-ink">{value.id} · raised by {value.raisedBy} on {value.raisedOn}</p>
          <p className="mt-1 text-[12.5px] text-muted">{value.originCode} {value.originFarmer} → {value.destCode} {value.destFarmer}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="danger" onClick={() => setRejectConfirmOpen(true)} disabled={readOnly}><X size={16} /> Reject</Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={readOnly}><Check size={16} /> Approve</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-stretch">
        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
          <div className="grid gap-4 border-b border-[#efdca1] bg-[#fff6db] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
            <div className="text-[13px] font-700 text-[#856019]">Origin farmer debt</div>
            <Field label="Farmer"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">{value.originCode} {value.originFarmer}</div></Field>
            <Field label="Contract Id"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">{value.originContract}</div></Field>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead className="bg-[#fffaf0] text-[10.5px] font-700 uppercase tracking-wide text-[#856019]"><tr><th className="w-10 px-3 py-2.5"></th><th className="px-3 py-2.5">Debt type</th><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5">Due date</th><th className="px-3 py-2.5">Overdue</th><th className="px-3 py-2.5 text-right">Balance</th><th className="px-3 py-2.5 text-right">To transfer</th></tr></thead>
              <tbody>{value.lines.map((line) => (
                <tr key={line.id} className={`border-t border-line ${line.overdue ? "text-[#c23b3b]" : ""}`}>
                  <td className="px-3 py-2.5"><Checkbox checked={Boolean(selected[line.id])} onChange={() => setSelected((current) => ({ ...current, [line.id]: !current[line.id] }))} disabled={readOnly} /></td>
                  <td className="px-3 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-600 ${lineTypeTone[line.type]}`}>{line.type}</span></td>
                  <td className="px-3 py-2.5 text-ink">{line.debt}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{line.installment}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{line.dueDate}</td>
                  <td className="px-3 py-2.5">{line.overdue ? "Yes" : "No"}</td>
                  <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{money(line.balance)}</td>
                  <td className="px-3 py-2.5"><Input value={selected[line.id] ? amounts[line.id] ?? "" : ""} onChange={(event) => setAmounts((current) => ({ ...current, [line.id]: event.target.value }))} disabled={readOnly || !selected[line.id]} placeholder="0.00" className="ml-auto h-9 w-28 text-right tabular-nums" /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="mt-auto border-t border-[#efdca1] bg-[#fff6db]/70 px-4 py-2.5 text-[12.5px] font-600 text-[#856019]">{value.originCode} · {value.originFarmer} · contract {value.originContract}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-[12.5px]">
              <thead className="bg-[#fffaf0] text-[10.5px] font-700 uppercase tracking-wide text-[#856019]"><tr><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5">Due date</th><th className="px-3 py-2.5 text-right">Value</th></tr></thead>
              <tbody>{value.lines.map((line) => (
                <tr key={`sel-${line.id}`} className="h-[57px] border-t border-line bg-[#fffaf0]/70">
                  <td className="px-3 py-2.5 text-ink">{line.debt}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{line.installment}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{line.dueDate}</td>
                  <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{money(line.balance)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
          <div className="grid gap-4 border-b border-[#cde9d5] bg-[#edf8f0] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
            <div className="text-[13px] font-700 text-[#28734b]">Destination farmer</div>
            <Field label="Farmer"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">{value.destCode} {value.destFarmer}</div></Field>
            <Field label="Contract Id"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">{destinationContract}</div></Field>
          </div>
          <div className="min-h-[179px] overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-[12.5px]">
              <thead className="bg-[#f5fbf6] text-[10.5px] font-700 uppercase tracking-wide text-[#28734b]"><tr><th className="px-3 py-2.5"></th><th className="px-3 py-2.5 text-right">Now</th><th className="px-3 py-2.5 text-right">After the transfer</th></tr></thead>
              <tbody>
                <tr className="border-t border-line"><td className="px-3 py-2.5 text-ink">Existing debts</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{money(existingDebts)}</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{money(existingDebts + total)}</td></tr>
                <tr className="border-t border-line"><td className="px-3 py-2.5 text-ink">Transferred debts</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">0.00</td><td className="px-3 py-2.5 text-right tabular-nums text-brand">{money(total)}</td></tr>
                <tr className="border-t border-line"><td className="px-3 py-2.5 text-ink">Indebtedness</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{currentIndebtedness.toFixed(2)}%</td><td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{afterIndebtedness.toFixed(2)}%</td></tr>
              </tbody>
            </table>
          </div>
          <div className="mt-auto border-t border-[#cde9d5] bg-[#edf8f0]/70 px-4 py-2.5 text-[12.5px] font-600 text-[#28734b]">{value.destCode} · {value.destFarmer} · contract {destinationContract}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-[12.5px]">
              <thead className="bg-[#f5fbf6] text-[10.5px] font-700 uppercase tracking-wide text-[#28734b]"><tr><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5"><span className="inline-flex items-center gap-1">Due date*<span title="The due date can be edited for each destination debt." aria-label="The due date can be edited for each destination debt." className="inline-flex cursor-help text-current/70"><Info size={13} /></span></span></th><th className="px-3 py-2.5 text-right">Value</th></tr></thead>
              <tbody>{displayedDestinationRows.map((row, index) => (
                <tr key={`${row.debt}-${index}`} className="h-[57px] border-t border-line bg-[#f5fbf6]">
                  <td className="px-3 py-2.5 font-600 text-ink">{row.debt}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{row.installment}</td>
                  <td className="px-3 py-2.5"><Input value={dueOverrides[index] ?? row.dueDate} onChange={(event) => setDueOverrides((current) => ({ ...current, [index]: event.target.value }))} disabled={readOnly} className="h-9 w-32 tabular-nums" /></td>
                  <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{money(row.balance)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="flex items-center gap-2 border-b border-line pb-3 text-[13px] font-700 text-brand">Request from the Field Technician</div>
        <p className="mt-3 rounded-lg border border-line bg-canvas px-4 py-3 text-[13.5px] leading-relaxed text-ink-soft">{value.note}</p>
      </div>

      <div className="sticky bottom-0 z-10 space-y-4 rounded-xl border border-line bg-white p-5 shadow-[0_-4px_12px_rgba(15,30,61,0.08)]">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-[12.5px] font-500 text-muted">
              <span>Debt</span>
              <span title="Choosing a destination debt automatically fills in the debt group and debt type." aria-label="Choosing a destination debt automatically fills in the debt group and debt type." className="inline-flex cursor-help text-muted/75 transition hover:text-brand">
                <Info size={14} />
              </span>
            </div>
            <Select value={debt} onChange={setDebt} searchable disabled={readOnly} options={debtOptions.map((option) => ({ value: option, label: option }))} />
          </div>
          <Field label="Debt group"><Input disabled value={debt === "Keep origin debt" ? "" : "Internal debt"} placeholder="Select the debt" /></Field>
          <Field label="Debt type"><Input disabled value={debt === "Keep origin debt" ? "" : "Debt assumption"} placeholder="Select the debt" /></Field>
        </div>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
          <Checkbox checked={group} onChange={(on) => setMode("group", on)} label="Group into a single debt" disabled={readOnly} />
          <div className="flex items-center gap-3 whitespace-nowrap">
            <Checkbox checked={split} onChange={(on) => setMode("split", on)} label="Split into installments" disabled={readOnly} />
            <Input value={installments} inputMode="numeric" onChange={(event) => setInstallments(event.target.value.replace(/[^0-9]/g, ""))} onBlur={() => setInstallments(String(count))} disabled={!split || readOnly} className="h-9 w-16 text-center tabular-nums" />
          </div>
        </div>
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Approve transfer request" width="max-w-md">
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-ring bg-brand-soft/60 p-4 text-[13.5px] leading-relaxed text-ink-soft">
            <p className="font-700 text-ink">Approve this transfer request?</p>
            <p className="mt-1">{money(total)} will be transferred from {value.originCode} {value.originFarmer} to {value.destCode} {value.destFarmer}.</p>
          </div>
          <Field label="Goes to">
            <div className="flex h-10 items-center rounded-lg border border-line bg-white px-3 text-[14px] text-ink">Pending documents</div>
          </Field>
          <Field label="Justification">
            <textarea value={financeNote} onChange={(event) => setFinanceNote(event.target.value)} rows={4} placeholder="Describe the reason for this transfer" className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft placeholder:text-muted/70" />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirm}><Check size={16} /> Yes, approve</Button>
        </div>
      </Modal>

      <Modal open={rejectConfirmOpen} onClose={() => setRejectConfirmOpen(false)} title="Reject transfer request" width="max-w-md">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13.5px] leading-relaxed text-ink-soft">
          <p className="font-700 text-ink">Reject this transfer request?</p>
          <p className="mt-1">This will reject the requested transfer of {money(total)} from {value.originCode} {value.originFarmer} to {value.destCode} {value.destFarmer}.</p>
        </div>
        <Field label="Comment / justification" className="mt-4">
          <textarea value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} rows={4} placeholder="Describe the reason for rejecting this transfer" className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft placeholder:text-muted/70" />
        </Field>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setRejectConfirmOpen(false)}>Keep request</Button>
          <Button variant="danger" disabled={!rejectNote.trim()} onClick={rejectRequest}><X size={16} /> Yes, reject</Button>
        </div>
      </Modal>
    </div>
  )
}
