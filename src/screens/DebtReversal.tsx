import { useMemo, useState } from "react"
import { Check, Info, Undo2 } from "../components/icons"
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Field,
  FieldSet,
  Input,
  Modal,
  MultiSelect,
  Select,
  useToast,
} from "../components/ui"
import { POReversal } from "./POReversal"

type ReversalType = "posting" | "payment" | "transfer" | "deposit"

const tabs: { value: ReversalType; label: string }[] = [
  { value: "posting", label: "Debt posting reversal" },
  { value: "payment", label: "Payment reversal" },
  { value: "transfer", label: "Debt transfer reversal" },
  { value: "deposit", label: "Bank deposit allocation reversal" },
]

const postingRows = [
  ["15/05/2026 08:42", "501", "Supplies invoice 416628", "117 Inputs - suppl. billing", "63915017", "416628", "-", "700.00", "Yes"],
  ["29/06/2026 14:17", "610", "Supplies discount", "117 Inputs - suppl. billing", "63915017", "416628", "-", "428.52", "No"],
  ["29/06/2026 14:19", "1", "Payment / settlement from retention", "117 Inputs - suppl. billing", "63915017", "416628", "CR-88210", "271.48", "No"],
  ["31/07/2026 09:05", "15", "Interest", "117 Inputs - suppl. billing", "63915017", "416628", "-", "12.40", "No"],
  ["31/07/2026 09:05", "14", "Monetary correction", "117 Inputs - suppl. billing", "63915017", "416628", "-", "3.18", "No"],
  ["15/05/2026 08:42", "501", "Supplies invoice 416628", "117 Inputs - suppl. billing", "63915018", "416628", "-", "260.00", "Yes"],
  ["10/07/2026 11:33", "501", "Supplies invoice 417002", "1 Billing supplies", "63915019", "417002", "-", "340.00", "No"],
]

const transferUndoRows = [
  ["1", "Amortisation after the transfer", "Debt assumed from another farmer", "21/08", "1,240.00", "Reversed first"],
  ["2", "Transfer - grouped debt zeroed", "Debt assumed from another farmer", "20/08", "7,204.66", "Farmer B"],
  ["3", "Billing supplies 1/3 restored", "Billing supplies", "20/08", "2,125.09", "Farmer A"],
  ["4", "Billing supplies 2/3 restored", "Billing supplies", "20/08", "2,125.09", "Farmer A"],
  ["5", "One block furnace restored", "One block furnace", "20/08", "2,954.48", "Farmer A"],
]

const depositUndoRows = [
  ["1", "Amortisation funded by this credit", "Billing supplies 1/3", "21/08", "1,240.00", "Debt owing again"],
  ["2", "Amortisation funded by this credit", "Billing supplies 2/3", "21/08", "860.00", "Debt owing again"],
  ["3", "Credit raised by the allocation", "Farmer B account", "20/08", "4,500.00", "Removed from the account"],
  ["4", "The deposit itself", "DEP-20418", "18/08", "4,500.00", "Back to deposits not allocated"],
]

