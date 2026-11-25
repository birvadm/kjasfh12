import { useMemo, useState } from "react"
import { Check, ChevronRight, X } from "../components/icons"
import {
  Button,
  Checkbox,
  Field,
  Input,
  Modal,
  Select,
  useToast,
} from "../components/ui"
import type { DebtRequest } from "./DebtTransfer"

const debtOptions = [
  "Keep origin debt",
  "51 Debt assumed from another farmer",
  "52 Rescheduled internal debt",
]
type DebtTableRow = Pick<DebtRequest["lines"][number], "debt" | "installment" | "dueDate" | "balance">
const money = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export function DebtRequestTransferSetup({
  value,
  onBack,
  onDone,
}: {
  value: DebtRequest
  onBack: () => void
  onDone: () => void
}) {
  const toast = useToast()
  const [debt, setDebt] = useState("Keep origin debt")
  const [financeNote, setFinanceNote] = useState("")
  const [group, setGroup] = useState(false)
  const [split, setSplit] = useState(false)
  const [installments, setInstallments] = useState("3")
  const [dueOverrides, setDueOverrides] = useState<Record<number, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const count = Math.max(1, Number.parseInt(installments, 10) || 1)
  const total = value.lines.reduce((sum, line) => sum + line.balance, 0)
  const destinationRows = useMemo(() => {
    if (group)
      return [
        {
          debt: value.lines[0]?.debt ?? "Debt",
          installment: "-",
          dueDate: value.lines[0]?.dueDate ?? "",
          balance: total,
        },
      ]
    if (split)
      return Array.from({ length: count }, (_, index) => ({
        debt: value.lines[0]?.debt ?? "Debt",
        installment: `${index + 1}/${count}`,
        dueDate: value.lines[index]?.dueDate ?? value.lines[0]?.dueDate ?? "",
        balance:
          index === count - 1
            ? Number(
                (
                  total -
                  (Math.floor((total / count) * 100) / 100) * (count - 1)
                ).toFixed(2),
              )
            : Math.floor((total / count) * 100) / 100,
      }))
    return value.lines
  }, [count, group, split, total, value.lines])
  const displayedDestinationRows = destinationRows.map((row) => ({
    ...row,
    debt: debt === "Keep origin debt" ? row.debt : debt,
  }))
  const confirm = () => {
    toast({
      tone: "success",
      title: "Debt transferred",
      body: "The debt is transferred and is pending documents.",
    })
    onDone()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div>
          <p className="text-[11px] font-700 uppercase tracking-wide text-muted">
            Set up the transfer
          </p>
          <p className="mt-1 text-[16px] font-700 text-ink">
            {value.originCode} {value.originFarmer} → {value.destCode}{" "}
            {value.destFarmer}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" onClick={onBack}>
            <X size={16} /> Cancel
          </Button>
          <Button onClick={() => setConfirmOpen(true)}>
            <Check size={16} /> Confirm
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="grid gap-4 lg:grid-cols-3">
          <Field label="Debt">
            <Select
              value={debt}
              onChange={setDebt}
              searchable
              options={debtOptions.map((value) => ({ value, label: value }))}
            />
          </Field>
          <Field label="Debt group">
            <Input
              disabled
              value={debt === "Keep origin debt" ? "" : "Internal debt"}
            />
          </Field>
          <Field label="Debt type">
            <Input
              disabled
              value={debt === "Keep origin debt" ? "" : "Debt assumption"}
            />
          </Field>
        </div>
        <Field label="Finance note" className="mt-4">
          <textarea
            value={financeNote}
            onChange={(event) => setFinanceNote(event.target.value)}
            rows={3}
            placeholder="Add a finance note"
            className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft placeholder:text-muted/70"
          />
        </Field>
        <p className="mt-2 text-[11.5px] italic text-[#c07a1a]">
          If left unchanged, the origin debt is kept.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-10 gap-y-3 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <Checkbox
          checked={group}
          onChange={(next) => {
            setGroup(next)
            if (next) setSplit(false)
          }}
          label="Group into a single debt"
        />
        <div className="flex items-center gap-3">
          <Checkbox
            checked={split}
            onChange={(next) => {
              setSplit(next)
              if (next) setGroup(false)
            }}
            label="Split into"
          />
          <Input
            disabled={!split}
            value={installments}
            onChange={(event) =>
              setInstallments(event.target.value.replace(/[^0-9]/g, ""))
            }
            className="h-9 w-16 text-center"
          />
          <span className="text-[13.5px] text-ink-soft">installments</span>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <DebtTable
          title={`Selected on ${value.originCode} ${value.originFarmer}`}
          rows={value.lines}
        />
        <DebtTable
          title={`Lands on ${value.destCode} ${value.destFarmer}`}
          rows={displayedDestinationRows}
          destination
          dueOverrides={dueOverrides}
          onDueChange={(index, dueDate) => setDueOverrides((current) => ({ ...current, [index]: dueDate }))}
        />
      </div>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm transfer" width="max-w-md">
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-ring bg-brand-soft/60 p-4 text-[13.5px] leading-relaxed text-ink-soft">
            <p className="font-700 text-ink">Validate this transfer?</p>
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
          <Button onClick={confirm}><Check size={16} /> Yes, confirm</Button>
        </div>
      </Modal>
    </div>
  )
}

function DebtTable({
  title,
  rows,
  destination = false,
  dueOverrides = {},
  onDueChange,
}: {
  title: string
  rows: DebtTableRow[]
  destination?: boolean
  dueOverrides?: Record<number, string>
  onDueChange?: (index: number, dueDate: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
      <div className={`flex items-center gap-2 border-b px-4 py-3 text-[13px] font-700 ${destination ? "border-[#cde9d5] bg-[#edf8f0] text-[#28734b]" : "border-[#efdca1] bg-[#fff6db] text-[#856019]"}`}>
        {destination ? <ChevronRight size={16} /> : null}
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] text-left text-[12.5px]">
          <thead className={`text-[10.5px] font-700 uppercase tracking-wide ${destination ? "bg-[#f5fbf6] text-[#28734b]" : "bg-[#fffaf0] text-[#856019]"}`}>
            <tr>
              <th className="px-3 py-2.5">Debt</th>
              <th className="px-3 py-2.5">Inst.</th>
              <th className="px-3 py-2.5">Due date</th>
              <th className="px-3 py-2.5 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((line, index) => (
              <tr
                key={`${line.debt}-${index}`}
                className={`border-t border-line ${destination ? "bg-brand-soft/20" : "bg-[#fffaf0]/70"}`}
              >
                <td className="px-3 py-2.5 text-ink">{line.debt}</td>
                <td className="px-3 py-2.5 text-ink-soft">
                  {line.installment}
                </td>
                <td className="px-3 py-2.5 text-ink-soft">
                  {destination ? <Input value={dueOverrides[index] ?? line.dueDate} onChange={(event) => onDueChange?.(index, event.target.value)} className="h-9 w-32 tabular-nums" /> : line.dueDate}
                </td>
                <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">
                  {money(line.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
