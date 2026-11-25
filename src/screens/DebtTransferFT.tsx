import { useMemo, useState } from "react"
import { Check, Eye } from "../components/icons"
import { Button, Field, Pagination, Select } from "../components/ui"
import { DEBT_REQUESTS, type DebtRequest } from "./DebtTransfer"

const nodes = ["All", "Santa Cruz do Sul", "Rio Pardo", "Vera Cruz"]
const statuses = ["All", "Waiting", "Approved", "Rejected"]
const contracts: Record<string, { origin: string; destination: string }> = {
  "FT-1188": { origin: "4-1", destination: "4-2" },
  "FT-1185": { origin: "3-1", destination: "2-1" },
  "FT-1179": { origin: "2-1", destination: "1-1" },
}

export function DebtTransferFT({
  onView,
  onRequest,
  requests: requestList = DEBT_REQUESTS,
}: {
  onView: (request: DebtRequest) => void
  onRequest: () => void
  requests?: DebtRequest[]
}) {
  const [cropYear, setCropYear] = useState("2026/27")
  const [node, setNode] = useState("All")
  const [fieldTech, setFieldTech] = useState("All")
  const [status, setStatus] = useState("Waiting")
  const [page, setPage] = useState(1)
  const pageSize = 10
  const fieldTechs = [
    "All",
    ...Array.from(new Set(requestList.map((request) => request.fieldTech))),
  ]

  const requests = useMemo(
    () =>
      requestList.filter(
        (request) =>
          (node === "All" || request.node === node) &&
          (fieldTech === "All" || request.fieldTech === fieldTech) &&
          (status === "All" || request.status === status),
      ),
    [fieldTech, node, requestList, status],
  )

  const paged = requests.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Crop year">
              <Select
                value={cropYear}
                onChange={setCropYear}
                options={["2025/26", "2026/27", "2027/28"].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </Field>
            <Field label="Node">
              <Select
                value={node}
                onChange={(value) => {
                  setNode(value)
                  setPage(1)
                }}
                options={nodes.map((value) => ({ value, label: value }))}
              />
            </Field>
            <Field label="Field Technician">
              <Select
                searchable
                value={fieldTech}
                onChange={(value) => {
                  setFieldTech(value)
                  setPage(1)
                }}
                options={fieldTechs.map((value) => ({ value, label: value }))}
              />
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onChange={(value) => {
                  setStatus(value)
                  setPage(1)
                }}
                options={statuses.map((value) => ({ value, label: value }))}
              />
            </Field>
          </div>
          <Button onClick={onRequest}><Check size={16} /> New Request</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-700 text-ink">
            My Requests
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-[13px]">
            <thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="min-w-[200px] bg-[#fff6db] px-4 py-3 text-[#856019]">Origin farmer</th>
                <th className="bg-[#fff6db] px-4 py-3 text-[#856019]">Origin contract</th>
                <th className="min-w-[200px] bg-[#edf8f0] px-4 py-3 text-[#28734b]">Destination farmer</th>
                <th className="bg-[#edf8f0] px-4 py-3 text-[#28734b]">Destination contract</th>
                <th className="px-4 py-3 text-right">Debts</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="w-24 px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length ? (
                paged.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t border-line transition hover:bg-canvas/65"
                  >
                    <td className="px-4 py-3 font-700 text-brand">
                      {request.id}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-soft">
                      {request.raisedOn}
                    </td>
                    <td className="bg-[#fffaf0]/70 px-4 py-3 text-ink">
                      <span className="font-600 tabular-nums">
                        {request.originCode}
                      </span>{" "}
                      {request.originFarmer}
                    </td>
                    <td className="bg-[#fffaf0]/70 px-4 py-3 tabular-nums text-ink-soft">
                      {contracts[request.id]?.origin ?? "—"}
                    </td>
                    <td className="bg-[#f5fbf6] px-4 py-3 text-ink">
                      <span className="font-600 tabular-nums">
                        {request.destCode}
                      </span>{" "}
                      {request.destFarmer}
                    </td>
                    <td className="bg-[#f5fbf6] px-4 py-3 tabular-nums text-ink-soft">
                      {contracts[request.id]?.destination ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {request.debts}
                    </td>
                    <td className="px-4 py-3 text-right font-600 tabular-nums text-ink">
                      {request.value}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {request.status}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onView(request)}
                        aria-label={`View ${request.id}`}
                        className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-9 text-center text-muted">
                    No FT requests match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={requests.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
