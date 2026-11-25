import { useEffect, useMemo, useState } from "react"
import { Check, Info, X } from "../components/icons"
import { Button, DatePicker, Field, Input, Modal, Radio, Select, useToast } from "../components/ui"
import { DEBT_LINES, DESTINATION_FARMERS, type DebtRow, type DebtLine } from "./DebtTransfer"

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const lineTypeTone: Record<DebtLine["type"], string> = {
  Billing: "border-[#c7dcf5] bg-brand-soft text-brand",
  Investments: "border-[#f2ddb3] bg-[#fdf3e0] text-[#9a6a12]",
  "Production advance": "border-[#ccebd8] bg-[#edf8f1] text-[#187247]",
  Freight: "border-[#e2d5f2] bg-[#f4eefb] text-[#6b3fa0]",
  Supplies: "border-line bg-canvas text-ink-soft",
}

// Destination debt codes are picked from the catalogue; the group + type are then filled by the system.
const DEST_DEBTS = [
  { value: "", label: "Keep origin debt (leave empty)", group: "", assumed: false },
  { value: "51", label: "51 Debt assumed from another farmer", group: "Internal Debt", assumed: true },
  { value: "52", label: "52 Rescheduled internal debt", group: "Internal Debt", assumed: true },
]
type DestRow = { debt: string; installment: string; dueDate: string; value: number }

