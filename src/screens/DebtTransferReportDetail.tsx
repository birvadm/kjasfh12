import { Field } from "../components/ui"
import type { DebtTransferReport } from "./DebtTransferReports"

const transferLines = [
  ["Billing supplies", "1/3", "30/06/2027", "2,125.09"],
  ["Billing supplies", "2/3", "31/10/2027", "2,125.09"],
  ["One block furnace", "-", "30/06/2027", "2,954.48"],
]
const carryLines = [
  [
    "512004",
    "Helena Kunz",
    "4-1",
    "Billing supplies",
    "1/3",
    "2,125.09",
    "2026",
    "2027",
  ],
  [
    "512004",
    "Helena Kunz",
    "4-1",
    "Billing supplies",
    "2/3",
    "2,125.09",
    "2026",
    "2027",
  ],
  [
    "517330",
    "Rafael Bortolini",
    "4-1",
    "Billing supplies",
    "-",
    "1,707.42",
    "2026",
    "2027",
  ],
]

export function DebtTransferReportDetail({
  value,
}: {
  value: DebtTransferReport
}) {
  const carry = value.operation === "Carry over"
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <h2 className="text-[16px] font-700 text-brand">
          {carry
            ? "CO-0088 Carry over · Billing, crop 2026 to 2027"
            : "TR-0412 Transfer · 512004 Helena Kunz 4-1 to 448190 Manuela Wachholz 4-1 · grouped"}
        </h2>
        <div className="mt-5">
          {carry ? <CarryTable /> : <TransferTables />}
        </div>
        <ReportComments value={value} />
        {carry ? (
          <p className="mt-5 text-[12.5px] italic text-muted">
            Destination debt code: debt transferred from the previous crop year. Installments keep their own due dates — a carry over never groups.
          </p>
        ) : null}
      </div>
    </div>
  )
}

const recapRows = [
  ["Existing debts", "9,329.75", "16,534.41"],
  ["Indebtedness", "20.13%", "35.67%"],
]
const landsOnRows = [["51 - Debt assumed", "Internal debt", "31/10/2027", "7,204.66"]]

function TransferTables() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-stretch">
      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="grid gap-4 border-b border-[#efdca1] bg-[#fff6db] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
          <div className="text-[13px] font-700 text-[#856019]">Origin farmer debt</div>
          <Field label="Farmer"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">512004 Helena Kunz</div></Field>
          <Field label="Contract Id"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">4-1</div></Field>
        </div>
        <div className="mt-auto border-t border-[#efdca1] bg-[#fff6db]/70 px-4 py-2.5 text-[12.5px] font-600 text-[#856019]">512004 · Helena Kunz · contract 4-1</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[12.5px]">
            <thead className="bg-[#fffaf0] text-[10.5px] font-700 uppercase tracking-wide text-[#856019]"><tr><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Inst.</th><th className="px-3 py-2.5">Due date</th><th className="px-3 py-2.5 text-right">Value</th></tr></thead>
            <tbody>{transferLines.map((row, i) => (
              <tr key={i} className="h-[57px] border-t border-line bg-[#fffaf0]/70">
                <td className="px-3 py-2.5 text-ink">{row[0]}</td>
                <td className="px-3 py-2.5 tabular-nums text-ink-soft">{row[1]}</td>
                <td className="px-3 py-2.5 tabular-nums text-ink-soft">{row[2]}</td>
                <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{row[3]}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="grid gap-4 border-b border-[#cde9d5] bg-[#edf8f0] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
          <div className="text-[13px] font-700 text-[#28734b]">Destination farmer</div>
          <Field label="Farmer"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">448190 Manuela Wachholz</div></Field>
          <Field label="Contract Id"><div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink">4-1</div></Field>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-[#f5fbf6] text-[10.5px] font-700 uppercase tracking-wide text-[#28734b]"><tr><th className="px-3 py-2.5"></th><th className="px-3 py-2.5 text-right">Now</th><th className="px-3 py-2.5 text-right">After the transfer</th></tr></thead>
            <tbody>{recapRows.map((row, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-3 py-2.5 text-ink">{row[0]}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{row[1]}</td>
                <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{row[2]}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-left text-[12.5px]">
            <thead className="bg-[#f5fbf6] text-[10.5px] font-700 uppercase tracking-wide text-[#28734b]"><tr><th className="px-3 py-2.5">Debt</th><th className="px-3 py-2.5">Group</th><th className="px-3 py-2.5">Due date</th><th className="px-3 py-2.5 text-right">Value</th></tr></thead>
            <tbody>{landsOnRows.map((row, i) => (
              <tr key={i} className="h-[57px] border-t border-line bg-[#f5fbf6]">
                <td className="px-3 py-2.5 font-600 text-ink">{row[0]}</td>
                <td className="px-3 py-2.5 tabular-nums text-ink-soft">{row[1]}</td>
                <td className="px-3 py-2.5 tabular-nums text-ink-soft">{row[2]}</td>
                <td className="px-3 py-2.5 text-right font-600 tabular-nums text-ink">{row[3]}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ReportComments({ value }: { value: DebtTransferReport }) {
  const requestedByFT = value.initiatedBy === "FT"
  const financeComment = value.financeAnalystComment || "Transfer reviewed and completed by Finance."

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {requestedByFT ? (
        <CommentCard
          title="Request from the Field Technician"
          tone="border-brand-soft bg-brand-soft/35 text-brand"
          comment={value.fieldTechnicianComment || "No comment provided."}
        />
      ) : null}
      <CommentCard
        title="Comment from the Finance Analyst"
        tone="border-[#d9e4f2] bg-canvas text-brand"
        comment={financeComment}
      />
    </div>
  )
}

function CommentCard({ title, tone, comment }: { title: string; tone: string; comment: string }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4">
      <h3 className={`border-b pb-2.5 text-[12.5px] font-700 ${tone}`}>{title}</h3>
      <p className="mt-3 rounded-lg border border-line bg-canvas px-3.5 py-3 text-[13px] leading-relaxed text-ink-soft">{comment}</p>
    </section>
  )
}
function CarryTable() {
  return (
    <div className="md:col-span-2">
      <ReportTable
        title="Carry over details"
        headers={[
          "Code",
          "Farmer",
          "Contract ID",
          "Debt",
          "Inst.",
          "Value",
          "Crop from",
          "Crop to",
        ]}
        rows={carryLines}
      />
    </div>
  )
}
function ReportTable({
  title,
  headers,
  rows,
  tone = "default",
}: {
  title: string
  headers: string[]
  rows: string[][]
  tone?: "default" | "origin" | "destination"
}) {
  const colors =
    tone === "origin"
      ? { title: "border-[#efdca1] bg-[#fff6db] text-[#856019]", head: "bg-[#fffaf0] text-[#856019]", body: "bg-[#fffaf0]/70" }
      : tone === "destination"
        ? { title: "border-[#cde9d5] bg-[#edf8f0] text-[#28734b]", head: "bg-[#f5fbf6] text-[#28734b]", body: "bg-brand-soft/20" }
        : { title: "border-line bg-brand-soft/50 text-brand", head: "bg-canvas text-muted", body: "" }
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className={`border-b px-4 py-3 text-[13px] font-700 ${colors.title}`}>
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-[12.5px]">
          <thead className={`text-[10.5px] font-700 uppercase tracking-wide ${colors.head}`}>
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2.5">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className={`border-t border-line ${colors.body}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-3 py-2.5 ${
                      cellIndex === row.length - 1
                        ? "font-600 tabular-nums text-ink"
                        : "text-ink-soft"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
