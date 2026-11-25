import { useMemo, useState } from "react"
import { Eye } from "../components/icons"
import { Button, Field, Input, Pagination, Select } from "../components/ui"

export type DebtTransferReport = {
  id: string
  operation: "Transfer" | "Carry over"
  origin: string
  destination: string
  grouped: boolean
  value: string
  date: string
  processedBy: string
  status: string
  initiatedBy?: "FT" | "FA"
  fieldTechnicianComment?: string
  financeAnalystComment?: string
}

export const debtTransferReports: DebtTransferReport[] = [
  {
    id: "TR-0412",
    operation: "Transfer",
    origin: "512004 Helena Kunz · 4-1",
    destination: "448190 Manuela Wachholz · 4-1",
    grouped: true,
    value: "7,204.66",
    date: "20/08/2026 14:32",
    processedBy: "Camila Oliveira",
    status: "Completed",
    initiatedBy: "FT",
    fieldTechnicianComment: "Please split the furnace debt into 3 installments if possible — the farmer cannot take it in one.",
    financeAnalystComment: "Approved as a grouped transfer. Destination debt will remain pending documents.",
  },
  {
    id: "CO-0088",
    operation: "Carry over",
    origin: "2 farmers",
    destination: "Same farmers",
    grouped: false,
    value: "8,082.69",
    date: "20/08/2026 09:15",
    processedBy: "Rafael Bortolini",
    status: "Completed",
    initiatedBy: "FA",
    financeAnalystComment: "Carry over completed for the 2026 to 2027 crop year.",
  },
]

export function DebtTransferReports({
  onView,
}: {
  onView: (report: DebtTransferReport) => void
}) {
  const [crop, setCrop] = useState("2026/27")
  const [node, setNode] = useState("All")
  const [operation, setOperation] = useState("All")
  const [status, setStatus] = useState("All")
  const [reference, setReference] = useState("")
  const [page, setPage] = useState(1)
  const reports = useMemo(
    () =>
      debtTransferReports.filter(
        (report) =>
          (!reference ||
            report.id.toLowerCase().includes(reference.toLowerCase())) &&
          (operation === "All" || report.operation === operation) &&
          (status === "All" || report.status === status),
      ),
    [operation, reference, status],
  )
  const rows = reports.slice((page - 1) * 10, page * 10)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Crop year">
            <Select
              value={crop}
              onChange={setCrop}
              options={["2025/26", "2026/27", "2027/28"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Field>
          <Field label="Node">
            <Select
              value={node}
              onChange={setNode}
              options={["All", "Santa Cruz do Sul", "Rio Pardo"].map(
                (value) => ({ value, label: value }),
              )}
            />
          </Field>
          <Field label="Operation">
            <Select
              value={operation}
              onChange={(value) => {
                setOperation(value)
                setPage(1)
              }}
              options={["All", "Transfer", "Carry over"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onChange={(value) => {
                setStatus(value)
                setPage(1)
              }}
              options={["All", "Completed"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Field>
          <Field label="Reference">
            <Input
              value={reference}
              onChange={(event) => {
                setReference(event.target.value)
                setPage(1)
              }}
              placeholder="Search reference"
            />
          </Field>
        </div>
        <Button className="bg-[#f5822a] hover:bg-[#dc6f1c]">Export</Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-[13px]">
            <thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Operation</th>
                <th className="bg-[#fff6db] px-4 py-3 text-[#856019]">Origin farmer</th>
                <th className="bg-[#edf8f0] px-4 py-3 text-[#28734b]">Destination farmer</th>
                <th className="px-4 py-3">Grouped</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Processed by</th>
                <th className="px-4 py-3">Status</th>
                <th className="w-24 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((report) => (
                <tr
                  key={report.id}
                  className="border-t border-line transition hover:bg-canvas/65"
                >
                  <td className="px-4 py-3 font-700 text-brand">{report.id}</td>
                  <td className="px-4 py-3 text-ink">{report.operation}</td>
                  <td className="bg-[#fffaf0]/70 px-4 py-3 text-ink-soft">{report.origin}</td>
                  <td className="bg-[#f5fbf6] px-4 py-3 text-ink-soft">
                    {report.destination}
                  </td>
                  <td className="px-4 py-3">{report.grouped ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right font-600 tabular-nums text-ink">
                    {report.value}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">
                    {report.date}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{report.processedBy}</td>
                  <td className="px-4 py-3 text-ink-soft">{report.status}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onView(report)}
                      className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand"
                      aria-label={`View ${report.id}`}
                    >
                      <Eye size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={10}
          total={reports.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
