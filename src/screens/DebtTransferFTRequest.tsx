import { useState } from "react"
import { Check, X } from "../components/icons"
import { Button, Checkbox, Field, Input, Modal, Select, useToast } from "../components/ui"
import { DEBT_LINES, DESTINATION_FARMERS, type DebtLine, type DebtRequest } from "./DebtTransfer"

const originFarmers = [
  { value: "512004", label: "512004 · Helena Kunz", contracts: ["4-1", "4-2"], lineKey: "d1" },
  { value: "517330", label: "517330 · Rafael Bortolini", contracts: ["4-1"], lineKey: "d2" },
  { value: "448190", label: "448190 · Manuela Wachholz", contracts: ["4-1", "4-2"], lineKey: "d3" },
]

const money = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function DebtTransferFTRequest({ onBack, onCreated }: { onBack: () => void; onCreated: (request: DebtRequest) => void }) {
  const toast = useToast()
  const [farmerId, setFarmerId] = useState("")
  const [contract, setContract] = useState("")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [destFarmer, setDestFarmer] = useState("")
  const [destContract, setDestContract] = useState("")
  const [justification, setJustification] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const origin = originFarmers.find((farmer) => farmer.value === farmerId)
  const lines = origin ? DEBT_LINES[origin.lineKey] ?? [] : []
  const activeLines = origin && contract ? lines : []
  const destination = DESTINATION_FARMERS.find((farmer) => farmer.value === destFarmer)
  const total = activeLines.reduce((sum, line) => selected[line.id] ? sum + (Number(amounts[line.id]) || 0) : sum, 0)
  const afterIndebtedness = destination?.existing ? destination.indebtedness + (total / destination.existing) * destination.indebtedness : destination?.indebtedness ?? 0
  const ready = Boolean(origin && contract && destination && destContract && total > 0)
  const readyToConfirm = Boolean(ready && justification.trim())

  const selectLine = (line: DebtLine) => {
    setSelected((current) => ({ ...current, [line.id]: !current[line.id] }))
    setAmounts((current) => current[line.id] ? current : { ...current, [line.id]: line.balance.toFixed(2) })
  }

  const request = () => {
    if (!origin || !destination) return
    const requestId = `FT-${1200 + Math.floor(Math.random() * 700)}`
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const timestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`
    const [originCode, originFarmer] = origin.label.split(" · ")
    const [destCode, destFarmerName] = destination.label.split(" · ")
    onCreated({
      id: requestId,
      raisedBy: "FT area 410",
      raisedOn: timestamp,
      originCode,
      originFarmer,
      originContract: contract,
      destCode,
      destFarmer: destFarmerName,
      destContract,
      debts: activeLines.filter((line) => selected[line.id]).length,
      value: money(total),
      status: "Waiting",
      node: "Santa Cruz do Sul",
      fieldTech: "FT area 410",
      note: justification,
      lines: activeLines.filter((line) => selected[line.id]).map((line) => ({ ...line, balance: Number(amounts[line.id]) || line.balance })),
    })
    setConfirmOpen(false)
    toast({ tone: "success", title: "Transfer request created", body: `${money(total)} requested for ${origin.label.replace(" · ", " ")}.` })
    onBack()
  }

  return <div className="space-y-5">
    <div className="flex justify-end gap-2.5"><Button variant="outline" onClick={onBack}><X size={16} /> Cancel</Button><Button disabled={!ready} onClick={() => setConfirmOpen(true)}><Check size={16} /> Request</Button></div>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="grid gap-4 border-b border-[#efdca1] bg-[#fff6db] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end"><div className="text-[13px] font-700 text-[#856019]">Origin farmer debt</div><Field label="Farmer"><Select searchable clearable value={farmerId} onChange={(value) => { setFarmerId(value); setContract(""); setSelected({}); setAmounts({}) }} placeholder="Select" options={originFarmers.map(({ value, label }) => ({ value, label }))} /></Field><Field label="Contract Id"><Select clearable value={contract} onChange={setContract} disabled={!origin} placeholder="Select" options={(origin?.contracts ?? []).map((value) => ({ value, label: value }))} /></Field></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[12.5px]"><thead className="bg-[#fffaf0] text-[10.5px] font-700 uppercase tracking-wide text-[#856019]"><tr><th className="w-10 px-3 py-2.5">Select</th><th className="px-3 py-2.5">Debt type</th><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5">Due date</th><th className="px-3 py-2.5">Overdue</th><th className="px-3 py-2.5 text-right">Balance</th><th className="px-3 py-2.5 text-right">To transfer</th></tr></thead><tbody>{activeLines.length ? activeLines.map((line) => <tr key={line.id} className="border-t border-line"><td className="px-3 py-2.5"><Checkbox checked={Boolean(selected[line.id])} onChange={() => selectLine(line)} /></td><td className="px-3 py-2.5 text-ink-soft">{line.type}</td><td className="px-3 py-2.5 text-ink">{line.debt}</td><td className="px-3 py-2.5 text-ink-soft">{line.installment}</td><td className="px-3 py-2.5 text-ink-soft">{line.dueDate}</td><td className="px-3 py-2.5 text-ink-soft">{line.overdue ? "Yes" : "No"}</td><td className="px-3 py-2.5 text-right font-600 text-ink">{money(line.balance)}</td><td className="px-3 py-2.5 text-right"><Input disabled={!selected[line.id]} value={amounts[line.id] ?? ""} onChange={(event) => setAmounts((current) => ({ ...current, [line.id]: event.target.value.replace(/[^0-9.]/g, "") }))} className="ml-auto h-9 w-28 text-right" placeholder="0.00" /></td></tr>) : <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Select a farmer and contract to view origin farmer debts.</td></tr>}</tbody></table></div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="grid gap-4 border-b border-[#cde9d5] bg-[#edf8f0] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end"><div className="text-[13px] font-700 text-[#28734b]">Destination farmer</div><Field label="Farmer"><Select searchable clearable value={destFarmer} onChange={(value) => { setDestFarmer(value); setDestContract("") }} placeholder="Select" options={DESTINATION_FARMERS.map((farmer) => ({ value: farmer.value, label: farmer.label }))} /></Field><Field label="Contract Id"><Select clearable value={destContract} onChange={setDestContract} disabled={!destination} placeholder="Select" options={(destination?.contracts ?? []).map((value) => ({ value, label: value }))} /></Field></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-[12.5px]"><thead className="bg-[#f5fbf6] text-[10.5px] font-700 uppercase tracking-wide text-[#28734b]"><tr><th className="px-3 py-2.5"></th><th className="px-3 py-2.5 text-right">Now</th><th className="px-3 py-2.5 text-right">After the transfer</th></tr></thead><tbody><tr className="border-t border-line"><td className="px-3 py-2.5 text-ink">Existing debts</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{money(destination?.existing ?? 0)}</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{money((destination?.existing ?? 0) + total)}</td></tr><tr className="border-t border-line"><td className="px-3 py-2.5 text-ink">Transferred debts</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">0.00</td><td className="px-3 py-2.5 text-right tabular-nums text-brand">{money(total)}</td></tr><tr className="border-t border-line"><td className="px-3 py-2.5 text-ink">Indebtedness</td><td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{(destination?.indebtedness ?? 0).toFixed(2)}%</td><td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{afterIndebtedness.toFixed(2)}%</td></tr></tbody></table></div>
      </div>
    </div>

    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm transfer request" width="max-w-md">
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-ring bg-brand-soft/60 p-4 text-[13.5px] leading-relaxed text-ink-soft">
          <p className="font-700 text-ink">Send this transfer request?</p>
          <p className="mt-1">{money(total)} will be requested from {origin?.label.replace(" · ", " ")} to {destination?.label.replace(" · ", " ")}.</p>
        </div>
        <Field label="Comment / justification"><textarea value={justification} onChange={(event) => setJustification(event.target.value)} rows={4} placeholder="Describe the reason for this transfer request" className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft placeholder:text-muted/70" /></Field>
      </div>
      <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button><Button disabled={!readyToConfirm} onClick={request}><Check size={16} /> Yes, request</Button></div>
    </Modal>
  </div>
}