export function DebtTransferDetail({ value, onBack, onDone }: { value: DebtRow; onBack: () => void; onDone: () => void }) {
  const toast = useToast()
  const lines = DEBT_LINES[value.id.replace(/^r-/, "")] ?? []

  const [selectedLines, setSelectedLines] = useState<Record<string, boolean>>({})
  const [transferAmounts, setTransferAmounts] = useState<Record<string, string>>({})
  const [destFarmer, setDestFarmer] = useState("")
  const [destContract, setDestContract] = useState("")

  const [destDebt, setDestDebt] = useState("")
  const [group, setGroup] = useState(false)
  const [split, setSplit] = useState(false)
  const [installments, setInstallments] = useState("3")
  const [dueOverrides, setDueOverrides] = useState<Record<number, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [justification, setJustification] = useState("Transfer set up by Finance.")

  const transferTotal = lines.reduce((sum, line) => (selectedLines[line.id] ? sum + (Number(transferAmounts[line.id]) || 0) : sum), 0)
  const destination = DESTINATION_FARMERS.find((option) => option.value === destFarmer)

  const toggleLine = (line: DebtLine) => {
    setSelectedLines((prev) => ({ ...prev, [line.id]: !prev[line.id] }))
    setTransferAmounts((prev) => (prev[line.id] ? prev : { ...prev, [line.id]: line.balance.toFixed(2) }))
  }

  const allSelected = lines.length > 0 && lines.every((line) => selectedLines[line.id])
  const someSelected = lines.some((line) => selectedLines[line.id])
  const toggleAll = () => {
    if (allSelected) {
      setSelectedLines({})
      return
    }
    setSelectedLines(Object.fromEntries(lines.map((line) => [line.id, true])))
    setTransferAmounts((prev) => {
      const next = { ...prev }
      lines.forEach((line) => { if (!next[line.id]) next[line.id] = line.balance.toFixed(2) })
      return next
    })
  }

  const baseReady = transferTotal > 0 && Boolean(destination) && Boolean(destContract)
  const afterIndebtedness = destination?.existing
    ? (destination.indebtedness + (transferTotal / destination.existing) * destination.indebtedness)
    : (destination?.indebtedness ?? 0)

  // The lines picked in the origin table become the payload that lands on the destination.
  const selectedLineRows = useMemo(
    () =>
      lines
        .filter((line) => selectedLines[line.id])
        .map((line) => ({ id: line.id, type: line.type, debt: line.debt, installment: line.installment, dueDate: line.dueDate, value: Number(transferAmounts[line.id]) || line.balance })),
    [lines, selectedLines, transferAmounts],
  )

  const count = Math.max(1, Number.parseInt(installments, 10) || 1)
  const catalogue = DEST_DEBTS.find((option) => option.value === destDebt) ?? DEST_DEBTS[0]
  // Grouping / splitting only applies once a specific destination debt is chosen (not the default "keep origin debt").
  const specificDebt = destDebt !== ""
  const total = selectedLineRows.reduce((sum, line) => sum + line.value, 0)
  const assumedLabel = catalogue.assumed ? `${catalogue.value} - Debt assumed` : null
  const debtType = catalogue.assumed ? (selectedLineRows[0]?.type ?? "") : ""

  const originLabel = `${value.code} ${value.farmer}`
  const destLabel = destination?.label.replace(" · ", " ") ?? "destination farmer"

  // Reset any hand-typed due dates whenever the shape of the destination changes.
  useEffect(() => {
    setDueOverrides({})
  }, [destDebt, group, split, installments, selectedLineRows.length])

  // Grouping / splitting is only valid for a specific debt; drop it if the debt reverts to the default.
  useEffect(() => {
    if (!specificDebt) {
      setGroup(false)
      setSplit(false)
    }
  }, [specificDebt])

  const setMode = (next: "group" | "split") => {
    setGroup(next === "group")
    setSplit(next === "split")
  }

  const baseRows = useMemo<DestRow[]>(() => {
    if (group) {
      return [{ debt: assumedLabel ?? "Grouped debt", installment: "-", dueDate: selectedLineRows[0]?.dueDate ?? "", value: total }]
    }
    if (split) {
      const per = Math.floor((total / count) * 100) / 100
      return Array.from({ length: count }, (_, i) => ({
        debt: assumedLabel ?? selectedLineRows[0]?.debt ?? "Debt",
        installment: `${i + 1}/${count}`,
        dueDate: selectedLineRows[i]?.dueDate ?? selectedLineRows[0]?.dueDate ?? "",
        value: i === count - 1 ? Number((total - per * (count - 1)).toFixed(2)) : per,
      }))
    }
    return selectedLineRows.map((line) => ({ debt: assumedLabel ?? line.debt, installment: line.installment, dueDate: line.dueDate, value: line.value }))
  }, [assumedLabel, count, group, split, total, selectedLineRows])

  // Every destination debt must carry a hand-entered due date before the transfer can go through.
  const allDueFilled = baseRows.length > 0 && baseRows.every((_, i) => Boolean((dueOverrides[i] ?? "").trim()))
  const readyToSetUp = baseReady && allDueFilled

  const confirm = () => {
    toast({ tone: "success", title: "Transfer confirmed", body: `${money(total)} transferred to ${destLabel} · Pending documents.` })
    onDone()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="min-w-[280px]">
          <p className="text-[11px] font-700 uppercase tracking-wide text-muted">Debt transfer</p>
          <p className="mt-1 text-[16px] font-700 text-ink">{value.code} · {value.farmer} · contract {value.contract}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={onBack}><X size={16} /> Cancel</Button>
          <Button disabled={!readyToSetUp} onClick={() => setConfirmOpen(true)}><Check size={16} /> Transfer</Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-stretch">
        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
          <div className="grid gap-4 border-b border-[#efdca1] bg-[#fff6db] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
            <div className="text-[13px] font-700 text-[#856019]">Origin farmer debt</div>
            <Field label="Farmer"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">{value.code} {value.farmer}</div></Field>
            <Field label="Contract Id"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">{value.contract}</div></Field>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[12.5px]">
              <thead className="bg-[#fffaf0] text-[10.5px] font-700 uppercase tracking-wide text-[#856019]"><tr><th className="w-10 px-3 py-2.5"><input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected }} onChange={toggleAll} disabled={!lines.length} className="h-4 w-4 accent-[#004f9e]" aria-label="Select all debts" title="Select all" /></th><th className="px-3 py-2.5">Debt type</th><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5">Due date</th><th className="px-3 py-2.5">Overdue</th><th className="px-3 py-2.5 text-right">Balance</th><th className="px-3 py-2.5 text-right">To transfer</th></tr></thead>
              <tbody>{lines.map((line) => {
                const on = Boolean(selectedLines[line.id])
                return (
                  <tr key={line.id} className={`border-t border-line transition ${on ? "bg-brand-soft/25" : ""} ${line.overdue ? "text-[#c23b3b]" : ""}`}>
                    <td className="px-3 py-2.5"><input type="checkbox" checked={on} onChange={() => toggleLine(line)} className="h-4 w-4 accent-[#004f9e]" aria-label={`Transfer ${line.debt} ${line.installment}`} /></td>
                    <td className="px-3 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-600 ${lineTypeTone[line.type]}`}>{line.type}</span></td>
                    <td className="px-3 py-2.5 text-ink">{line.debt}</td>
                    <td className="px-3 py-2.5 tabular-nums text-ink-soft">{line.installment}</td>
                    <td className="px-3 py-2.5 tabular-nums text-ink-soft">{line.dueDate}</td>
                    <td className="px-3 py-2.5">{line.overdue ? "Yes" : "No"}</td>
                    <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{money(line.balance)}</td>
                    <td className="px-3 py-2.5 text-right"><Input value={transferAmounts[line.id] ?? ""} onChange={(event) => setTransferAmounts((prev) => ({ ...prev, [line.id]: event.target.value.replace(/[^0-9.]/g, "") }))} disabled={!on} placeholder="0.00" className="h-9 w-28 text-right tabular-nums" /></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
          <div className="mt-auto border-t border-[#efdca1] bg-[#fff6db]/70 px-4 py-2.5 text-[12.5px] font-600 text-[#856019]">{value.code} · {value.farmer} · contract {value.contract}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[12.5px]">
              <thead className="bg-[#fffaf0] text-[10.5px] font-700 uppercase tracking-wide text-[#856019]"><tr><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5">Due date</th><th className="px-3 py-2.5 text-right">Value</th></tr></thead>
              <tbody>{selectedLineRows.length ? selectedLineRows.map((line) => (
                <tr key={line.id} className="h-[57px] border-t border-line bg-[#fffaf0]/70">
                  <td className="px-3 py-2.5 text-ink">{line.debt}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{line.installment}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{line.dueDate}</td>
                  <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{money(line.value)}</td>
                </tr>
              )) : <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">Select debts above to transfer.</td></tr>}</tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
          <div className="grid gap-4 border-b border-[#cde9d5] bg-[#edf8f0] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
            <div className="text-[13px] font-700 text-[#28734b]">Destination farmer</div>
            <Field label="Farmer"><Select value={destFarmer} onChange={(next) => { setDestFarmer(next); setDestContract("") }} searchable placeholder="Select" options={DESTINATION_FARMERS.map((option) => ({ value: option.value, label: option.label }))} /></Field>
            <Field label="Contract Id"><Select value={destContract} onChange={setDestContract} disabled={!destination} placeholder="Select" options={(destination?.contracts ?? []).map((v) => ({ value: v, label: v }))} /></Field>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead className="bg-[#f5fbf6] text-[10.5px] font-700 uppercase tracking-wide text-[#28734b]"><tr><th className="px-3 py-2.5"></th><th className="px-3 py-2.5 text-right">Now</th><th className="px-3 py-2.5 text-right">After the transfer</th></tr></thead>
              <tbody>
                <tr className="border-t border-line"><td className="px-3 py-2.5 text-ink">Existing debts</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{money(destination?.existing ?? 0)}</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{money((destination?.existing ?? 0) + transferTotal)}</td></tr>
                <tr className="border-t border-line"><td className="px-3 py-2.5 text-ink">Transferred debts</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">0.00</td><td className="px-3 py-2.5 text-right font-600 tabular-nums text-brand">{money(transferTotal)}</td></tr>
                <tr className="border-t border-line"><td className="px-3 py-2.5 text-ink">Indebtedness</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{(destination?.indebtedness ?? 0).toFixed(2)}%</td><td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{afterIndebtedness.toFixed(2)}%</td></tr>
              </tbody>
            </table>
          </div>
          <div className="mt-auto border-t border-[#cde9d5] bg-[#edf8f0]/70 px-4 py-2.5 text-[12.5px] font-600 text-[#28734b]">{destination ? `${destLabel} · contract ${destContract || "—"}` : "Destination farmer · contract —"}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-[12.5px]">
              <thead className="bg-[#f5fbf6] text-[10.5px] font-700 uppercase tracking-wide text-[#28734b]"><tr><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5"><span className="inline-flex items-center gap-1">Due date*<span title="The due date can be edited for each destination debt." aria-label="The due date can be edited for each destination debt." className="inline-flex cursor-help text-current/70"><Info size={13} /></span></span></th><th className="px-3 py-2.5 text-right">Value</th></tr></thead>
              <tbody>{baseRows.length ? baseRows.map((row, i) => {
                const due = dueOverrides[i] ?? ""
                return (
                <tr key={i} className={`h-[57px] border-t border-line ${catalogue.assumed ? "bg-[#fdece0]/60" : "bg-[#f5fbf6]"}`}>
                  <td className="px-3 py-2.5 font-600 text-ink">{row.debt}</td>
                  <td className="px-3 py-2.5 tabular-nums text-ink-soft">{row.installment}</td>
                  <td className="px-3 py-2.5"><DatePicker value={due} onChange={(next) => setDueOverrides((prev) => ({ ...prev, [i]: next }))} placeholder="DD/MM/YYYY" className={`w-40 ${due.trim() ? "" : "rounded-lg ring-1 ring-[#e0a3a3]"}`} /></td>
                  <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{money(row.value)}</td>
                </tr>
                )
              }) : <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">The selected debts will land here.</td></tr>}</tbody>
            </table>
          </div>
        </div>
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
            <Select value={destDebt} onChange={setDestDebt} searchable placeholder="Select" options={DEST_DEBTS.map((option) => ({ value: option.value, label: option.label }))} />
          </div>
          <Field label="Debt group"><Input value={catalogue.group} disabled placeholder="Select the debt" /></Field>
          <Field label="Debt type"><Input value={debtType} disabled placeholder="Select the debt" /></Field>
        </div>
        <div className={`flex flex-wrap items-center gap-x-10 gap-y-3 ${specificDebt ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!specificDebt}>
          <Radio checked={group} onChange={specificDebt ? () => setMode("group") : undefined} label="Group into a single debt" />
          <div className="flex items-center gap-3 whitespace-nowrap">
            <Radio checked={split} onChange={specificDebt ? () => setMode("split") : undefined} label="Split into installments" />
            <Input value={installments} inputMode="numeric" onChange={(event) => setInstallments(event.target.value.replace(/[^0-9]/g, ""))} onBlur={() => setInstallments(String(count))} disabled={!specificDebt || !split} className="h-9 w-16 text-center tabular-nums" />
          </div>
        </div>
        {!specificDebt ? <p className="text-[12px] text-muted">Choose a specific destination debt above to group or split the transferred debts.</p> : null}
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm transfer" width="max-w-md">
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-ring bg-brand-soft/60 p-4 text-[13.5px] leading-relaxed text-ink-soft">
            <p className="font-700 text-ink">Validate this transfer?</p>
            <p className="mt-1">{money(total)} will be transferred from {originLabel} to {destLabel}.</p>
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
