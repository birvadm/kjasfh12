import { useState } from "react"
import { Check, X } from "../components/icons"
import { Button, Field, Modal, useToast } from "../components/ui"
import type { DebtRequest } from "./DebtTransfer"

const money = (value: number) => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const destinationContracts: Record<string, string> = { "FT-1188": "4-2", "FT-1185": "2-1", "FT-1179": "1-1" }

export function DebtTransferFTDetail({
  value,
  onBack,
  onCancelRequest,
}: {
  value: DebtRequest
  onBack: () => void
  onCancelRequest: (request: DebtRequest) => void
}) {
  const toast = useToast()
  const [cancelOpen, setCancelOpen] = useState(false)
  const readOnly = value.status !== "Waiting"

  const cancelRequest = () => {
    toast({ tone: "info", title: "Request cancelled", body: `${value.id} has been cancelled.` })
    onCancelRequest(value)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div>
          <p className="text-[11px] font-700 uppercase tracking-wide text-muted">FT transfer request</p>
          <p className="mt-1 text-[16px] font-700 text-ink">{value.id} · raised by {value.raisedBy} on {value.raisedOn}</p>
        </div>
        <Button variant="danger" onClick={() => setCancelOpen(true)} disabled={readOnly}><X size={16} /> Cancel request</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="grid gap-4 border-b border-[#efdca1] bg-[#fff6db] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end"><div className="text-[13px] font-700 text-[#856019]">Origin farmer debt</div><Field label="Farmer"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">{value.originCode} · {value.originFarmer}</div></Field><Field label="Contract Id"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">{value.originContract}</div></Field></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-[12.5px]"><thead className="bg-[#fffaf0] text-[10.5px] font-700 uppercase tracking-wide text-[#856019]"><tr><th className="px-3 py-2.5">Debt type</th><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5">Due date</th><th className="px-3 py-2.5">Overdue</th><th className="px-3 py-2.5 text-right">Balance</th><th className="px-3 py-2.5 text-right">Requested</th></tr></thead><tbody>{value.lines.map((line) => <tr key={line.id} className="border-t border-line"><td className="px-3 py-2.5 text-ink-soft">{line.type}</td><td className="px-3 py-2.5 text-ink">{line.debt}</td><td className="px-3 py-2.5 text-ink-soft">{line.installment}</td><td className="px-3 py-2.5 text-ink-soft">{line.dueDate}</td><td className="px-3 py-2.5 text-ink-soft">{line.overdue ? "Yes" : "No"}</td><td className="px-3 py-2.5 text-right font-600 text-ink">{money(line.balance)}</td><td className="px-3 py-2.5 text-right font-600 text-ink">{money(line.balance)}</td></tr>)}</tbody></table></div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="border-b border-[#cde9d5] bg-[#edf8f0] px-4 py-3 text-[13px] font-700 text-[#28734b]">Destination farmer</div>
        <div className="grid gap-4 p-4 md:grid-cols-2"><Field label="Farmer"><div className="h-10 rounded-lg border border-line bg-canvas px-3 leading-10 text-[14px] text-ink">{value.destCode} · {value.destFarmer}</div></Field><Field label="Contract"><div className="h-10 rounded-lg border border-line bg-canvas px-3 leading-10 text-[14px] text-ink">{value.destContract ?? destinationContracts[value.id] ?? "4-1"}</div></Field></div>
        <div className="mx-4 mb-4 overflow-hidden rounded-lg border border-line"><table className="w-full text-left text-[12.5px]"><thead className="bg-[#f5fbf6] text-[10.5px] font-700 uppercase tracking-wide text-[#28734b]"><tr><th className="px-3 py-2.5"></th><th className="px-3 py-2.5 text-right">Now</th><th className="px-3 py-2.5 text-right">After the request</th></tr></thead><tbody><tr className="border-t border-line"><td className="px-3 py-2.5">Requested debts</td><td className="px-3 py-2.5 text-right">0.00</td><td className="px-3 py-2.5 text-right font-600">{value.value}</td></tr></tbody></table></div>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel request" width="max-w-md">
        <p className="text-[13.5px] leading-relaxed text-ink-soft">Cancel request <span className="font-700 text-ink">{value.id}</span>? This request will be removed from My Requests.</p>
        <Field label="Comment / justification" className="mt-4"><textarea value={value.note} readOnly rows={3} className="w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2.5 text-[14px] text-ink outline-none" /></Field>
        <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setCancelOpen(false)}>Keep request</Button><Button variant="danger" onClick={cancelRequest}><Check size={16} /> Yes, cancel request</Button></div>
      </Modal>
    </div>
  )
}