export function DebtReversal(_props: { onOpenPOReversal?: () => void } = {}) {
  const toast = useToast()
  const [type, setType] = useState<ReversalType>("posting")
  const [reason, setReason] = useState("Supplies returned - product out of specification")
  const [reviewOpen, setReviewOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedPosting, setSelectedPosting] = useState<string | null>(null)
  const [selectedTransfer, setSelectedTransfer] = useState<string | null>(null)
  const [selectedDeposit, setSelectedDeposit] = useState<string | null>(null)

  const subject = useMemo(() => {
    if (type === "transfer") return "debt transfer TR-0412"
    if (type === "deposit") return "deposit allocation DEP-20418"
    if (type === "payment") return "payment PO-7801644"
    const title = selectedPosting ?? "63915017"
    const invoice = postingRows.find((row) => row[4] === title)?.[5] ?? "416628"
    return `title ${title}, invoice ${invoice}`
  }, [type, selectedPosting])

  const confirm = () => {
    setConfirmOpen(false)
    setReviewOpen(false)
    toast({
      tone: "success",
      title: "Reversal confirmed",
      body: `The reversal for ${subject} has been submitted.`,
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-white px-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="flex gap-7 overflow-x-auto border-b border-line">
          {tabs.map((tab) => (
            <button
            key={tab.value}
            type="button"
            onClick={() => setType(tab.value)}
            className={`relative shrink-0 py-4 text-[14px] font-700 transition after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:content-[''] ${
                type === tab.value
                  ? "text-brand after:bg-brand"
                  : "text-muted after:bg-transparent hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {type === "posting" ? (
        <PostingPanel type={type} selected={selectedPosting} setSelected={setSelectedPosting} onReverse={() => setReviewOpen(true)} />
      ) : type === "payment" ? (
        <POReversal />
      ) : type === "transfer" ? (
        <TransferPanel selected={selectedTransfer} setSelected={setSelectedTransfer} onReverse={() => setReviewOpen(true)} />
      ) : (
        <DepositPanel selected={selectedDeposit} setSelected={setSelectedDeposit} onReverse={() => setReviewOpen(true)} />
      )}

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title={`Reverse — ${subject}`} width="max-w-5xl">
        <ReviewPlan type={type} title={selectedPosting} />
        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="w-full max-w-xl"><Field label="Reason"><Input value={reason} onChange={(event) => setReason(event.target.value)} /></Field></div>
          <div className="flex shrink-0 justify-end gap-3">
          <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
          <Button onClick={() => setConfirmOpen(true)}><Check size={16} /> Confirm</Button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm reversal" width="max-w-md">
        <div className="flex gap-3 rounded-xl border border-brand-ring bg-brand-soft/60 p-4 text-[13px] leading-relaxed text-ink-soft">
          <Info size={18} className="mt-0.5 shrink-0 text-brand" />
          <p>This action will reverse the linked records for <span className="font-700 text-ink">{subject}</span> in the displayed order. This cannot be undone.</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirm}><Undo2 size={16} /> Confirm reversal</Button>
        </div>
      </Modal>
    </div>
  )
}

function PostingPanel({ type, selected, setSelected, onReverse }: { type: ReversalType; selected: string | null; setSelected: (value: string | null) => void; onReverse: () => void }) {
  const [farmer, setFarmer] = useState("512004 Farmer A")
  const [contract, setContract] = useState("4-1")
  const [cropYear, setCropYear] = useState("2027")
  const [invoice, setInvoice] = useState(type === "payment" ? "PO-7801644" : "416628")
  const [titleFilter, setTitleFilter] = useState("")
  const visiblePostingRows = postingRows.filter((row) => row[4].includes(titleFilter.trim()))
  return <>
    <FieldSet action={<ReverseButton onClick={onReverse} disabled={!selected} />}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Field label="Farmer"><FarmerSelect value={farmer} onChange={setFarmer} /></Field>
        <Field label="Contract ID"><Select value={contract} onChange={setContract} options={[{ value: "4-1", label: "4 - 1" }, { value: "4-2", label: "4 - 2" }]} /></Field>
        <Field label="Crop year"><Select value={cropYear} onChange={setCropYear} options={[{ value: "2026", label: "2026" }, { value: "2027", label: "2027" }]} /></Field>
        <Field label="Invoice"><Input value={invoice} onChange={(event) => setInvoice(event.target.value)} /></Field>
        <Field label="Title"><Input value={titleFilter} onChange={(event) => setTitleFilter(event.target.value)} placeholder="Search title" /></Field>
      </div>
    </FieldSet>
    <div className="flex items-start gap-2.5 rounded-xl border border-brand-ring bg-brand-soft/50 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
      <Info size={16} className="mt-0.5 shrink-0 text-brand" />
      <p>Select the <span className="font-700 text-ink">invoice</span> you want to reverse. The other lines are titles booked against it (discounts, settlements) and are reversed automatically together with the invoice.</p>
    </div>
    <Card className="overflow-hidden">
      <Table
        headers={["Accrual Timestamp", "History", "Description", "Debt", "Title", "Invoice", "Credit ID", "Amount", "Manual reversal"]}
        rows={visiblePostingRows}
        radio={{
          selected,
          onSelect: setSelected,
          rowId: (row) => row[4],
          canSelect: (row) => row[8] === "Yes",
          activeRow: (row) => row[4] === selected,
        }}
      />
    </Card>
  </>
}

function TransferPanel({ selected, setSelected, onReverse }: { selected: string | null; setSelected: (value: string | null) => void; onReverse: () => void }) {
  const [cropYear, setCropYear] = useState("2026/27")
  const [reference, setReference] = useState("TR-0412")
  const [farmer, setFarmer] = useState("512004 Farmer A")
  return <>
    <FieldSet action={<ReverseButton onClick={onReverse} disabled={!selected} />}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Crop year"><Select value={cropYear} onChange={setCropYear} options={[{ value: "2025/26", label: "2025/26" }, { value: "2026/27", label: "2026/27" }, { value: "2027/28", label: "2027/28" }]} /></Field>
        <Field label="Reference"><Input value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
        <Field label="Farmer"><FarmerSelect value={farmer} onChange={setFarmer} /></Field>
      </div>
    </FieldSet>
    <Card className="overflow-hidden"><Table headers={["Reference", "Operation", "Origin farmer", "Destination farmer", "Grouped", "Value", "Reversal allowed"]} rows={[["TR-0412", "Transfer", "512004 Farmer A", "448190 Farmer B", "Yes", "7,204.66", "Full only - grouped"], ["CO-0088", "Carry over", "2 farmers", "Same farmers", "No", "8,082.69", "Full or by farmer"]]} radio={{ selected, onSelect: setSelected }} /></Card>
  </>
}

function DepositPanel({ selected, setSelected, onReverse }: { selected: string | null; setSelected: (value: string | null) => void; onReverse: () => void }) {
  const [cropYear, setCropYear] = useState("2026/27")
  const [deposit, setDeposit] = useState("DEP-20418")
  const [farmer, setFarmer] = useState("448190 Farmer B")
  const [bank, setBank] = useState<string[]>(["001", "237", "341", "104"])
  return <>
    <FieldSet action={<ReverseButton onClick={onReverse} disabled={!selected} />}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Crop year"><Select value={cropYear} onChange={setCropYear} options={[{ value: "2025/26", label: "2025/26" }, { value: "2026/27", label: "2026/27" }, { value: "2027/28", label: "2027/28" }]} /></Field>
        <Field label="Deposit"><Input value={deposit} onChange={(event) => setDeposit(event.target.value)} /></Field>
        <Field label="Farmer"><FarmerSelect value={farmer} onChange={setFarmer} /></Field>
        <Field label="Bank"><MultiSelect values={bank} onChange={setBank} searchable allLabel="All banks" placeholder="Select banks" options={[{ value: "001", label: "001 - Banco do Brasil" }, { value: "237", label: "237 - Bradesco" }, { value: "341", label: "341 - Itaú Unibanco" }, { value: "104", label: "104 - Caixa Econômica Federal" }]} /></Field>
        <Field label="Deposited from"><DatePicker value="2026-08-01" onChange={() => {}} /></Field>
        <Field label="Deposited to"><DatePicker value="2026-08-31" onChange={() => {}} /></Field>
      </div>
    </FieldSet>
    <Card className="overflow-hidden"><Table headers={["Deposit", "Bank", "Deposited", "Allocated to", "Allocated on", "Amount", "Used so far", "Status"]} rows={[["DEP-20418", "Bank 001", "18/08", "448190 Farmer B", "20/08", "4,500.00", "2,100.00", "Allocated"], ["DEP-20415", "Bank 341", "17/08", "512004 Farmer A", "18/08", "1,800.00", "1,800.00", "Allocated"]]} radio={{ selected, onSelect: setSelected }} /></Card>
  </>
}

function ReverseButton({ onClick, disabled = false }: { onClick: () => void; disabled?: boolean }) {
  return <Button onClick={onClick} disabled={disabled}><Undo2 size={16} /> Reverse</Button>
}

function FarmerSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <Select value={value} onChange={onChange} searchable options={[
    { value: "512004 Farmer A", label: "512004 Farmer A" },
    { value: "448190 Farmer B", label: "448190 Farmer B" },
    { value: "517330 Rafael Bortolini", label: "517330 Rafael Bortolini" },
    { value: "601284 Helena Kunz", label: "601284 Helena Kunz" },
  ]} />
}

function Table({ headers, rows, radio }: { headers: string[]; rows: string[][]; radio?: { selected: string | null; onSelect: (value: string | null) => void; rowId?: (row: string[], index: number) => string; canSelect?: (row: string[], index: number) => boolean; activeRow?: (row: string[], index: number) => boolean } }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-[12.5px]"><thead><tr className="border-y border-line bg-brand-soft/70 text-left text-[11px] font-700 uppercase tracking-wide text-brand">{radio && <th className="w-11 px-3 py-2.5"><span className="sr-only">Select</span></th>}{headers.map((header) => <th key={header} className="whitespace-nowrap px-3 py-2.5">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => {
    const rowId = radio?.rowId ? radio.rowId(row, index) : `${row[0]}-${index}`
    const selectable = radio ? (radio.canSelect ? radio.canSelect(row, index) : true) : false
    const active = radio?.activeRow ? radio.activeRow(row, index) : radio?.selected === rowId
    return <tr key={`${rowId}-${index}`} onClick={() => selectable && radio?.onSelect(radio.selected === rowId ? null : rowId)} className={`border-b border-line last:border-0 ${selectable ? "cursor-pointer hover:bg-canvas" : ""} ${active ? "bg-brand-soft/40" : ""}`}>{radio && <td className="px-3 py-2.5">{selectable ? <input type="radio" aria-label={`Select ${row[0]}`} checked={radio.selected === rowId} readOnly className="pointer-events-none h-4 w-4 accent-brand" /> : <span className="ml-1 text-[13px] leading-none text-muted/70" title="Reversed automatically with the invoice">↳</span>}</td>}{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className={`whitespace-nowrap px-3 py-2.5 ${cellIndex === 0 ? "font-600 text-ink" : "text-ink-soft"} ${!selectable && radio ? "text-muted" : ""}`}>{headers[cellIndex] === "Manual reversal" ? <Badge tone={cell === "Yes" ? "green" : "neutral"}>{cell}</Badge> : cell}</td>)}</tr>
  })}</tbody></table></div>
}

function postingReviewRows(title: string) {
  const effect: Record<string, string> = {
    "501": "Title cancelled",
    "610": "Discount removed",
    "1": "Credit returns to the farmer",
  }
  // Linked lines for the selected title, processed in reverse of accrual order.
  return postingRows
    .filter((row) => row[4] === title)
    .slice()
    .reverse()
    .map((row, index) => [String(index + 1), row[2], row[1], row[4], row[5], row[7], effect[row[1]] ?? "Reversed"])
}

function ReviewPlan({ type, title }: { type: ReversalType; title: string | null }) {
  const rows = type === "transfer" ? transferUndoRows : type === "deposit" ? depositUndoRows : postingReviewRows(title ?? "63915017")
  const headers = type === "transfer" ? ["Step", "Posting", "Debt", "Date", "Value", "Returns to"] : type === "deposit" ? ["Step", "What is undone", "Debt or account", "Date", "Value", "Result"] : ["Step", "Posting", "History", "Title", "Invoice", "Amount", "Effect"]
  const note = type === "posting" ? "Reversing the invoice reverses every title booked against it. The system processes them in the required order." : "Review the linked records that will be reversed. The system processes them in the required order."
  return <><p className="mb-4 text-[13px] text-muted">{note}</p><Card className="overflow-hidden"><Table headers={headers} rows={rows} /></Card></>
}
