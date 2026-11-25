import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, RefreshCw, ArrowLeftRight, Wrench, X, AlertTriangle, Boxes, Check, History, Link2 as LinkIcon, ShieldCheck, ChevronLeft, ChevronRight, Coins, Clock, Copy, Eye, ExternalLink, FileText, Pencil, Play, Plus, Receipt, RotateCcw, Search, Send, Truck, Printer, Mail } from "../components/icons"
import { Badge, Button, Card, Checkbox, DatePicker, DateRangePicker, Field, Input, Modal, MultiSelect, Select, useToast } from "../components/ui"
import { TobaccoCreditLog } from "./TobaccoCreditLog"
import sampleInvoice from "../assets/invoice-danfe-sample.pdf?url"

export type TobaccoCrumb = { label: string; onClick?: () => void }

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

type LoadStatus = "Action needed" | "In progress" | "Released" | "Contingency"
type ColumnSet = "entry" | "returned" | "overprice"
type Load = {
  id: string; date: string; unit: string; crop: string; type: string; transporter: string; plate: string; masters: number; loadTime: string
  entry: { ret: number; generated: number; sent: number; authorized: number; credit: number; analysis: number; issued: number }
  returned: { farmers: number; generated: number; sent: number; authorized: number; issued: number; kg: number }
  overprice: { eligible: number; generated: number; sent: number; authorized: number; issued: number; amount: number }
  exceptions: number; status: LoadStatus
}
const ld = (id: string, transporter: string, plate: string, masters: number, e: number[], r: number[], o: number[], exceptions: number, status: LoadStatus, loadTime: string, type = "Common"): Load => ({
  id, date: "2026-09-29", unit: "Unit 03", crop: "2026/2027", type, transporter, plate, masters, loadTime,
  entry: { ret: e[0], generated: e[1], sent: e[2], authorized: e[3], credit: e[4], analysis: e[5], issued: e[6] },
  returned: { farmers: r[0], generated: r[1], sent: r[2], authorized: r[3], issued: r[4], kg: r[5] },
  overprice: { eligible: o[0], generated: o[1], sent: o[2], authorized: o[3], issued: o[4], amount: o[5] },
  exceptions, status,
})
const LOADS: Load[] = [
  ld("LOAD-0029114", "TRP-1204", "GHI7J89", 31, [3, 27, 27, 26, 26, 26, 26], [2, 2, 2, 2, 2, 1840], [6, 6, 6, 5, 5, 3120], 4, "Action needed", "5:40"),
  ld("LOAD-0029115", "TRP-1204", "GHI7J89", 18, [0, 18, 18, 18, 18, 18, 18], [0, 0, 0, 0, 0, 0], [3, 3, 3, 3, 3, 1450], 0, "Released", "4:12"),
  ld("LOAD-0029118", "TRP-0876", "KLM1N23", 12, [1, 12, 12, 10, 10, 10, 10], [1, 1, 1, 1, 1, 620], [2, 2, 2, 2, 2, 980], 0, "In progress", "4:55"),
  ld("LOAD-0029121", "TRP-3310", "PQR4S56", 24, [0, 24, 24, 23, 23, 23, 23], [0, 0, 0, 0, 0, 0], [4, 4, 4, 4, 4, 2210], 1, "Action needed", "5:05"),
  ld("LOAD-0029126", "TRP-0876", "KLM1N23", 9, [0, 9, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], 0, "Contingency", "3:48", "Virginia"),
  ld("LOAD-0029133", "TRP-3310", "PQR4S56", 14, [0, 14, 14, 14, 14, 14, 14], [1, 1, 1, 1, 1, 410], [2, 2, 2, 2, 2, 760], 0, "In progress", "4:30"),
  ld("LOAD-0029130", "TRP-5402", "TUV7W89", 16, [2, 16, 16, 16, 16, 16, 16], [2, 2, 2, 2, 2, 1310], [1, 1, 1, 1, 1, 540], 0, "Released", "5:12"),
]

type ExCategory = "Validation" | "Authority" | "Integration"
type ExceptionRow = { id: string; load: string; date: string; farmer: string; invoice: string; category: ExCategory; source: string; code: string; description: string; responsible: string; agingMin: number; reprocess: boolean; action: string; status: "Open" | "Resolved" }
const EXCEPTIONS: ExceptionRow[] = [
  { id: "EXC-0004412", load: "LOAD-0029114", date: "2026-09-29", farmer: "Farmer 00052107", invoice: "", category: "Validation", source: "Master data", code: "AG-118", description: "Plot not registered", responsible: "Growing", agingMin: 72, reprocess: true, action: "Register plot", status: "Open" },
  { id: "EXC-0004413", load: "LOAD-0029114", date: "2026-09-29", farmer: "Farmer 00052118", invoice: "771404", category: "Authority", source: "Comply return", code: "233", description: "Rejected - registration not found", responsible: "Fiscal", agingMin: 48, reprocess: true, action: "Correct, resend", status: "Open" },
  { id: "EXC-0004414", load: "LOAD-0029114", date: "2026-09-29", farmer: "Farmer 00052140", invoice: "", category: "Validation", source: "Load closing", code: "QT-004", description: "Declared 24, purchased 22", responsible: "Supply", agingMin: 65, reprocess: true, action: "Load closing", status: "Open" },
  { id: "EXC-0004415", load: "LOAD-0029114", date: "2026-09-29", farmer: "Farmer 00052133", invoice: "771407", category: "Integration", source: "Interface 1377", code: "PO-TMO", description: "PO return not received", responsible: "Integration", agingMin: 52, reprocess: true, action: "Interface alert", status: "Open" },
  { id: "EXC-0004402", load: "LOAD-0029121", date: "2026-09-29", farmer: "Farmer 00052244", invoice: "771388", category: "Authority", source: "Authorization", code: "301", description: "Denied - fiscal irregularity", responsible: "Fiscal", agingMin: 200, reprocess: false, action: "Reissue only", status: "Open" },
]

type OverConfig = { id: string; crop: string; type: string; node: string; refClass: string; internal: string; sap: string; from: string; to: string; maxPrice: number; maxFarmer: number | null; status: "Active" | "Inactive" }
const CONFIGS: OverConfig[] = [
  { id: "c1", crop: "2026/2027", type: "Virginia", node: "GT 04", refClass: "B01", internal: "B01-INT", sap: "20000855", from: "2026-09-01", to: "2027-02-28", maxPrice: 26, maxFarmer: 50000, status: "Active" },
  { id: "c2", crop: "2026/2027", type: "Virginia", node: "GT 04", refClass: "B02", internal: "B02-INT", sap: "20000856", from: "2026-09-01", to: "2027-02-28", maxPrice: 22, maxFarmer: 50000, status: "Active" },
  { id: "c3", crop: "2026/2027", type: "Burley", node: "GT 07", refClass: "B01", internal: "B01-INT", sap: "20000855", from: "2026-09-01", to: "2027-02-28", maxPrice: 24.5, maxFarmer: null, status: "Inactive" },
]

const opts = (v: string[]) => v.map((value) => ({ value, label: value }))
const fmt = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "-")
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const th = "px-3 py-3 whitespace-nowrap"
const td = "px-3 py-3 whitespace-nowrap"

const STATUS_STYLE: Record<LoadStatus, string> = {
  "Action needed": "bg-[#fdecec] text-[#c23b3b] border-[#f4c9c9]",
  "In progress": "bg-[#fdf3e0] text-[#9a6a12] border-[#f2ddb3]",
  Released: "bg-[#e8f6ee] text-[#1a7a45] border-[#bfe6cf]",
  Contingency: "bg-[#f1edfb] text-[#5b3fa8] border-[#d9cff3]",
}
function StatusPill({ s }: { s: LoadStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-600 ${STATUS_STYLE[s]}`}>{s}</span>
}

function TabStrip<T extends string>({ tabs, value, onChange, right }: { tabs: { key: T; label: string }[]; value: T; onChange: (t: T) => void; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line">
      <div className="flex flex-wrap items-center gap-6">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => onChange(t.key)} className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${value === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>{t.label}</button>
        ))}
      </div>
      {right && <div className="flex items-center gap-2.5 pb-2">{right}</div>}
    </div>
  )
}

function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { key: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-full bg-canvas p-1" role="tablist">
      {items.map((i) => (
        <button key={i.key} type="button" role="tab" aria-selected={value === i.key} onClick={() => onChange(i.key)}
          className={`rounded-full px-4 py-1.5 text-[13px] font-700 transition ${value === i.key ? "bg-white text-brand shadow-[0_1px_3px_rgba(15,30,61,0.15)]" : "text-muted hover:text-ink"}`}>{i.label}</button>
      ))}
    </div>
  )
}

function TableCard({ children, minWidth = 1100, header, maxHeight }: { children: React.ReactNode; minWidth?: number; header?: React.ReactNode; maxHeight?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
      {header}
      <div className={maxHeight ? "overflow-auto" : "overflow-x-auto"} style={maxHeight ? { maxHeight } : undefined}><table className="w-full text-left text-[13px]" style={{ minWidth }}>{children}</table></div>
    </div>
  )
}
function Head({ cols, right = [] }: { cols: string[]; right?: string[] }) {
  return (
    <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
      <tr>{cols.map((c, i) => <th key={c + i} className={`${th} ${right.includes(c) ? "text-right" : ""}`}>{c}</th>)}</tr>
    </thead>
  )
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

type Tab = "control" | "exceptions" | "documents" | "contingency"
const TABS: { key: Tab; label: string }[] = [
  // Exceptions tab hidden for now: exceptions are worked inside the load view.
  { key: "control", label: "Control room" }, { key: "documents", label: "Documents" }, { key: "contingency", label: "Contingency" },
]

export default function TobaccoPurchase({ onCrumbs }: { onCrumbs?: (c: TobaccoCrumb[]) => void } = {}) {
  const [tab, setTab] = useState<Tab>("control")
  const [loads, setLoads] = useState<Load[]>(LOADS)
  const [exLoad, setExLoad] = useState<string>("All")
  const [detail, setDetail] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<string | null>(null)
  // Reversal is started from the load view with the selected invoices.
  const [reverse, setReverse] = useState<{ load: Load; invoices: string[] } | null>(null)
  const [revHistory, setRevHistory] = useState(false)
  const [paLog, setPaLog] = useState<string | null>(null)
  const [timeline, setTimeline] = useState(false)
  const [exFocus, setExFocus] = useState(false)

  useEffect(() => {
    if (reverse) {
      const out = () => { setReverse(null); setRevHistory(false); setDetail(null) }
      onCrumbs?.([{ label: "Tobacco buying", onClick: () => { out(); setTab("control") } }, { label: "Control room", onClick: out },
        { label: reverse.load.id, onClick: () => { setReverse(null); setRevHistory(false) } },
        revHistory ? { label: "Reversal", onClick: () => setRevHistory(false) } : { label: "Reversal" }, ...(revHistory ? [{ label: "Reversal history" }] : [])]); return
    }
    if (detail && timeline) { onCrumbs?.([{ label: "Tobacco buying", onClick: () => { setTimeline(false); setDetail(null); setTab("control") } }, { label: "Control room", onClick: () => { setTimeline(false); setDetail(null) } }, { label: detail, onClick: () => setTimeline(false) }, { label: "Timeline" }]); return }
    if (detail && paLog) { onCrumbs?.([{ label: "Tobacco buying", onClick: () => { setPaLog(null); setDetail(null); setTab("control") } }, { label: "Control room", onClick: () => { setPaLog(null); setDetail(null) } }, { label: detail, onClick: () => setPaLog(null) }, { label: "Payment analysis log" }, { label: paLog }]); return }
    if (detail && invoice) { onCrumbs?.([{ label: "Tobacco buying", onClick: () => { setInvoice(null); setDetail(null); setTab("control") } }, { label: "Control room", onClick: () => { setInvoice(null); setDetail(null) } }, { label: detail, onClick: () => setInvoice(null) }, { label: `Invoice - ${invoice}` }]); return }
    if (detail) { onCrumbs?.([{ label: "Tobacco buying", onClick: () => { setDetail(null); setTab("control") } }, { label: "Control room", onClick: () => setDetail(null) }, { label: detail }]); return }
    const label = TABS.find((t) => t.key === tab)!.label
    onCrumbs?.([{ label: "Tobacco buying", onClick: () => setTab("control") }, { label }])
  }, [tab, detail, invoice, reverse, revHistory, paLog, timeline, onCrumbs])
  useEffect(() => () => onCrumbs?.([]), [onCrumbs])

  const dl = detail ? loads.find((l) => l.id === detail) : undefined
  const inv = dl && invoice ? FARMER_DOCS.find((d) => d.invoice === invoice) : undefined
  const paDoc = dl && paLog ? FARMER_DOCS.find((d) => d.farmer === paLog) : undefined
  if (dl && paDoc) {
    const code = paDoc.farmer.replace(/\D/g, "")
    return <TobaccoCreditLog onBack={() => setPaLog(null)} ctx={{
      farmer: paDoc.farmer, farmerId: `1120${code}`, contract: paDoc.contract, contractId: `1120${paDoc.contract.replace(/\D/g, "")}`,
      invoice: paDoc.invoice, amount: paDoc.amount, crop: dl.crop, tobacco: dl.type, region: "SUL", segment: "Gold",
      date: dl.date.split("-").reverse().join("/"), load: dl.id,
    }} />
  }
  if (dl && timeline) return <LoadTimeline load={dl} onBack={() => setTimeline(false)} />
  if (reverse && revHistory) return <ReversalHistory />
  if (dl && inv) return <InvoiceItems load={dl} doc={inv} />
  if (dl) return <LoadDetail load={dl} onHistory={() => { setReverse({ load: dl, invoices: [] }); setRevHistory(true) }} onInvoice={setInvoice} onPaymentAnalysis={setPaLog} onTimeline={() => setTimeline(true)} focusExceptions={exFocus} />

  return (
    <div className="space-y-5">
      <TabStrip<Tab> tabs={TABS} value={tab} onChange={setTab} />
      {tab === "control" && <ControlRoom loads={loads} setLoads={setLoads} onView={(id) => { setExFocus(false); setDetail(id) }} onExceptions={(id) => { setExFocus(true); setDetail(id) }} />}
      {tab === "exceptions" && <Exceptions load={exLoad} setLoad={setExLoad} />}
      {tab === "documents" && <Documents />}
      {tab === "contingency" && <AuthorityParams />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Control room                                                        */
/* ------------------------------------------------------------------ */

type CFilters = { from: string; to: string; crop: string; unit: string; transporter: string; plate: string; type: string; load: string; status: string; stage: string }
const C_DEFAULT: CFilters = { from: "2026-09-29", to: "2026-09-29", crop: "2026/2027", unit: "Unit 03", transporter: "All", plate: "All", type: "All", load: "", status: "All", stage: "All" }
const STAGES = ["All", "Generated", "Sent", "Authorized", "Credit", "Analysis", "Issued"]

function ControlRoom({ loads, setLoads, onView, onExceptions }: { loads: Load[]; setLoads: (f: (l: Load[]) => Load[]) => void; onView: (id: string) => void; onExceptions: (id: string) => void }) {
  const toast = useToast()
  const [f, setF] = useState<CFilters>(C_DEFAULT)
  const [set, setSet] = useState<ColumnSet>("entry")
  const up = <K extends keyof CFilters>(k: K) => (v: CFilters[K]) => setF((s) => ({ ...s, [k]: v }))

  const q = f.load.trim().toLowerCase()
  const rows = loads.filter((l) =>
    (!f.from || l.date >= f.from) && (!f.to || l.date <= f.to) && l.crop === f.crop && (f.unit === "All" || l.unit === f.unit) &&
    (f.transporter === "All" || l.transporter === f.transporter) && (f.plate === "All" || l.plate === f.plate) &&
    (f.type === "All" || l.type === f.type) && (!q || l.id.toLowerCase().includes(q)) &&
    (f.status === "All" || l.status === f.status) &&
    (f.stage === "All" || stuckAt(l) === f.stage) &&
    (set === "entry" || (set === "returned" ? l.returned.farmers > 0 : l.overprice.eligible > 0)),
  )

  const kpis = [
    { label: "Loads today", value: String(rows.length), icon: Boxes, chip: "bg-brand-soft text-brand" },
    { label: "Invoices issued", value: String(rows.reduce((n, l) => n + l.entry.issued, 0)), icon: Check, chip: "bg-[#edf8f1] text-[#187247]" },
    { label: "Waiting on the authority", value: String(rows.reduce((n, l) => n + (l.entry.sent - l.entry.authorized > 0 && l.status === "In progress" ? l.entry.sent - l.entry.authorized : 0), 0)), icon: Clock, chip: "bg-[#fff6e5] text-[#9a6a12]" },
    { label: "Open exceptions", value: String(rows.reduce((n, l) => n + l.exceptions, 0)), icon: AlertTriangle, chip: "bg-[#fdecec] text-[#c23b3b]" },
    { label: "PO over 30 min", value: String(rows.filter((l) => l.id === "LOAD-0029121").length), icon: Send, chip: "bg-[#fdecec] text-[#c23b3b]" },
    { label: "Average load time", value: avgTime(rows), icon: Clock, chip: "bg-canvas text-ink-soft" },
  ]

  const cols: Record<"entry", { cols: string[]; cells: (l: Load) => React.ReactNode[] }> = {
    entry: {
      cols: ["Masters", "Ret.", "Generated", "Sent", "Authorized", "Credit", "Analysis", "Issued"],
      cells: (l) => { const e = l.entry; return [num(l.masters), e.ret ? num(e.ret) : dash(), ...stageCells([e.generated, e.sent, e.authorized, e.credit, e.analysis, e.issued], l.status)] },
    },
  }
  // Invoice type only filters the loads; the table always shows the entry columns.
  const c = cols.entry

  const icon = "inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted"

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="flex items-center gap-3 p-4">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.chip}`}><k.icon size={18} /></span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-500 text-muted">{k.label}</p>
              <p className="mt-0.5 text-[22px] font-800 leading-tight text-ink tabular-nums">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid flex-1 grid-cols-1 items-end gap-3 sm:grid-cols-4 xl:grid-cols-8">
            <Field label="Load">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input value={f.load} onChange={(e) => up("load")(e.target.value)} placeholder="Load number" className="pl-9" />
              </div>
            </Field>
            <Field label="Transporter"><Select value={f.transporter} onChange={up("transporter")} options={opts(["All", ...new Set(loads.map((l) => l.transporter))])} /></Field>
            <Field label="License plate"><Select value={f.plate} onChange={up("plate")} options={opts(["All", ...new Set(loads.map((l) => l.plate))])} /></Field>
            <Field label="Crop year"><Select value={f.crop} onChange={up("crop")} options={opts(["2026/2027", "2025/2026"])} /></Field>
            <Field label="Date"><DateRangePicker from={f.from} to={f.to} onChange={(r) => setF((s) => ({ ...s, ...r }))} /></Field>
            <Field label="Invoice type"><Select value={set} onChange={(v) => setSet(v as ColumnSet)} options={[{ value: "entry", label: "Entry" }, { value: "returned", label: "Returned" }, { value: "overprice", label: "Overprice" }]} /></Field>
            <Field label="Unit"><Select value={f.unit} onChange={up("unit")} options={opts(["All", "Unit 01", "Unit 02", "Unit 03"])} /></Field>
            <Field label="Status"><Select value={f.status} onChange={up("status")} options={opts(["All", "Action needed", "In progress", "Released", "Contingency"])} /></Field>
          </div>
        </div>
      </Card>

      <TableCard minWidth={1240} header={
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <p className="text-[14px] font-800 text-ink">Loads <span className="ml-1 font-600 text-muted">{rows.length}</span></p>
          </div>
        </div>
      }>
        <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
          <tr>
            {["Load", "Transporter", "License plate", ...c.cols, "Exceptions", "Status"].map((h) => <th key={h} className={th}>{h}</th>)}
            <th className={`${th} text-center`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            return (
              <tr key={l.id} className="border-t border-line transition hover:bg-canvas/60">
                <td className={td}><button type="button" onClick={(e) => { e.stopPropagation(); onView(l.id) }} className="font-700 text-brand hover:underline">{l.id}</button></td>
                <td className={td}>{l.transporter}</td>
                <td className={td}>{l.plate}</td>
                {c.cells(l).map((cell, i) => <td key={i} className={td}>{cell}</td>)}
                <td className={td}>{l.exceptions ? <button type="button" title={`View ${l.exceptions} exception${l.exceptions === 1 ? "" : "s"} of ${l.id}`} onClick={(e) => { e.stopPropagation(); onExceptions(l.id) }} className="group inline-flex h-7 items-center gap-1 rounded-full border border-[#f4c9c9] bg-[#fdecec] pl-2 pr-1.5 text-[12px] font-700 text-[#c23b3b] shadow-[0_1px_1px_rgba(194,59,59,0.08)] transition hover:border-[#c23b3b] hover:bg-[#fbdede] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fdecec]"><AlertTriangle size={12} /><span className="tabular-nums">{l.exceptions}</span><span className="text-[11.5px] font-600">View</span><ChevronRight size={13} className="transition group-hover:translate-x-0.5" /></button> : dash()}</td>
                <td className={td}><StatusPill s={l.status} /></td>
                <td className={`${td} text-center`}>
                  <div className="inline-flex items-center gap-0.5">
                    <button type="button" title="View load" aria-label={`View ${l.id}`} onClick={(e) => { e.stopPropagation(); onView(l.id) }} className={icon}><Eye size={15} /></button>
                  </div>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr className="border-t border-line"><td colSpan={c.cols.length + 6} className="px-3 py-10 text-center text-muted">No loads match the filters.</td></tr>}
        </tbody>
      </TableCard>

    </div>
  )
}

const dash = () => <span className="text-muted">-</span>
const num = (v: number | string) => <span className="tabular-nums">{v}</span>
/** Highlights the first stage that is behind the one before it, so the bottleneck stands out. */
function stageCells(vals: number[], status: LoadStatus) {
  let flagged = false
  return vals.map((v, i) => {
    const behind = i > 0 && v < vals[i - 1] && !flagged
    if (behind) flagged = true
    const tone = behind ? (status === "In progress" ? "bg-[#fdf3e0] text-[#9a6a12]" : status === "Contingency" ? "bg-[#f1edfb] text-[#5b3fa8]" : "") : ""
    return tone ? <span className={`inline-flex rounded-md px-2 py-0.5 font-700 tabular-nums ${tone}`}>{v}</span> : <span className="tabular-nums">{v}</span>
  })
}
function stuckAt(l: Load) {
  const e = l.entry
  const seq: [string, number][] = [["Generated", e.generated], ["Sent", e.sent], ["Authorized", e.authorized], ["Credit", e.credit], ["Analysis", e.analysis], ["Issued", e.issued]]
  for (let i = 1; i < seq.length; i++) if (seq[i][1] < seq[i - 1][1]) return seq[i][0]
  return ""
}
function avgTime(rows: Load[]) {
  if (!rows.length) return "-"
  const secs = rows.reduce((n, l) => { const [m, s] = l.loadTime.split(":").map(Number); return n + m * 60 + s }, 0) / rows.length
  return `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, "0")}`
}

/* ------------------------------------------------------------------ */
/* Exceptions                                                          */
/* ------------------------------------------------------------------ */

const CAT_TONE: Record<ExCategory, { cell: string; rail: string; text: string }> = {
  Validation: { cell: "bg-[#fdecec] text-[#c23b3b]", rail: "border-l-[#c23b3b]", text: "text-[#c23b3b]" },
  Authority: { cell: "bg-[#fdecec] text-[#c23b3b]", rail: "border-l-[#c23b3b]", text: "text-[#c23b3b]" },
  Integration: { cell: "bg-[#fdf3e0] text-[#9a6a12]", rail: "border-l-[#d99a1e]", text: "text-[#9a6a12]" },
}
const aging = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} m`
type EFilters = { load: string; category: string; area: string; code: string; date: string; status: string }

function Exceptions({ load, setLoad }: { load: string; setLoad: (v: string) => void }) {
  return <ExceptionQueue load={load} setLoad={setLoad} />
}

/* Where each exception is corrected: the icon tells the user which screen they are sent to. */
const FIX_DEST: Record<ExCategory, { label: string; to: string }> = {
  Validation: { label: "Resolve validation issue", to: "Load closing / Growing team" },
  Authority: { label: "Send to fiscal team", to: "Fiscal team" },
  Integration: { label: "Send to ITC support", to: "ITC support" },
}

/* For screens the user may not have access to: send a note and attachments to whoever corrects it. */
function CorrectionModal({ e, onClose }: { e: ExceptionRow; onClose: () => void }) {
  const toast = useToast()
  const to = FIX_DEST[e.category].to
  const [msg, setMsg] = useState("")
  const [files, setFiles] = useState<File[]>([])
  return (
    <Modal open onClose={onClose} title={`Correct ${e.id}`}>
      <div className="rounded-xl border border-line bg-canvas/60 px-4 py-3 text-[13px] text-ink-soft">
        <b className="text-ink">{e.code}</b> {e.description} · {e.load}{e.invoice ? ` · Invoice ${e.invoice}` : ""}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4">
        <Field label="Send to"><Input value={to} disabled /></Field>
        <Field label="Message">
          <textarea value={msg} onChange={(ev) => setMsg(ev.target.value)} rows={5} placeholder="Describe what needs to be corrected"
            className="w-full resize-y rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition placeholder:text-muted focus:border-brand" />
        </Field>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 py-2 text-[13px] font-600 text-ink transition hover:bg-canvas">
            <Plus size={15} /> Attach files
            <input type="file" multiple className="hidden" onChange={(ev) => { setFiles((f) => [...f, ...Array.from(ev.target.files ?? [])]); ev.target.value = "" }} />
          </label>
          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2 text-ink"><FileText size={14} className="shrink-0 text-muted" /><span className="truncate">{f.name}</span></span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} className="text-muted hover:text-ink"><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!msg.trim()} onClick={() => { toast({ tone: "success", title: `Sent to ${to}`, body: `${e.id}${files.length ? ` with ${files.length} attachment${files.length > 1 ? "s" : ""}` : ""}.` }); onClose() }}><Send size={15} /> Send</Button>
      </div>
    </Modal>
  )
}

/* Placeholder farmer register, opened from a Registration exception. */
function FarmerRegister({ e, onBack }: { e: ExceptionRow; onBack: () => void }) {
  const toast = useToast()
  const [plot, setPlot] = useState("")
  const [area, setArea] = useState("")
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack}><ChevronLeft size={16} /> Back to exceptions</Button>
        <Button disabled={!plot || !area} onClick={() => { toast({ tone: "success", title: "Plot registered", body: `${e.farmer} can be reprocessed in ${e.load}.` }); onBack() }}><Check size={16} /> Save registration</Button>
      </div>
      <div className="flex items-start gap-2.5 rounded-xl border border-[#f4c9c9] bg-[#fdf3f3] px-4 py-3 text-[13px] text-ink-soft">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#c23b3b]" />
        <span><b className="text-ink">{e.id} · {e.code}</b> {e.description} in {e.load}. Register the missing data, then reprocess the exception.</span>
      </div>
      <Card className="p-5">
        <p className="text-[12px] font-700 uppercase tracking-[0.08em] text-brand">Farmer register</p>
        <h2 className="mt-1 text-[20px] font-800 text-ink">{e.farmer}</h2>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
          {[["Tax id", "***.103.***-**"], ["Unit", "Unit 03"], ["Field technician", "User 5102"], ["Crop", "2026/2027"], ["Municipality", "Santa Cruz do Sul / RS"], ["Contract", "CTR-118402"], ["Status", "Active"], ["Registered plots", "1"]].map(([k, v]) => (
            <div key={k}><p className="text-[12.5px] font-500 text-muted">{k}</p><p className="mt-0.5 text-[14px] font-600 text-ink">{v}</p></div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="text-[15px] font-800 text-ink">New plot</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-[760px]">
          <Field label="Plot code"><Input value={plot} onChange={(ev) => setPlot(ev.target.value)} placeholder="PLT-0002" /></Field>
          <Field label="Area (ha)"><Input type="number" min={0} value={area} onChange={(ev) => setArea(ev.target.value)} placeholder="2.5" /></Field>
          <Field label="Tobacco type"><Input value="Virginia" disabled /></Field>
        </div>
      </Card>
    </div>
  )
}

function ExceptionQueue({ load, setLoad }: { load: string; setLoad: (v: string) => void }) {
  const [fix, setFix] = useState<ExceptionRow | null>(null)
  const [note, setNote] = useState<ExceptionRow | null>(null)
  const toast = useToast()
  const [f, setF] = useState<Omit<EFilters, "load">>({ category: "All", area: "All", code: "", date: "2026-09-29", status: "Open" })
  const up = (k: keyof Omit<EFilters, "load">) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const rows = EXCEPTIONS.filter((e) =>
    (load === "All" || e.load === load) && (f.category === "All" || e.category === f.category) && (f.area === "All" || e.responsible === f.area) &&
    (!f.code || e.code === f.code) && (!f.date || e.date === f.date) && (f.status === "All" || e.status === f.status))
  const [sel, setSel] = useState<string | null>(null)
  const s = rows.find((e) => e.id === sel) ?? rows[0]
  const count = (c: ExCategory) => rows.filter((e) => e.category === c).length
  const oldest = rows.reduce((n, e) => Math.max(n, e.agingMin), 0)
  const avg = rows.length ? Math.round(rows.reduce((n, e) => n + e.agingMin, 0) / rows.length) : 0
  const tiles: { label: string; value: string; icon: typeof Clock; chip: string }[] = [
    { label: "Validation", value: String(count("Validation")), icon: Boxes, chip: "bg-brand-soft text-brand" },
    { label: "Authority", value: String(count("Authority")), icon: ShieldCheck, chip: "bg-[#fdecec] text-[#c23b3b]" },
    { label: "Integration", value: String(count("Integration")), icon: LinkIcon, chip: "bg-[#f1edfb] text-[#5b3fa8]" },
    { label: "Oldest waiting", value: rows.length ? aging(oldest) : "-", icon: AlertTriangle, chip: oldest >= 120 ? "bg-[#fdecec] text-[#c23b3b]" : "bg-canvas text-ink-soft" },
    { label: "Average age", value: rows.length ? aging(avg) : "-", icon: Clock, chip: "bg-canvas text-ink-soft" },
  ]
  const act = (title: string, body: string) => toast({ tone: "info", title, body })
  /* Each category is corrected where the problem lives: Growing, the fiscal team / SEFAZ, load closing or ITC support. */
  const correct = (e: ExceptionRow) => {
    if (e.code === "AG-118") setFix(e)
    else setNote(e)
  }

  if (fix) return <FarmerRegister e={fix} onBack={() => setFix(null)} />
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((k) => (
          <Card key={k.label} className="flex items-center gap-3 p-4">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.chip}`}><k.icon size={18} /></span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-500 text-muted">{k.label}</p>
              <p className="mt-0.5 text-[22px] font-800 leading-tight text-ink tabular-nums">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <Button variant="outline" disabled={!s} onClick={() => act(`Audit trail ${s!.id}`, "Opens the audit trail of this exception.")}><Clock size={15} /> Audit trail</Button>
        <Button variant="outline" onClick={() => toast({ tone: "success", title: "Export started", body: `${rows.length} exceptions exported to Excel.` })}><ExternalLink size={16} /> Export to Excel</Button>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid flex-1 grid-cols-1 items-end gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:max-w-[1240px]">
            <Field label="Load"><Select value={load} onChange={setLoad} options={opts(["All", ...new Set(EXCEPTIONS.map((e) => e.load))])} /></Field>
            <Field label="Category"><Select value={f.category} onChange={up("category")} options={opts(["All", "Validation", "Authority", "Integration"])} /></Field>
            <Field label="Responsible area"><Select value={f.area} onChange={up("area")} options={opts(["All", ...new Set(EXCEPTIONS.map((e) => e.responsible))])} /></Field>
            <Field label="Error code"><Select clearable value={f.code} onChange={up("code")} options={opts([...new Set(EXCEPTIONS.map((e) => e.code))])} placeholder="Any code" /></Field>
            <Field label="Movement date"><DatePicker value={f.date} onChange={up("date")} /></Field>
            <Field label="Status"><Select value={f.status} onChange={up("status")} options={opts(["All", "Open", "Resolved"])} /></Field>
          </div>
        </div>
      </Card>

      <TableCard minWidth={1500} header={
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <p className="text-[14px] font-800 text-ink">Exceptions <span className="font-500 text-muted">· queue view</span> <span className="ml-1 font-600 text-muted">{rows.length}</span></p>
        </div>
      }>
        <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
          <tr>
            <th className={`${th} w-10`} />
            {["Exception", "Load", "Farmer", "Invoice", "Category", "Source", "Code", "Description", "Responsible", "Aging", "Reprocess", "Action required", "Actions"].map((h) => <th key={h} className={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => {
            const on = s?.id === e.id
            return (
              <tr key={e.id} onClick={() => setSel(e.id)} className={`cursor-pointer border-t border-line transition ${on ? "bg-brand-soft/50" : "hover:bg-canvas/60"}`}>
                <td className={td}><span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${on ? "border-brand" : "border-line"}`}>{on && <span className="h-2 w-2 rounded-full bg-brand" />}</span></td>
                <td className={`${td} font-700 text-brand`}>{e.id}</td>
                <td className={td}>{e.load}</td>
                <td className={td}>{e.farmer}</td>
                <td className={td}>{e.invoice || dash()}</td>
                <td className={td}><span className={`inline-flex rounded-md px-2 py-0.5 text-[12.5px] font-700 ${CAT_TONE[e.category].cell}`}>{e.category}</span></td>
                <td className={td}>{e.source}</td>
                <td className={`${td} font-700 text-ink`}>{e.code}</td>
                <td className={`${td} text-ink-soft`}>{e.description}</td>
                <td className={td}>{e.responsible}</td>
                <td className={`${td} whitespace-nowrap font-700 tabular-nums ${e.agingMin >= 120 ? "text-[#c23b3b]" : "text-ink"}`}>{aging(e.agingMin)}</td>
                <td className={td}>{e.reprocess ? <span className="font-600 text-[#1a7a45]">Yes</span> : <span className="inline-flex rounded-md bg-[#fdecec] px-2 py-0.5 font-700 text-[#c23b3b]">No</span>}</td>
                <td className={td}>{e.action}</td>
                <td className={td}>
                  <div className="flex items-center gap-1">
                  <button type="button" title={FIX_DEST[e.category].label} aria-label={`${FIX_DEST[e.category].label} for ${e.id}`} onClick={(ev) => { ev.stopPropagation(); setSel(e.id); correct(e) }}
                    className="grid h-8 w-8 place-items-center rounded-lg text-brand transition hover:bg-brand-soft"><ExternalLink size={15} /></button>
                  {(() => { const ok = e.category === "Authority" && e.reprocess; return (
                    <button type="button" title={ok ? "Resubmit to the authority" : "Resubmit not available"} aria-label={`Resubmit ${e.id}`} disabled={!ok}
                      onClick={(ev) => { ev.stopPropagation(); setSel(e.id); toast({ tone: "success", title: "Resubmitted", body: `Invoice ${e.invoice} sent to the authority again.` }) }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-brand transition hover:bg-brand-soft disabled:pointer-events-none disabled:opacity-30"><RefreshCw size={15} /></button>
                  ) })()}
                  </div>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr className="border-t border-line"><td colSpan={13} className="px-3 py-10 text-center text-muted">No exceptions match the filters.</td></tr>}
        </tbody>
      </TableCard>

      {note && <CorrectionModal e={note} onClose={() => setNote(null)} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

type IssueStatus = "Issued" | "Blocked" | "Pending"
type DocRow = { id: string; doc: string; type: string; farmer: string; copies: number; statement: string; status: IssueStatus; printed: string; printer: string; email: string; last: string; note: string; load: string; transporter: string; tone?: "amber" | "violet" | "red" }
const DOC_ROWS: DocRow[] = [
  { id: "d1", doc: "771402", type: "Standard DANFE", farmer: "Farmer 00052103", copies: 2, statement: "On copy 1", status: "Issued", printed: "Yes 11:19", printer: "PR-U03-01", email: "Yes 11:21", last: "29/09 11:19", note: "", load: "LOAD-0029114", transporter: "TRP-1204" },
  { id: "d2", doc: "771405", type: "Standard DANFE", farmer: "Farmer 00052124", copies: 2, statement: "On copy 1", status: "Issued", printed: "Yes 11:19", printer: "PR-U03-01", email: "No email", last: "29/09 11:19", note: "No address in the register", load: "LOAD-0029114", transporter: "TRP-1204", tone: "amber" },
  { id: "d3", doc: "771406", type: "Return DANFE", farmer: "Farmer 00052124", copies: 1, statement: "No", status: "Issued", printed: "Yes 11:19", printer: "PR-U03-01", email: "", last: "29/09 11:19", note: "Handed over outside the envelope", load: "LOAD-0029114", transporter: "TRP-1204", tone: "amber" },
  { id: "d4", doc: "771409", type: "Complementary DANFE", farmer: "Farmer 00052151", copies: 2, statement: "Hidden", status: "Issued", printed: "Yes 11:19", printer: "PR-U03-01", email: "Yes 11:21", last: "29/09 11:19", note: "Overprice not on the statement", load: "LOAD-0029114", transporter: "TRP-1204", tone: "violet" },
  { id: "d5", doc: "", type: "Transporter statement", farmer: "TRP-1204", copies: 1, statement: "No", status: "Blocked", printed: "No", printer: "", email: "", last: "", note: "Invoice retained in the load", load: "LOAD-0029114", transporter: "TRP-1204", tone: "red" },
  { id: "d6", doc: "", type: "Crop estimation report", farmer: "TRP-1204", copies: 1, statement: "No", status: "Pending", printed: "No", printer: "", email: "", last: "", note: "Issued with the invoices, flag on", load: "LOAD-0029114", transporter: "TRP-1204" },
  { id: "d7", doc: "771402", type: "Compact statement", farmer: "Farmer 00052103", copies: 1, statement: "Is the statement", status: "Issued", printed: "Yes 11:19", printer: "PR-U03-01", email: "Yes 11:21", last: "29/09 11:19", note: "", load: "LOAD-0029114", transporter: "TRP-1204" },
]
const ISSUE_STATUS: Record<IssueStatus, string> = { Issued: "bg-[#e8f6ee] text-[#1a7a45]", Blocked: "bg-[#fdecec] text-[#c23b3b]", Pending: "bg-[#fdf3e0] text-[#9a6a12]" }
const ISSUE_TONE = { amber: "text-[#9a6a12]", violet: "text-[#5b3fa8]", red: "text-[#c23b3b]" }
type DFilters = { date: string; load: string; transporter: string; farmer: string; invoice: string; type: string; status: string; printed: string; email: string }
const D_DEFAULT: DFilters = { date: "2026-09-29", load: "LOAD-0029114", transporter: "All", farmer: "All", invoice: "", type: "All", status: "All", printed: "All", email: "All" }

function Documents() {
  const toast = useToast()
  const [f, setF] = useState<DFilters>(D_DEFAULT)
  const [picked, setPicked] = useState<string[]>([])
  const up = (k: keyof DFilters) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const rows = DOC_ROWS.filter((d) =>
    (f.load === "All" || d.load === f.load) && (f.transporter === "All" || d.transporter === f.transporter) && (f.farmer === "All" || d.farmer === f.farmer) &&
    (!f.invoice.trim() || d.doc.includes(f.invoice.trim())) && (f.type === "All" || d.type === f.type) && (f.status === "All" || d.status === f.status) &&
    (f.printed === "All" || (f.printed === "Yes") === d.printed.startsWith("Yes")) && (f.email === "All" || (f.email === "Yes") === d.email.startsWith("Yes")))
  const sel = rows.filter((r) => picked.includes(r.id))
  const allOn = rows.length > 0 && sel.length === rows.length
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const act = (title: string, body: string) => toast({ tone: "info", title, body })
  const n = `${sel.length} document${sel.length === 1 ? "" : "s"}`
  const time = (v: string) => v.replace(/^Yes\s*/, "")
  const [hist, setHist] = useState<DocRow | null>(null)
  /* Issuance history of one document, built from its print and email events. */
  const events = (d: DocRow) => {
    const day = d.last.split(" ")[0] || "29/09"
    const list: { when: string; event: string; channel: string; by: string; result: string }[] = []
    if (d.status === "Blocked") list.push({ when: "29/09 11:05", event: "Issuance blocked", channel: "-", by: "System", result: d.note || "Blocked" })
    if (d.status === "Pending") list.push({ when: "29/09 11:05", event: "Waiting for issuance", channel: "-", by: "System", result: d.note || "Pending" })
    if (d.status === "Issued") list.push({ when: `${day} 11:18`, event: "Document generated", channel: "-", by: "System", result: `${d.copies} cop${d.copies === 1 ? "y" : "ies"}` })
    if (d.printed.startsWith("Yes")) list.push({ when: `${day} ${time(d.printed)}`, event: "Printed", channel: `Printer ${d.printer}`, by: "User 4471", result: "Sent to printer" })
    if (d.email.startsWith("Yes")) list.push({ when: `${day} ${time(d.email)}`, event: "Sent by email", channel: "Email", by: "System", result: "Delivered" })
    if (d.email === "No email") list.push({ when: `${day} 11:21`, event: "Email skipped", channel: "Email", by: "System", result: d.note || "No email address" })
    return list.reverse()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {sel.length > 0 && <span className="mr-1 text-[13px] font-600 text-brand">{sel.length} selected</span>}
        <Button variant="outline" disabled={!sel.length} onClick={() => toast({ tone: "success", title: "Sent to the printer", body: `${n} sent to PR-U03-01.` })}><Receipt size={15} /> Print</Button>
        <Button variant="outline" disabled={!sel.length} onClick={() => act("Send by email", `${n} queued for email.`)}><Send size={15} /> Send by email</Button>
        <Button variant="outline" disabled={!sel.length} onClick={() => act("Download PDF", `${n} downloaded as PDF.`)}><FileText size={15} /> Download PDF</Button>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Field label="Date"><DatePicker value={f.date} onChange={up("date")} /></Field>
          <Field label="Load"><Select value={f.load} onChange={up("load")} options={opts(["All", ...LOADS.map((l) => l.id)])} /></Field>
          <Field label="Transporter"><Select value={f.transporter} onChange={up("transporter")} options={opts(["All", ...new Set(LOADS.map((l) => l.transporter))])} /></Field>
          <Field label="Invoice"><Input value={f.invoice} onChange={(e) => up("invoice")(e.target.value)} placeholder="Invoice number" /></Field>
          <Field label="Document type"><Select value={f.type} onChange={up("type")} options={opts(["All", ...new Set(DOC_ROWS.map((d) => d.type))])} /></Field>
          <Field label="Farmer"><Select value={f.farmer} onChange={up("farmer")} options={opts(["All", ...new Set(DOC_ROWS.filter((d) => d.farmer.startsWith("Farmer")).map((d) => d.farmer))])} /></Field>
          <Field label="Printed"><Select value={f.printed} onChange={up("printed")} options={opts(["All", "Yes", "No"])} /></Field>
          <Field label="Sent by email"><Select value={f.email} onChange={up("email")} options={opts(["All", "Yes", "No"])} /></Field>
          <Field label="Status"><Select value={f.status} onChange={up("status")} options={opts(["All", "Issued", "Pending", "Blocked"])} /></Field>
        </div>
      </Card>

      <TableCard minWidth={1150} header={
        <div className="border-b border-line px-5 py-3.5">
          <p className="text-[14px] font-800 text-ink">Documents of the load <span className="ml-1 font-600 text-muted">{rows.length}</span></p>
        </div>
      }>
        <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
          <tr>
            <th className={`${th} w-10`}><Checkbox checked={allOn} onChange={() => setPicked(allOn ? [] : rows.map((r) => r.id))} /></th>
            {["Document", "Farmer", "Copies", "Delivery", "Status", "Actions"].map((h) => <th key={h} className={`${th} ${h === "Copies" ? "text-right" : h === "Actions" ? "text-center" : ""}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="[&_td]:py-1.5">
          {rows.map((d) => (
            <tr key={d.id} onClick={() => toggle(d.id)} className={`cursor-pointer border-t border-line transition ${picked.includes(d.id) ? "bg-brand-soft/40" : "hover:bg-canvas/60"}`}>
              <td className={td} onClick={(e) => e.stopPropagation()}><Checkbox checked={picked.includes(d.id)} onChange={() => toggle(d.id)} /></td>
              <td className={td}>
                <div className="whitespace-nowrap"><p className="font-700 text-ink">{d.doc || dash()}</p><p className="text-[12.5px] text-muted">{d.type}</p></div>
              </td>
              <td className={td}>{d.farmer}</td>
              <td className={`${td} text-right tabular-nums`}>{d.copies}</td>
              <td className={td}>
                <div className="flex flex-col gap-1 whitespace-nowrap text-[13px]">
                  <span className="inline-flex items-center gap-1.5" title={d.printed.startsWith("Yes") ? `Printer: printed at ${time(d.printed)} on ${d.printer}` : "Printer: not printed"}><Printer size={14} className="text-muted" aria-label="Printer" />{d.printed.startsWith("Yes") ? <><span className="tabular-nums">{time(d.printed)}</span><span className="text-muted">· {d.printer}</span></> : <span className="text-muted">Not printed</span>}</span>
                  <span className="inline-flex items-center gap-1.5" title={d.email.startsWith("Yes") ? `Email: sent at ${time(d.email)}` : d.email === "No email" ? "Email: no email address in the register" : "Email: no email"}><Mail size={14} className="text-muted" aria-label="Email" /> {d.email.startsWith("Yes") ? <span className="tabular-nums">{time(d.email)}</span> : <span className="inline-flex rounded-md bg-[#fdf3e0] px-2 py-px text-[12px] font-700 text-[#9a6a12]">No email</span>}</span>
                </div>
              </td>
              <td className={td}><span className={`inline-flex rounded-md px-2 py-0.5 text-[12.5px] font-700 ${ISSUE_STATUS[d.status]}`}>{d.status}</span></td>
              <td className={`${td} text-center`} onClick={(e) => e.stopPropagation()}>
                <button type="button" title="Issuance history" aria-label={`Issuance history ${d.doc || d.type}`} onClick={() => setHist(d)}
                  className="inline-grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"><History size={15} /></button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr className="border-t border-line"><td colSpan={7} className="px-3 py-10 text-center text-muted">No documents match the filters.</td></tr>}
        </tbody>
      </TableCard>

      <Modal open={!!hist} onClose={() => setHist(null)} title="Issuance history" width="max-w-3xl">
        {hist && <>
          <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 rounded-xl border border-line bg-canvas/60 px-4 py-3">
            {[["Document", hist.doc || "-"], ["Type", hist.type], ["Farmer", hist.farmer], ["Load", hist.load]].map(([k, v]) => (
              <div key={k}><p className="text-[12px] text-muted">{k}</p><p className="text-[13.5px] font-700 text-ink">{v}</p></div>
            ))}
            <div><p className="text-[12px] text-muted">Status</p><span className={`mt-0.5 inline-flex rounded-md px-2 py-0.5 text-[12.5px] font-700 ${ISSUE_STATUS[hist.status]}`}>{hist.status}</span></div>
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
                <tr>{["Timestamp", "Event", "Channel", "By", "Result"].map((h) => <th key={h} className={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {events(hist).map((e, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className={`${td} whitespace-nowrap tabular-nums`}>{e.when.replace(/^(\d{2}\/\d{2})(?!\/)/, "$1/2026")}</td>
                    <td className={`${td} font-700 text-ink`}>{e.event}</td>
                    <td className={td}>{e.channel}</td>
                    <td className={td}>{e.by}</td>
                    <td className={`${td} text-ink-soft`}>{e.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end"><Button variant="outline" onClick={() => setHist(null)}>Close</Button></div>
        </>}
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Parameters - Overprice                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Parameters                                                          */
/* ------------------------------------------------------------------ */

type PSection = "reports" | "printing" | "overprice"
const P_SECTIONS: { key: PSection; label: string; hint: string; icon: typeof FileText }[] = [
  { key: "reports", label: "Report", hint: "Delivered against still to deliver", icon: FileText },
  { key: "printing", label: "Printing and distribution", hint: "Print, email and recipients", icon: Send },
  { key: "overprice", label: "Overprice", hint: "Allowed configurations", icon: Coins },
]

/* ------------------------------------------------------------------ */
/* Reports: tobacco delivered against tobacco still to deliver          */
/* ------------------------------------------------------------------ */

type CropRow = { code: string; pct: number; seg: number; t: number; farmer: string; tech: string; avg: number; est: number; delivered: number; toDeliver: number; posDelivered: number; posBalance: number; bales: number }
const CROP_ROWS: CropRow[] = ([
  ["6926720", 0.0, "ANDRE LUIS ALBRECHT KONZGEN", 55.5, 3000, 1719, 1281, 23, 112, 248],
  ["2256215", 0.0, "ARLETE SCHRODER KRAUSE", 61.8, 5250, 3276, 1974, 32, 0, 630],
  ["4407199", 2.1, "CLEBER ELERT REICHOW", 55.0, 3700, 0, 3700, 67, 0, 444],
  ["7000128", 0.0, "DINAEL U. RADDATZ", 61.3, 8000, 5758, 2242, 37, 0, 960],
  ["7024066", 0.0, "DJULIN CARINE SCHRODER KRAUSE", 55.0, 1500, 0, 1500, 27, 0, 180],
  ["6926746", 0.0, "ELIANDRO BUBOLZ SCHELLIN", 55.0, 8000, 2915, 5085, 92, 249, 711],
  ["6864074", 0.0, "ELTON BIERHALS HARTWIG", 55.5, 10000, 2441, 7559, 136, 159, 1041],
  ["6998577", 0.0, "EMERSON JARDEL HARTWIG ALBRECHT", 60.3, 8000, 2291, 5709, 95, 62, 898],
  ["6002188", 0.0, "EMIR TIMM", 60.8, 8000, 3524, 4476, 74, 63, 897],
  ["7020944", 0.0, "GUSTAVO TREPTOW BIERHALS", 56.6, 6000, 3959, 2041, 36, 522, 198],
  ["2233622", 0.0, "ILDO SCHWARTZ", 58.8, 11000, 5054, 5946, 101, 1321, 0],
  ["6204597", 4.0, "INGOMAR ROMIG HARTWIG", 55.0, 5000, 0, 5000, 91, 0, 600],
] as [string, number, string, number, number, number, number, number, number, number][]).map(([code, pct, farmer, avg, est, delivered, toDeliver, posDelivered, posBalance, bales], i) => ({ code, pct, seg: 3, t: 3, farmer, tech: ["User 5102", "User 5118", "User 5140", "User 5156", "User 5182"][i % 5], avg, est, delivered, toDeliver, posDelivered, posBalance, bales }))
type TreeNode = { id: string; label: string; areas: string[]; children?: TreeNode[] }
const GUIDANCE_TREE: TreeNode = {
  id: "All", label: "001 - Brazil", areas: ["Area 430", "Area 431", "Area 432", "Area 486", "Area 490"],
  children: [
    { id: "SUL", label: "SUL", areas: ["Area 430", "Area 431", "Area 432"], children: [
      { id: "GT 04", label: "GT 04 - Santa Cruz", areas: ["Area 430", "Area 431"], children: [
        { id: "Area 430", label: "Area 430", areas: ["Area 430"] },
        { id: "Area 431", label: "Area 431", areas: ["Area 431"] },
      ] },
      { id: "GT 05", label: "GT 05 - Venancio Aires", areas: ["Area 432"], children: [
        { id: "Area 432", label: "Area 432", areas: ["Area 432"] },
      ] },
    ] },
    { id: "NORTE", label: "NORTE", areas: ["Area 486", "Area 490"], children: [
      { id: "GT 07", label: "GT 07 - Rio Azul", areas: ["Area 486", "Area 490"], children: [
        { id: "Area 486", label: "Area 486", areas: ["Area 486"] },
        { id: "Area 490", label: "Area 490", areas: ["Area 490"] },
      ] },
    ] },
  ],
}
const findTree = (id: string, n: TreeNode = GUIDANCE_TREE): TreeNode | undefined => (n.id === id ? n : n.children?.map((c) => findTree(id, c)).find(Boolean))
const BLOCKED_TECH_OPTS = [
  { value: "Area 430 - User 5102", label: "Area 430 - User 5102" },
  { value: "Area 431 - User 5118", label: "Area 431 - User 5118" },
  { value: "Area 486 - User 5140", label: "Area 486 - User 5140" },
  { value: "Area 432 - User 5156", label: "Area 432 - User 5156" },
  { value: "Area 490 - User 5182", label: "Area 490 - User 5182" },
]

function GuidanceTreeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [exp, setExp] = useState<string[]>(["All", "SUL", "GT 04"])
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener("mousedown", fn); return () => window.removeEventListener("mousedown", fn)
  }, [open])
  const cur = findTree(value) ?? GUIDANCE_TREE
  const s = q.trim().toLowerCase()
  const hit = (n: TreeNode): boolean => !s || n.label.toLowerCase().includes(s) || !!n.children?.some(hit)
  const flip = (id: string) => setExp((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))
  const render = (n: TreeNode, depth = 0): React.ReactNode => {
    if (!hit(n)) return null
    const kids = n.children?.filter(hit) ?? []
    const isOpen = !!s || exp.includes(n.id)
    const sel = value === n.id
    return (
      <div key={n.id}>
        <div style={{ paddingLeft: 8 + depth * 16 }} className={`flex items-center gap-1 rounded-lg pr-2.5 py-1.5 text-[13.5px] transition ${sel ? "bg-brand-soft font-700 text-brand" : "text-ink hover:bg-canvas"}`}>
          {n.children?.length ? (
            <button type="button" aria-label={`Expand ${n.label}`} onClick={(e) => { e.stopPropagation(); flip(n.id) }} className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted hover:text-ink">
              <ChevronRight size={14} className={`transition ${isOpen ? "rotate-90" : ""}`} />
            </button>
          ) : <span className="w-5 shrink-0" />}
          <button type="button" onClick={() => { onChange(n.id); setOpen(false) }} className="flex flex-1 items-center justify-between gap-2 text-left">
            <span className="truncate">{n.label}</span>
            {sel && <Check size={14} className="shrink-0 text-brand" />}
          </button>
        </div>
        {kids.length > 0 && isOpen && <div>{kids.map((c) => render(c, depth + 1))}</div>}
      </div>
    )
  }
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 text-left text-[14px] text-ink outline-none transition hover:border-brand focus:border-brand focus:ring-4 focus:ring-brand-soft">
        <span className="truncate">{cur.label}</span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1.5 max-h-80 w-full min-w-[260px] overflow-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_32px_rgba(15,30,61,0.14)]">
          <div className="sticky top-0 z-10 bg-white pb-1.5">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search region, territory or area…" className="h-9" />
          </div>
          {render(GUIDANCE_TREE)}
        </div>
      )}
    </div>
  )
}

function DevNote() {
  return <p className="text-[12px] italic text-muted">Note: this table is not required in the development UI.</p>
}

type RFilters = { crop: string; issueBy: string; transporter: string; farmers: string; tobacco: string; withInvoices: string }
const R_DEFAULT: RFilters = { crop: "", issueBy: "", transporter: "", farmers: "", tobacco: "", withInvoices: "" }

const CS_HEAD = "border border-[#9fb6cc] bg-[#d6e6f4] px-3 py-1.5 text-center text-[13px] font-700 text-ink"
const CS_CELL = "border border-[#9fb6cc] px-3 py-1.5 text-[13px] text-ink"
const CS_DEBTS: [string, string, string, string, number, number, number][] = [
  ["********", "02/02/2026", "961317", "04/02/2026", 19, 1031, 21744.72],
  ["********", "02/02/2026", "964986", "01/03/2026", 0, 0, 737.17],
  ["********", "23/04/2026", "971702", "24/04/2026", 100, 5546, 118321.63],
]
const CS_LINES: [string, number, number, number | null][] = [
  ["BRACHIARIA AV", 265.67, 265.67, null],
  ["AFUBRA REGISTRATION", 4418.48, 4418.48, null],
  ["INPUTS SD 2027", 506.29, 506.29, null],
  ["INPUTS / OPERATING COSTS", 14631.74, 12437.0, 2194.74],
  ["INPUTS / OPERATING COSTS 2027", 15559.3, 13293.71, 2265.59],
  ["SUDAN GRASS SEED", 628.78, 628.78, null],
]
const CS_CREDITS: [string, number][] = [["BANK DEPOSIT", 1300], ["TOBACCO SUPPLIED", 140066.35], ["REPURCHASE", 737.17], ["(-) INSS", -2112.03], ["TOBACCO SUPPLIED 2025", 12437]]

function CompactStatementReport() {
  const toast = useToast()
  const [crop, setCrop] = useState("")
  const [farmer, setFarmer] = useState("")
  const applied = !!crop && !!farmer
  const tot = (i: 1 | 2) => CS_LINES.reduce((n, l) => n + l[i], 0)
  const disc = CS_LINES.reduce((n, l) => n + (l[3] ?? 0), 0)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <Button disabled={!applied} onClick={() => toast({ tone: "success", title: "Export started", body: "Compact statement exported for 6218563 - FABIO DIONE HELFER." })}><FileText size={15} /> Export</Button>
      </div>
      <Card className="p-5">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:max-w-[440px]">
          <Field label="Crop"><Select clearable placeholder="Select…" value={crop} onChange={setCrop} options={opts(["2026", "2025"])} /></Field>
          <Field label="Farmer"><Select clearable searchable placeholder="Select…" value={farmer} onChange={setFarmer} options={opts(["6218563 - FABIO DIONE HELFER"])} /></Field>
        </div>
      </Card>
      {applied && (
        <Card className="space-y-3 p-5">
          <DevNote />
          <div className="flex items-center justify-between bg-[#1f4e79] px-4 py-3 text-white">
            <p className="flex-1 text-center text-[20px] font-800 tracking-wide">COMPACT STATEMENT</p>
            <p className="text-[12.5px]">Position as of 20/10/2026</p>
          </div>
          <div className="grid grid-cols-2 border border-[#9fb6cc] bg-canvas text-[13px] lg:grid-cols-[1.2fr_1fr_1.4fr_1.2fr_0.5fr]">
            {[["Farmer Code / Name", "6218563 - FABIO DIONE HELFER"], ["CPF", "95192883091"], ["Spouse", "DAIANA BARBOSA DA SILVA"], ["Municipality / Locality", "VERA CRUZ / MATO ALTO"], ["Crop", crop]].map(([k, v]) => (
              <div key={k} className="border-r border-[#9fb6cc] px-3 py-1.5 last:border-r-0"><p className="text-muted">{k}</p><p className="text-ink">{v}</p></div>
            ))}
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse">
            <thead><tr>{["Description", "Principal", "Amortization", "Discount", "Balance"].map((h) => <th key={h} className={CS_HEAD}>{h}</th>)}</tr></thead>
            <tbody>
              {CS_LINES.map(([d, p, a, x]) => (
                <tr key={d}><td className={CS_CELL}>{d}</td><td className={`${CS_CELL} text-right tabular-nums`}>{money(p)}</td><td className={`${CS_CELL} text-right tabular-nums`}>{money(a)}</td><td className={`${CS_CELL} text-right tabular-nums`}>{x === null ? "" : money(x)}</td><td className={`${CS_CELL} text-right tabular-nums`}>{money(0)}</td></tr>
              ))}
              <tr className="bg-canvas font-700"><td className={CS_CELL}>TOTAL</td><td className={`${CS_CELL} text-right tabular-nums`}>{money(tot(1))}</td><td className={`${CS_CELL} text-right tabular-nums`}>{money(tot(2))}</td><td className={`${CS_CELL} text-right tabular-nums`}>{money(disc)}</td><td className={`${CS_CELL} text-right tabular-nums`}>{money(0)}</td></tr>
            </tbody>
          </table></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse">
            <thead><tr><th className={`${CS_HEAD} w-[50%]`}>Credits</th><th className={CS_HEAD}>Total of All Invoices</th></tr></thead>
            <tbody>
              {CS_CREDITS.map(([k, v]) => <tr key={k}><td className={CS_CELL}>{k}</td><td className={`${CS_CELL} text-right tabular-nums`}>{money(v)}</td></tr>)}
              <tr className="bg-canvas font-700"><td className={CS_CELL}>TOTAL</td><td className={`${CS_CELL} tabular-nums`}>{money(CS_CREDITS.reduce((n, c) => n + c[1], 0))}</td></tr>
            </tbody>
          </table></div>
          <div className="flex flex-wrap justify-between gap-2 border border-[#4d7ba6] bg-[#d6e6f4] px-3 py-1.5 text-[13px] text-ink">
            <b>Total payments made to the farmer during the crop:</b><span>BRL 120,878.56</span><span>Tobacco delivered: 438.5 arrobas | 6,576.80 kg</span>
          </div>
          <p className="border border-[#9fb6cc] py-1.5 text-center text-[13px] font-700 text-ink">TOTAL FUTURE DEBTS FOR THIS FARM</p>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse">
            <thead><tr>{["Farmer Invoice", "Date", "Inbound Invoice", "Date", "No. of Bales", "KG", "Amount"].map((h, i) => <th key={`${h}${i}`} className={CS_HEAD}>{h}</th>)}</tr></thead>
            <tbody>
              {CS_DEBTS.map((r) => (
                <tr key={r[2]}><td className={`${CS_CELL} text-center`}>{r[0]}</td><td className={`${CS_CELL} text-center`}>{r[1]}</td><td className={`${CS_CELL} text-center`}>{r[2]}</td><td className={`${CS_CELL} text-center`}>{r[3]}</td><td className={`${CS_CELL} text-center tabular-nums`}>{r[4]}</td><td className={`${CS_CELL} text-center tabular-nums`}>{r[5].toLocaleString("en-US")}</td><td className={`${CS_CELL} text-right tabular-nums`}>{money(r[6])}</td></tr>
              ))}
            </tbody>
          </table></div>
          <p className="bg-[#9fc0dd] px-3 py-1.5 text-center text-[13px] font-700 text-ink">AVAILABLE CREDIT AMOUNT FOR PAYMENT OF INPUTS - 2028</p>
          <div className="flex justify-between border border-[#9fb6cc] px-3 py-1.5 text-[13px] text-ink"><span>Available amount for payment of inputs</span><span className="tabular-nums">0.00</span></div>
          <p className="text-right text-[12px] text-muted">GT: 105 OA: 163</p>
        </Card>
      )}
    </div>
  )
}

function Reports() {
  const [tab, setTab] = useState<"crop" | "compact">("crop")
  return (
    <div className="space-y-5">
      <Segmented<"crop" | "compact"> value={tab} onChange={setTab} items={[{ key: "crop", label: "Crop estimation report" }, { key: "compact", label: "Compact statement" }]} />
      {tab === "crop" ? <CropEstimationReport name="Crop estimation report" /> : <CompactStatementReport />}
    </div>
  )
}

// Shared by the Crop estimation report and the Compact statement tabs.
// All filters start empty; the result table appears once any filter is chosen.
function CropEstimationReport({ name }: { name: string }) {
  const toast = useToast()
  const [f, setF] = useState<RFilters>(R_DEFAULT)
  const [excluded, setExcluded] = useState<string[]>([])
  const up = (k: keyof RFilters) => (v: string) => setF((x) => ({ ...x, [k]: v }))
  const applied = Object.values(f).some((v) => v) || excluded.length > 0
  const af = f
  const crows = CROP_ROWS

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <Button disabled={!applied} onClick={() => toast({ tone: "success", title: "Export started", body: `${name} exported for ${crows.length} farmers${af.transporter ? ` (${af.transporter})` : ""}.` })}><FileText size={15} /> Export</Button>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Crop"><Select clearable placeholder="Select…" value={f.crop} onChange={up("crop")} options={opts(["2026/2027", "2025/2026"])} /></Field>
          <Field label="Issue by"><Select clearable placeholder="Select…" value={f.issueBy} onChange={up("issueBy")} options={opts(["Transporter", "Field technician", "Farmer"])} /></Field>
          <Field label="Transporter"><Select clearable searchable placeholder="Select…" value={f.transporter} onChange={up("transporter")} options={opts([...new Set(LOADS.map((l) => l.transporter))])} /></Field>
          <Field label="Excluded field technician"><MultiSelect searchable values={excluded} onChange={setExcluded} options={BLOCKED_TECH_OPTS} placeholder="None selected" allLabel="All blocked" /></Field>
          <Field label="Farmers"><Select clearable placeholder="Select…" value={f.farmers} onChange={up("farmers")} options={opts(["Non-final", "Final", "All"])} /></Field>
          <Field label="Tobacco type"><Select clearable placeholder="Select…" value={f.tobacco} onChange={up("tobacco")} options={opts(["Virginia", "Burley"])} /></Field>
          <Field label="Issue with invoices"><Select clearable placeholder="Select…" value={f.withInvoices} onChange={up("withInvoices")} options={opts(["Yes", "No"])} /></Field>
        </div>
      </Card>

      {applied && (() => {
        const sum = (k: "est" | "delivered" | "toDeliver") => crows.reduce((n, r) => n + r[k], 0)
        const fmtN = (n: number) => n.toLocaleString("en-US")
        const left = (r: CropRow) => Math.max(r.est - r.delivered, 0)
        const balesLeft = (r: CropRow) => Math.round(left(r) / r.avg)
        const pctOf = (d: number, e: number) => (e ? (d / e) * 100 : 0)
        const totEst = sum("est"), totDel = sum("delivered")
        const totLeft = crows.reduce((n, r) => n + left(r), 0)
        const totBales = crows.reduce((n, r) => n + balesLeft(r), 0)
        const over = "bg-[#fde7e7] font-700 text-[#c23b3b]"
        return (
          <TableCard minWidth={980} header={<SectionHead title="Crop estimation report" hint={`${crows.length} farmers`} right={<DevNote />} />}>
            <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
              <tr>
                {["Farmer", "Field technician", "Bale average weight", "Estimated kg", "Delivered kg", "To deliver kg", "Delivered %", "Bales to deliver"].map((h, i) => <th key={h} className={`${th} ${i > 1 ? "text-right" : ""}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {crows.map((r) => {
                const pct = pctOf(r.delivered, r.est), full = r.delivered >= r.est
                const warn = full ? over : ""
                return (
                  <tr key={r.code} className="border-t border-line">
                    <td className={`${td} font-700 text-ink`}>{r.farmer}</td>
                    <td className={td}>{r.tech}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.avg.toFixed(1)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtN(r.est)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtN(r.delivered)}</td>
                    <td className={`${td} text-right tabular-nums ${warn}`}>{fmtN(left(r))}</td>
                    <td className={`${td} text-right tabular-nums ${warn}`}>{pct.toFixed(1)} %</td>
                    <td className={`${td} text-right tabular-nums ${warn}`}>{fmtN(balesLeft(r))}</td>
                  </tr>
                )
              })}
              {crows.length === 0 && <tr className="border-t border-line"><td colSpan={8} className="px-3 py-10 text-center text-muted">No farmers match the filters.</td></tr>}
              {crows.length > 0 && (
                <tr className="border-t border-line bg-canvas font-700 text-ink">
                  <td className={td} colSpan={3}>Total</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtN(totEst)}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtN(totDel)}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtN(totLeft)}</td>
                  <td className={`${td} text-right tabular-nums`}>{pctOf(totDel, totEst).toFixed(1)} %</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtN(totBales)}</td>
                </tr>
              )}
            </tbody>
          </TableCard>
        )
      })()}
    </div>
  )
}

/** Confirmation shown when saving a new record on any Tobacco parameters tab. */
function ConfirmAddModal({ open, title, body, onCancel, onConfirm }: { open: boolean; title: string; body: React.ReactNode; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width="max-w-md">
      <p className="text-[14px] leading-relaxed text-ink-soft">{body}</p>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm}><Check size={16} /> Save</Button>
      </div>
    </Modal>
  )
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={(e) => { e.stopPropagation(); onChange(!on) }}
      className={`relative h-5 w-9 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? "bg-brand" : "bg-line"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  )
}
const Dot = ({ on }: { on: boolean }) => <span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${on ? "border-brand" : "border-line"}`}>{on && <span className="h-2 w-2 rounded-full bg-brand" />}</span>
const SectionHead = ({ title, hint, right }: { title: string; hint?: string; right?: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
    <div><p className="text-[14px] font-800 text-ink">{title}</p>{hint && <p className="text-[12.5px] text-muted">{hint}</p>}</div>
    {right}
  </div>
)
const Chip = ({ tone, children }: { tone: "amber" | "purple" | "red" | "muted"; children: React.ReactNode }) => (
  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-700 ${{ amber: "bg-[#fff6e0] text-[#9a6a12]", purple: "bg-[#f1edfb] text-[#5b3fa8]", red: "bg-[#fdecec] text-[#c23b3b]", muted: "bg-canvas text-muted" }[tone]}`}>{children}</span>
)

function Parameters({ section, onSection }: { section: PSection; onSection: (s: PSection) => void }) {
  return (
    <div className="space-y-5">
      <Segmented<PSection> value={section} onChange={onSection} items={P_SECTIONS} />
      {section === "reports" && <Reports />}
      {section === "printing" && <PrintingParams />}
      {section === "overprice" && <OverpriceParams />}
    </div>
  )
}

/* B · Authority and contingency ------------------------------------- */

type CInvoice = { id: string; unit: string; load: string; farmer: string; invoice: string; type: string; date: string; issued: string; submitted: string; aging: string; closed: boolean }
const isoDay = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); const p2 = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }
const dm = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/")
// Two example history rows, dated yesterday and today so they always fall in the default range.
const contingencyHistory = (unit: string): CInvoice[] => [
  { id: "1", unit, load: "LOAD-0029126", farmer: "Farmer 00052302", invoice: "771501", type: "EC", date: isoDay(0), issued: `${dm(isoDay(0))} 09:14`, submitted: "", aging: "2 h 26 m", closed: false },
  { id: "2", unit, load: "LOAD-0029120", farmer: "Farmer 00052290", invoice: "771488", type: "EC", date: isoDay(-1), issued: `${dm(isoDay(-1))} 16:02`, submitted: `${dm(isoDay(-1))} 18:40`, aging: "", closed: true },
]

type CUnit = { unit: string; on: boolean; since: string; wait: string }
const C_UNITS: CUnit[] = [
  { unit: "Unit 01", on: false, since: "", wait: "15 minutes" },
  { unit: "Unit 02", on: false, since: "", wait: "15 minutes" },
  { unit: "Unit 03", on: false, since: "", wait: "15 minutes" },
  { unit: "Unit 05", on: false, since: "", wait: "15 minutes" },
  { unit: "Unit 07", on: false, since: "", wait: "1 minute" },
]
const ALL_BUYING_UNITS = ["Unit 01", "Unit 02", "Unit 03", "Unit 05", "Unit 07"]
const WAITS = ["1 minute", "5 minutes", "15 minutes", "30 minutes"]
const nowStamp = () => { const d = new Date(); const p2 = (n: number) => String(n).padStart(2, "0"); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}` }

function AuthorityParams() {
  const toast = useToast()
  const [units, setUnits] = useState(C_UNITS)
  const [edit, setEdit] = useState<CUnit | null>(null)
  const [confirmSave, setConfirmSave] = useState<{ next: CUnit; requestedBy: string; comment: string } | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [hf, setHf] = useState(() => ({ from: isoDay(-1), to: isoDay(0), unit: "All" }))
  const iconBtn = "grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-40"
  const commitSave = (next: CUnit, extra?: string) => {
    setUnits((all) => all.map((u) => (u.unit === next.unit ? next : u)))
    setEdit(null)
    toast({ tone: "success", title: `${next.unit} ${next.on ? "in contingency" : "back to standard"}`, body: extra ? `${extra} · Wait before contingency: ${next.wait}.` : `Wait before contingency: ${next.wait}.` })
  }
  const save = () => {
    if (!edit) return
    const prev = units.find((u) => u.unit === edit.unit)!
    const next = { ...edit, since: edit.on ? (prev.on ? prev.since : nowStamp()) : "" }
    if (!prev.on && edit.on) {
      setConfirmSave({ next, requestedBy: "", comment: "" })
      return
    }
    commitSave(next)
  }

  // Opening history resets the range to yesterday → today.
  const openHistory = (unit: string) => { setHf({ from: isoDay(-1), to: isoDay(0), unit }); setHistoryOpen(true) }

  if (historyOpen) {
    const rows = contingencyHistory(hf.unit === "All" ? "Unit 03" : hf.unit).filter((r) => (!hf.from || r.date >= hf.from) && (!hf.to || r.date <= hf.to))
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[18px] font-800 text-ink">Contingency history</p>
          <Button variant="outline" onClick={() => setHistoryOpen(false)}><ChevronLeft size={16} /> Back</Button>
        </div>

        <Card className="p-5">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:max-w-[440px]">
            <Field label="From"><DatePicker value={hf.from} onChange={(v) => setHf((s) => ({ ...s, from: v }))} /></Field>
            <Field label="To"><DatePicker value={hf.to} onChange={(v) => setHf((s) => ({ ...s, to: v }))} /></Field>
          </div>
        </Card>

        <TableCard minWidth={1100} header={<SectionHead title="Invoices issued in contingency, awaiting authorisation" hint={`${rows.filter((r) => !r.closed).length} awaiting submission · ${rows.length} total`} />}>
          <Head cols={["Buying unit", "Load", "Farmer", "Invoice", "Type", "Issued", "Submitted", "Status"]} />
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-line ${r.closed ? "text-muted" : ""}`}>
                <td className={`${td} font-700 ${r.closed ? "" : "text-ink"}`}>{r.unit}</td>
                <td className={`${td} font-700 ${r.closed ? "" : "text-ink"}`}>{r.load}</td>
                <td className={td}>{r.farmer}</td>
                <td className={`${td} tabular-nums`}>{r.invoice}</td>
                <td className={`${td} font-700 ${r.closed ? "" : "text-[#5b3fa8]"}`}>{r.type}</td>
                <td className={`${td} tabular-nums`}>{r.issued}</td>
                <td className={`${td} tabular-nums`}>{r.submitted || "-"}</td>
                <td className={td}>{r.closed ? <Badge tone="green">Authorised late</Badge> : <span className="inline-flex items-center rounded-full border border-[#d9cff3] bg-[#f1edfb] px-2.5 py-0.5 text-[12px] font-600 text-[#5b3fa8]">Awaiting submission</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr className="border-t border-line"><td colSpan={8} className="px-3 py-10 text-center text-muted">No contingency invoices match the filters.</td></tr>}
          </tbody>
        </TableCard>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <TableCard minWidth={1100} header={
        <SectionHead title="Contingency state by buying unit" hint="Use the edit icon to switch contingency on or off for a buying unit." />
      }>
        <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
          <tr>
            {["Buying unit", "Mode", "Since", "Authority timeout before contingency", "State"].map((h) => <th key={h} className={th}>{h}</th>)}
            <th className={`${th} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {units.map((base) => {
            const e = edit?.unit === base.unit ? edit : null
            const u = e ?? base
            return (
              <tr key={u.unit} className={`border-t border-line transition ${e ? "bg-brand-soft/40" : "hover:bg-canvas/60"}`}>
                <td className={`${td} font-700 text-ink`}>{u.unit}</td>
                <td className={td}>{u.on ? <span className="inline-flex items-center rounded-full border border-[#d9cff3] bg-[#f1edfb] px-2.5 py-0.5 text-[12px] font-600 text-[#5b3fa8]">Contingency</span> : <Badge tone="green">Standard</Badge>}</td>
                <td className={`${td} tabular-nums`}>{u.on ? (base.on ? base.since : "On save") : ""}</td>
                <td className={td}>{e ? <div className="w-[150px]"><Select value={e.wait} onChange={(v) => setEdit({ ...e, wait: v })} options={opts(WAITS)} /></div> : u.wait}</td>
                <td className={td}>
                  {e ? <span className="inline-flex items-center gap-2"><Toggle on={e.on} onChange={(v) => setEdit({ ...e, on: v })} /><span className={`text-[12px] font-700 ${e.on ? "text-[#5b3fa8]" : "text-muted"}`}>{e.on ? "On" : "Off"}</span></span>
                    : <span className={`font-700 ${u.on ? "text-[#5b3fa8]" : "text-muted"}`}>{u.on ? "On" : "Off"}</span>}
                </td>
                <td className={`${td} text-right`}>
                  {e ? (
                    <span className="inline-flex gap-1">
                      <button type="button" title="Save" aria-label="Save" onClick={save} className={`${iconBtn} bg-brand text-white hover:bg-brand/90`}><Check size={15} /></button>
                      <button type="button" title="Cancel" aria-label="Cancel" onClick={() => setEdit(null)} className={`${iconBtn} text-muted hover:bg-canvas hover:text-ink`}><X size={15} /></button>
                    </span>
                  ) : (
                    <span className="inline-flex gap-1">
                      <button type="button" title={`Edit ${u.unit}`} aria-label={`Edit ${u.unit}`} disabled={!!edit} onClick={() => setEdit({ ...base })} className={`${iconBtn} text-muted hover:bg-brand-soft hover:text-brand`}><Pencil size={15} /></button>
                      <button type="button" title="History" aria-label={`History of ${u.unit}`} onClick={() => openHistory(u.unit)} className={`${iconBtn} text-muted hover:bg-brand-soft hover:text-brand`}><History size={15} /></button>
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </TableCard>

      {confirmSave && (
        <Modal open onClose={() => setConfirmSave(null)} title={`Switch ${confirmSave.next.unit} to contingency`} width="max-w-md">
          <div className="space-y-4">
            <Field label="Requested by">
              <Input value={confirmSave.requestedBy} onChange={(e) => setConfirmSave({ ...confirmSave, requestedBy: e.target.value })} placeholder="Who requested the switch" />
            </Field>
            <Field label="Comment">
              <Input value={confirmSave.comment} onChange={(e) => setConfirmSave({ ...confirmSave, comment: e.target.value })} placeholder="Reason or comment for switching to contingency" />
            </Field>
          </div>
          <div className="mt-6 flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setConfirmSave(null)}>Cancel</Button>
            <Button disabled={!confirmSave.requestedBy.trim() || !confirmSave.comment.trim()} onClick={() => {
              const { next, requestedBy, comment } = confirmSave
              setConfirmSave(null)
              commitSave(next, `${comment.trim()} · Requested by ${requestedBy.trim()}`)
            }}><Check size={16} /> Save</Button>
          </div>
        </Modal>
      )}

    </div>
  )
}

/* E · Printing and distribution ------------------------------------- */

type DeliveryMode = "Print and hand over" | "Print and send to e-mail" | "Send to e-mail" | ""

type PrintRow = { id: string; name: string; code: string; print: boolean; copies: number; email: boolean; delivery: DeliveryMode; recipient: string; when: string; active: boolean }
const PRINT_ROWS: PrintRow[] = [
  { id: "p1", name: "Purchase counter-note", code: "EN", print: true, copies: 2, email: true, delivery: "Print and send to e-mail", recipient: "Farmer", when: "At acceptance", active: true },
  { id: "p2", name: "Return counter-note", code: "", print: true, copies: 1, email: true, delivery: "Print and send to e-mail", recipient: "Farmer", when: "At acceptance", active: true },
  { id: "p3", name: "Return invoice", code: "DN", print: true, copies: 1, email: false, delivery: "Print and hand over", recipient: "Transporter", when: "At acceptance", active: true },
  { id: "p4", name: "Complementary invoice", code: "ON", print: true, copies: 2, email: true, delivery: "Print and send to e-mail", recipient: "Farmer", when: "At acceptance", active: true },
  { id: "p5", name: "Rebuy invoice", code: "RC", print: false, copies: 0, email: true, delivery: "Send to e-mail", recipient: "Accountant", when: "On issuance", active: true },
  { id: "p6", name: "Overprice invoice", code: "", print: true, copies: 2, email: true, delivery: "Print and send to e-mail", recipient: "Farmer", when: "At acceptance", active: true },
]

type PrinterRow = { id: string; serial: string; unit: string; where: string; queue: number | null; onClosing: boolean; active: boolean }
const PRINTERS: PrinterRow[] = [
  { id: "PR-U03-01", serial: "SN 4XK21093", unit: "Unit 03", where: "Farmer house, desk 1", queue: 1, onClosing: true, active: true },
  { id: "PR-U03-02", serial: "SN 4XK21107", unit: "Unit 03", where: "Farmer house, desk 2", queue: 2, onClosing: true, active: true },
  { id: "PR-U03-03", serial: "SN 7PL00452", unit: "Unit 03", where: "Finance office", queue: null, onClosing: false, active: false },
]

function PrintingParams() {
  const toast = useToast()
  const [printers, setPrinters] = useState(PRINTERS)
  const [viewPrinter, setViewPrinter] = useState<string | null>(null)
  // Each printer carries its own document settings.
  const [docs, setDocs] = useState<Record<string, PrintRow[]>>(() => Object.fromEntries(PRINTERS.map((p) => [p.id, PRINT_ROWS.map((r) => ({ ...r, active: p.active && r.active }))])))
  const [draft, setDraft] = useState<PrintRow | null>(null)
  const [newDocRow, setNewDocRow] = useState<PrintRow | null>(null)
  const [newPrinter, setNewPrinter] = useState<PrinterRow | null>(null)
  const [editPrinter, setEditPrinter] = useState<PrinterRow | null>(null)
  const [confirmAdd, setConfirmAdd] = useState<{ kind: "doc" | "printer" } | null>(null)
  const printer = viewPrinter ?? PRINTERS[0].id
  const rows = docs[printer] ?? []
  const setRows = (f: (r: PrintRow[]) => PrintRow[]) => setDocs((d) => ({ ...d, [printer]: f(d[printer] ?? []) }))
  const patch = (p: Partial<PrintRow>) => setDraft((d) => (d ? { ...d, ...p } : d))
  const save = () => { if (!draft) return; setRows((all) => all.map((x) => (x.id === draft.id ? draft : x))); toast({ tone: "success", title: `${draft.name} saved`, body: `On ${printer}.` }); setDraft(null) }
  const yn = (on: boolean, set: ((v: boolean) => void) | null, labels = ["Yes", "No"], offRed = false) => set
    ? <span className="inline-flex items-center gap-2"><Toggle on={on} onChange={set} /><span className={`text-[12px] font-700 ${on ? "text-[#1a7a45]" : offRed ? "text-[#c23b3b]" : "text-muted"}`}>{on ? labels[0] : labels[1]}</span></span>
    : <span className={`font-600 ${on ? "text-[#1a7a45]" : offRed ? "text-[#c23b3b]" : "text-muted"}`}>{on ? labels[0] : labels[1]}</span>
  const iconBtn = "grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-40"
  const togglePrintForRow = (rowId: string) => {
    if (draft?.id === rowId) {
      const nextPrint = !draft.print
      patch({ print: nextPrint, copies: nextPrint ? Math.max(1, draft.copies) : 0 })
    } else {
      setRows((all) => all.map((x) => (x.id === rowId ? { ...x, print: !x.print, copies: !x.print ? Math.max(1, x.copies) : 0 } : x)))
    }
  }
  const toggleEmailForRow = (rowId: string) => {
    if (draft?.id === rowId) {
      patch({ email: !draft.email })
    } else {
      setRows((all) => all.map((x) => (x.id === rowId ? { ...x, email: !x.email } : x)))
    }
  }

  const commitAdd = () => {
    if (confirmAdd?.kind === "doc" && newDocRow) {
      const created: PrintRow = { ...newDocRow, id: `p${Date.now()}`, name: newDocRow.name.trim() }
      setRows((all) => [created, ...all])
      setNewDocRow(null)
      toast({ tone: "success", title: `${created.name} added`, body: `Configured on ${printer}.` })
    } else if (confirmAdd?.kind === "printer" && newPrinter) {
      const p = { ...newPrinter, id: newPrinter.id.trim(), serial: newPrinter.serial.trim() }
      setPrinters((all) => [p, ...all])
      setDocs((d) => ({ ...d, [p.id]: PRINT_ROWS.map((r) => ({ ...r })) }))
      setNewPrinter(null)
      toast({ tone: "success", title: `${p.id} added`, body: "Default document settings were applied." })
    }
    setConfirmAdd(null)
  }
  const confirmModal = (
    <ConfirmAddModal open={!!confirmAdd} onCancel={() => setConfirmAdd(null)} onConfirm={commitAdd}
      title={confirmAdd?.kind === "printer" ? "Save new printer?" : "Save new document type?"}
      body={confirmAdd?.kind === "printer" && newPrinter
        ? <>Add printer <b className="text-ink">{newPrinter.id.trim()}</b> to <b className="text-ink">{newPrinter.unit}</b> with the default document settings?</>
        : <>Add <b className="text-ink">{newDocRow?.name.trim()}</b> to the documents configured on <b className="text-ink">{printer}</b>?</>} />
  )

  if (viewPrinter) {
    return (
      <div className="space-y-5">
        {confirmModal}
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <Button
            onClick={() =>
              setNewDocRow({
                id: "__new__",
                name: "",
                code: "",
                print: true,
                copies: 1,
                email: true,
                delivery: "Print and send to e-mail",
                recipient: "Farmer",
                when: "At acceptance",
                active: true,
              })
            }
          >
            <Plus size={15} /> Add document type
          </Button>
          <Button variant="outline" onClick={() => { setDraft(null); setNewDocRow(null); setViewPrinter(null) }}><ChevronLeft size={16} /> Back</Button>
        </div>

        <TableCard minWidth={1040}>
          <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
            <tr>
              {["Fiscal document type", "Code", "Recipient"].map((h) => <th key={h} className={th}>{h}</th>)}
              <th className={`${th} text-center`}>Print</th>
              <th className={`${th} text-center`}>Send to email</th>
              {["Copies", "Status"].map((h) => <th key={h} className={th}>{h}</th>)}
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {newDocRow && (
              <tr className="border-t border-line bg-brand-soft/40">
                <td className={td}>
                  <Input
                    value={newDocRow.name}
                    onChange={(e) => setNewDocRow({ ...newDocRow, name: e.target.value })}
                    placeholder="Document type"
                  />
                </td>
                <td className={td}>
                  <div className="w-[120px]">
                    <Input value={newDocRow.code} onChange={(e) => setNewDocRow({ ...newDocRow, code: e.target.value })} placeholder="Code" />
                  </div>
                </td>
                <td className={td}>
                  <div className="w-[140px]">
                    <Select
                      value={newDocRow.recipient}
                      onChange={(v) => setNewDocRow({ ...newDocRow, recipient: v })}
                      options={opts(["Farmer", "Transporter", "Accountant"])}
                    />
                  </div>
                </td>
                <td className={`${td} text-center`}>
                  <button
                    type="button"
                    onClick={() =>
                      setNewDocRow({
                        ...newDocRow,
                        print: !newDocRow.print,
                        copies: !newDocRow.print ? Math.max(1, newDocRow.copies) : 0,
                      })
                    }
                    className={`inline-grid h-6 w-6 place-items-center rounded-full border transition ${
                      newDocRow.print
                        ? "border-[#bfe6cf] bg-[#e8f6ee] text-[#1a7a45]"
                        : "border-line bg-canvas text-muted"
                    }`}
                  >
                    {newDocRow.print ? <Check size={13} /> : <X size={13} />}
                  </button>
                </td>
                <td className={`${td} text-center`}>
                  <button
                    type="button"
                    onClick={() => setNewDocRow({ ...newDocRow, email: !newDocRow.email })}
                    className={`inline-grid h-6 w-6 place-items-center rounded-full border transition ${
                      newDocRow.email
                        ? "border-[#bfe6cf] bg-[#e8f6ee] text-[#1a7a45]"
                        : "border-line bg-canvas text-muted"
                    }`}
                  >
                    {newDocRow.email ? <Check size={13} /> : <X size={13} />}
                  </button>
                </td>
                <td className={td}>
                  <div className="w-[80px]">
                    <Input
                      type="number"
                      min={0}
                      disabled={!newDocRow.print}
                      value={newDocRow.copies}
                      onChange={(e) => setNewDocRow({ ...newDocRow, copies: Math.max(0, Number(e.target.value)) })}
                    />
                  </div>
                </td>
                <td className={td}>
                  {yn(newDocRow.active, (v) => setNewDocRow({ ...newDocRow, active: v }), ["Active", "Inactive"])}
                </td>
                <td className={`${td} text-right`}>
                  <span className="inline-flex gap-1">
                    <button
                      type="button"
                      title="Save"
                      aria-label="Save"
                      disabled={!newDocRow.name.trim()}
                      onClick={() => setConfirmAdd({ kind: "doc" })}
                      className={`${iconBtn} bg-brand text-white hover:bg-brand/90`}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      title="Cancel"
                      aria-label="Cancel"
                      onClick={() => setNewDocRow(null)}
                      className={`${iconBtn} text-muted hover:bg-canvas hover:text-ink`}
                    >
                      <X size={15} />
                    </button>
                  </span>
                </td>
              </tr>
            )}
            {rows.map((base) => {
              const e = draft?.id === base.id ? draft : null
              const r = e ?? base
              return (
                <tr key={r.id} className={`border-t border-line transition ${e ? "bg-brand-soft/40" : "hover:bg-canvas/60"}`}>
                  <td className={`${td} font-700 text-ink`}>
                    {e ? <Input value={e.name} onChange={(ev) => patch({ name: ev.target.value })} /> : r.name}
                  </td>
                  <td className={td}>
                    {e ? (
                      <div className="w-[120px]">
                        <Input value={e.code} onChange={(ev) => patch({ code: ev.target.value })} placeholder="Code" />
                      </div>
                    ) : r.code ? (
                      <span className="font-700">{r.code}</span>
                    ) : (
                      <Chip tone="amber">To confirm</Chip>
                    )}
                  </td>
                  <td className={td}>
                    {e ? (
                      <div className="w-[140px]">
                        <Select value={e.recipient} onChange={(v) => patch({ recipient: v })} options={opts(["Farmer", "Transporter", "Accountant"])} />
                      </div>
                    ) : (
                      r.recipient
                    )}
                  </td>
                  <td className={`${td} text-center`}>
                    <button
                      type="button"
                      title={`Print: ${r.print ? "Enabled" : "Disabled"}`}
                      aria-label={`Print for ${r.name}`}
                      aria-pressed={r.print}
                      onClick={() => togglePrintForRow(r.id)}
                      className={`inline-grid h-6 w-6 place-items-center rounded-full border transition ${
                        r.print
                          ? "border-[#bfe6cf] bg-[#e8f6ee] text-[#1a7a45]"
                          : "border-line bg-canvas text-muted hover:border-brand-ring hover:text-ink"
                      }`}
                    >
                      {r.print ? <Check size={13} /> : <X size={13} />}
                    </button>
                  </td>
                  <td className={`${td} text-center`}>
                    <button
                      type="button"
                      title={`Send to email: ${r.email ? "Enabled" : "Disabled"}`}
                      aria-label={`Send to email for ${r.name}`}
                      aria-pressed={r.email}
                      onClick={() => toggleEmailForRow(r.id)}
                      className={`inline-grid h-6 w-6 place-items-center rounded-full border transition ${
                        r.email
                          ? "border-[#bfe6cf] bg-[#e8f6ee] text-[#1a7a45]"
                          : "border-line bg-canvas text-muted hover:border-brand-ring hover:text-ink"
                      }`}
                    >
                      {r.email ? <Check size={13} /> : <X size={13} />}
                    </button>
                  </td>
                  <td className={`${td} tabular-nums`}>
                    {e ? (
                      <div className="w-[80px]">
                        <Input
                          type="number"
                          min={0}
                          disabled={!e.print}
                          value={e.copies}
                          onChange={(ev) => patch({ copies: Math.max(0, Number(ev.target.value)) })}
                        />
                      </div>
                    ) : r.print ? (
                      r.copies
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className={td}>{e ? yn(r.active, (v) => patch({ active: v }), ["Active", "Inactive"]) : <Badge tone={r.active ? "green" : "neutral"}>{r.active ? "Active" : "Inactive"}</Badge>}</td>
                  <td className={`${td} text-right`}>
                    {e ? (
                      <span className="inline-flex gap-1">
                        <button type="button" title="Save" aria-label="Save" onClick={save} className={`${iconBtn} bg-brand text-white hover:bg-brand/90`}><Check size={15} /></button>
                        <button type="button" title="Cancel" aria-label="Cancel" onClick={() => setDraft(null)} className={`${iconBtn} text-muted hover:bg-canvas hover:text-ink`}><X size={15} /></button>
                      </span>
                    ) : (
                      <button type="button" title={`Edit ${r.name}`} aria-label={`Edit ${r.name}`} disabled={!!draft} onClick={() => setDraft({ ...base })} className={`${iconBtn} ml-auto text-muted hover:bg-brand-soft hover:text-brand`}><Pencil size={15} /></button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TableCard>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {confirmModal}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() =>
            setNewPrinter({
              id: "",
              serial: "",
              unit: "Unit 03",
              where: "",
              queue: printers.filter((p) => p.active).length + 1,
              onClosing: true,
              active: true,
            })
          }
        >
          <Plus size={15} /> Add printer
        </Button>
      </div>

      <TableCard minWidth={980}>
        <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
          <tr>
            {["Printer", "Serial number", "Buying unit", "Where it is", "Status"].map((h) => <th key={h} className={th}>{h}</th>)}
            <th className={`${th} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {newPrinter && (
            <tr className="border-t border-line bg-brand-soft/40">
              <td className={td}>
                <Input
                  value={newPrinter.id}
                  onChange={(e) => setNewPrinter({ ...newPrinter, id: e.target.value.toUpperCase() })}
                  placeholder="PR-U03-04"
                />
              </td>
              <td className={td}>
                <Input
                  value={newPrinter.serial}
                  onChange={(e) => setNewPrinter({ ...newPrinter, serial: e.target.value })}
                  placeholder="SN 4XK21200"
                />
              </td>
              <td className={td}>
                <div className="w-[140px]">
                  <Select
                    value={newPrinter.unit}
                    onChange={(v) => setNewPrinter({ ...newPrinter, unit: v })}
                    options={opts(ALL_BUYING_UNITS)}
                  />
                </div>
              </td>
              <td className={td}>
                <Input
                  value={newPrinter.where}
                  onChange={(e) => setNewPrinter({ ...newPrinter, where: e.target.value })}
                  placeholder="Farmer house, desk 3"
                />
              </td>
              <td className={td}>
                {yn(newPrinter.active, (v) => setNewPrinter({ ...newPrinter, active: v }), ["Active", "Inactive"])}
              </td>
              <td className={`${td} text-right`}>
                <span className="inline-flex gap-1">
                  <button
                    type="button"
                    title="Save"
                    aria-label="Save"
                    disabled={!newPrinter.id.trim() || !newPrinter.serial.trim() || printers.some((p) => p.id === newPrinter.id.trim())}
                    onClick={() => setConfirmAdd({ kind: "printer" })}
                    className={`${iconBtn} bg-brand text-white hover:bg-brand/90`}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    title="Cancel"
                    aria-label="Cancel"
                    onClick={() => setNewPrinter(null)}
                    className={`${iconBtn} text-muted hover:bg-canvas hover:text-ink`}
                  >
                    <X size={15} />
                  </button>
                </span>
              </td>
            </tr>
          )}
          {printers.map((base) => {
            const ep = editPrinter?.id === base.id ? editPrinter : null
            const p = ep ?? base
            return (
              <tr key={p.id} className={`border-t border-line transition ${ep ? "bg-brand-soft/40" : "hover:bg-canvas/60"} ${p.active ? "" : "text-muted"}`}>
                <td className={`${td} font-700 ${p.active ? "text-ink" : ""}`}>{p.id}</td>
                <td className={td}>
                  {ep ? (
                    <Input value={ep.serial} onChange={(e) => setEditPrinter({ ...ep, serial: e.target.value })} />
                  ) : (
                    p.serial
                  )}
                </td>
                <td className={td}>
                  {ep ? (
                    <div className="w-[140px]">
                      <Select value={ep.unit} onChange={(v) => setEditPrinter({ ...ep, unit: v })} options={opts(ALL_BUYING_UNITS)} />
                    </div>
                  ) : (
                    p.unit
                  )}
                </td>
                <td className={td}>
                  {ep ? (
                    <Input value={ep.where} onChange={(e) => setEditPrinter({ ...ep, where: e.target.value })} />
                  ) : (
                    p.where
                  )}
                </td>
                <td className={td}>
                  {ep ? (
                    yn(ep.active, (v) => setEditPrinter({ ...ep, active: v }), ["Active", "Inactive"])
                  ) : (
                    <Badge tone={p.active ? "green" : "neutral"}>{p.active ? "Active" : "Inactive"}</Badge>
                  )}
                </td>
                <td className={`${td} text-right`}>
                  {ep ? (
                    <span className="inline-flex justify-end gap-1">
                      <button
                        type="button"
                        title="Save"
                        aria-label="Save"
                        disabled={!ep.serial.trim()}
                        onClick={() => {
                          const savedPrinter = { ...ep, serial: ep.serial.trim(), where: ep.where.trim() }
                          setPrinters((all) => all.map((item) => (item.id === savedPrinter.id ? savedPrinter : item)))
                          setEditPrinter(null)
                          toast({ tone: "success", title: `${savedPrinter.id} updated`, body: `${savedPrinter.unit} · ${savedPrinter.active ? "Active" : "Inactive"}.` })
                        }}
                        className={`${iconBtn} bg-brand text-white hover:bg-brand/90`}
                      >
                        <Check size={15} />
                      </button>
                      <button
                        type="button"
                        title="Cancel"
                        aria-label="Cancel"
                        onClick={() => setEditPrinter(null)}
                        className={`${iconBtn} text-muted hover:bg-canvas hover:text-ink`}
                      >
                        <X size={15} />
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex justify-end gap-1">
                      <button
                        type="button"
                        title={`Edit ${p.id}`}
                        aria-label={`Edit ${p.id}`}
                        disabled={!!editPrinter}
                        onClick={() => setEditPrinter({ ...base })}
                        className={`${iconBtn} text-muted hover:bg-brand-soft hover:text-brand`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        title="View documents"
                        aria-label={`View documents on ${p.id}`}
                        onClick={() => { setDraft(null); setViewPrinter(p.id) }}
                        className={`${iconBtn} text-muted hover:bg-brand-soft hover:text-brand`}
                      >
                        <FileText size={15} />
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </TableCard>
    </div>
  )
}

/* Return reasons ----------------------------------------------------- */

type ReasonBlock = { block: string; against: string; tol: string; measuredAt?: string; appliedTo?: string }
type Reason = {
  code: string
  reason: string
  toleranceEnabled: boolean
  measured: string
  active: boolean
  by: "System" | "User"
  prints: boolean
  blocks: ReasonBlock[]
}

const REASONS: Reason[] = [
  { code: "1", reason: "Moisture", toleranceEnabled: true, measured: "Moisture % above the allowed limit", active: true, by: "System", prints: true, blocks: [
    { block: "Position", against: "Moisture % above the allowed limit (per position)", tol: "16" },
    { block: "Total", against: "Moisture % above the allowed limit (load average)", tol: "15" },
  ] },
  { code: "17", reason: "Wet in the Truck", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "29", reason: "Commercial Disagreement", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "2", reason: "Scorched", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "4", reason: "Green Leaf Mixing", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "5", reason: "Moldy", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "6", reason: "Overcured in the Barn", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "7", reason: "Stalk Position Mixing", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "9", reason: "Foreign Material", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "3", reason: "Bale Out of Standard", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "8", reason: "Quality Mixing", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "12", reason: "Contaminants", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "13", reason: "Bale Stuffing", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "14", reason: "Scalded in the Barn", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "18", reason: "Rotten", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "19", reason: "Poorly Made Hand/Bale", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "20", reason: "Grass Green", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "21", reason: "Fermented", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "22", reason: "Swollen", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "23", reason: "Type Mixing", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "24", reason: "Color Mixing", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "25", reason: "Lealf", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "27", reason: "Excess Moisture", toleranceEnabled: true, measured: "Moisture % or percentage points above the allowed limit", active: true, by: "System", prints: true, blocks: [
    { block: "Position", against: "Moisture % or percentage points above the allowed limit", tol: "2" },
    { block: "Total", against: "Total load moisture percentage points above limit", tol: "1.5" },
  ] },
  { code: "28", reason: "Prohibited Pesticides", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "32", reason: "Wet", toleranceEnabled: false, measured: "—", active: true, by: "User", prints: true, blocks: [] },
  { code: "33", reason: "Excess Tobacco", toleranceEnabled: true, measured: "% of delivered quantity above the allowed/estimated quantity", active: true, by: "System", prints: true, blocks: [
    { block: "Position", against: "Estimate of one position", tol: "12" },
    { block: "Total", against: "Total farmer estimate", tol: "10" },
  ] },
  { code: "34", reason: "Excess Bale Weight", toleranceEnabled: true, measured: "kg or % above the maximum allowed bale weight", active: true, by: "System", prints: true, blocks: [
    { block: "Position", against: "Maximum allowed bale weight per position", tol: "5" },
    { block: "Total", against: "Maximum allowed bale weight on load", tol: "3" },
  ] },
]

/* One flat row per reason: tolerances, measured-at and applies-to are edited inline in the table. */
type ReasonRow = {
  code: string
  reason: string
  toleranceEnabled: boolean
  measured: string
  positionTol: string
  totalTol: string
  measuredAt: string
  appliedTo: string
  active: boolean
}
type ReasonLog = { code: string; at: string; by: string; change: string }

const DEFAULT_MEASURED_AT = "Load closing"
const DEFAULT_APPLIED_TO = "Every farmer of the crop"

const toReasonRow = (r: Reason): ReasonRow => {
  const position = r.blocks.find((b) => b.block === "Position")
  const total = r.blocks.find((b) => b.block === "Total")
  return {
    code: r.code,
    reason: r.reason,
    toleranceEnabled: r.toleranceEnabled,
    measured: r.toleranceEnabled ? r.measured : "",
    positionTol: r.toleranceEnabled ? position?.tol ?? "10" : "",
    totalTol: r.toleranceEnabled ? total?.tol ?? "10" : "",
    measuredAt: r.toleranceEnabled ? position?.measuredAt ?? DEFAULT_MEASURED_AT : "",
    appliedTo: r.toleranceEnabled ? position?.appliedTo ?? DEFAULT_APPLIED_TO : "",
    active: r.active,
  }
}

const describeReasonChange = (before: ReasonRow, after: ReasonRow) => {
  const changes: string[] = []
  if (before.reason !== after.reason) changes.push(`reason "${before.reason}" to "${after.reason}"`)
  if (before.toleranceEnabled !== after.toleranceEnabled) changes.push(`tolerance ${after.toleranceEnabled ? "enabled" : "disabled"}`)
  if (before.measured !== after.measured) changes.push(`what is measured changed`)
  if (before.positionTol !== after.positionTol) changes.push(`position tolerance ${before.positionTol || "—"} % to ${after.positionTol || "—"} %`)
  if (before.totalTol !== after.totalTol) changes.push(`total tolerance ${before.totalTol || "—"} % to ${after.totalTol || "—"} %`)
  if (before.measuredAt !== after.measuredAt) changes.push(`measured at ${after.measuredAt || "—"}`)
  if (before.appliedTo !== after.appliedTo) changes.push(`applies to ${after.appliedTo || "—"}`)
  if (before.active !== after.active) changes.push(after.active ? "activated" : "deactivated")
  return changes
}

function ReturnReasons() {
  const toast = useToast()
  const [reasons, setReasons] = useState<ReasonRow[]>(() => REASONS.map(toReasonRow))
  const [editing, setEditing] = useState<ReasonRow | null>(null)
  const [adding, setAdding] = useState<ReasonRow | null>(null)
  const [confirmAdd, setConfirmAdd] = useState(false)
  const [historyCode, setHistoryCode] = useState<string | null>(null)
  const [log, setLog] = useState<ReasonLog[]>([
    { code: "33", at: "28/09 16:20", by: "User 3110", change: "Total tolerance 12 % to 10 %" },
    { code: "29", at: "22/09 09:05", by: "User 3110", change: "Activated" },
  ])
  const active = reasons.filter((r) => r.active)
  const busy = !!editing || !!adding
  const pct = (v: string) => v.replace(/[^\d.]/g, "").slice(0, 4)
  const addLog = (code: string, change: string) => setLog((l) => [{ code, at: "29/09 14:35", by: "User 7712", change }, ...l])

  const startAdd = () =>
    setAdding({
      code: String(Math.max(0, ...reasons.map((r) => Number(r.code) || 0)) + 1),
      reason: "",
      toleranceEnabled: false,
      measured: "",
      positionTol: "",
      totalTol: "",
      measuredAt: "",
      appliedTo: "",
      active: true,
    })

  const withTolerance = (r: ReasonRow, enabled: boolean): ReasonRow =>
    enabled
      ? { ...r, toleranceEnabled: true, positionTol: r.positionTol || "10", totalTol: r.totalTol || "10", measuredAt: r.measuredAt || DEFAULT_MEASURED_AT, appliedTo: r.appliedTo || DEFAULT_APPLIED_TO }
      : { ...r, toleranceEnabled: false, measured: "", positionTol: "", totalTol: "", measuredAt: "", appliedTo: "" }

  const saveEdit = () => {
    if (!editing) return
    const before = reasons.find((r) => r.code === editing.code)
    const next = { ...editing, reason: editing.reason.trim(), measured: editing.measured.trim(), appliedTo: editing.appliedTo.trim() }
    setReasons((all) => all.map((r) => (r.code === next.code ? next : r)))
    const changes = before ? describeReasonChange(before, next) : []
    if (changes.length) addLog(next.code, changes.join("; ").replace(/^./, (c) => c.toUpperCase()))
    setEditing(null)
    toast({ tone: "success", title: `${next.code} · ${next.reason} saved`, body: changes.length ? `${changes.length} change${changes.length === 1 ? "" : "s"} recorded.` : "No changes." })
  }

  const saveAdd = () => {
    if (!adding) return
    const created = { ...adding, code: adding.code.trim(), reason: adding.reason.trim(), measured: adding.measured.trim(), appliedTo: adding.appliedTo.trim() }
    setReasons((all) => [created, ...all])
    addLog(created.code, "Reason added")
    setAdding(null)
    setConfirmAdd(false)
    toast({ tone: "success", title: "Return reason added", body: `${created.code} · ${created.reason} added.` })
  }

  const addValid = !!adding && !!adding.code.trim() && !!adding.reason.trim() && !reasons.some((r) => r.code === adding.code.trim())

  /* Editable cells, shared by the inline edit row and the inline add row. */
  const editCells = (r: ReasonRow, set: (next: ReasonRow) => void, codeEditable: boolean) => (
    <>
      <td className={`${td} w-24`}>
        {codeEditable ? <Input value={r.code} onChange={(e) => set({ ...r, code: e.target.value })} placeholder="35" /> : <span className="font-700 tabular-nums text-ink">{r.code}</span>}
      </td>
      <td className={`${td} min-w-[180px]`}>
        <Input value={r.reason} onChange={(e) => set({ ...r, reason: e.target.value })} placeholder="Enter return reason" />
      </td>
      <td className={`${td} w-32`}>
        <Select value={r.toleranceEnabled ? "Yes" : "No"} onChange={(v) => set(withTolerance(r, v === "Yes"))} options={opts(["No", "Yes"])} />
      </td>
      <td className={`${td} min-w-[200px]`}>
        <Input value={r.measured} disabled={!r.toleranceEnabled} onChange={(e) => set({ ...r, measured: e.target.value })} placeholder={r.toleranceEnabled ? "What is measured" : "—"} />
      </td>
      <td className={`${td} w-28`}>
        <div className="relative">
          <Input value={r.positionTol} disabled={!r.toleranceEnabled} onChange={(e) => set({ ...r, positionTol: pct(e.target.value) })} placeholder="—" className="pr-7" />
          {r.toleranceEnabled && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">%</span>}
        </div>
      </td>
      <td className={`${td} w-28`}>
        <div className="relative">
          <Input value={r.totalTol} disabled={!r.toleranceEnabled} onChange={(e) => set({ ...r, totalTol: pct(e.target.value) })} placeholder="—" className="pr-7" />
          {r.toleranceEnabled && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">%</span>}
        </div>
      </td>
      <td className={`${td} w-40`}>
        {r.toleranceEnabled ? <Select value={r.measuredAt} onChange={(v) => set({ ...r, measuredAt: v })} options={opts(["Load closing", "Each weighing"])} /> : <span className="text-muted">—</span>}
      </td>
      <td className={`${td} min-w-[180px]`}>
        <Input value={r.appliedTo} disabled={!r.toleranceEnabled} onChange={(e) => set({ ...r, appliedTo: e.target.value })} placeholder="—" />
      </td>
      <td className={td}>
        <span className="inline-flex items-center gap-2">
          <Toggle on={r.active} onChange={(v) => set({ ...r, active: v })} />
          <span className={`text-[12px] font-700 ${r.active ? "text-[#1a7a45]" : "text-muted"}`}>{r.active ? "Active" : "Inactive"}</span>
        </span>
      </td>
    </>
  )

  const iconBtn = "inline-grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-40"
  const historyRows = log.filter((l) => l.code === historyCode)
  const historyReason = reasons.find((r) => r.code === historyCode)

  return (
    <div className="space-y-5">
      <TableCard
        minWidth={1480}
        header={
          <SectionHead
            title="Return reasons"
            hint={`${active.length} active of ${reasons.length}`}
            right={<Button variant="outline" disabled={busy} onClick={startAdd}><Plus size={15} /> Add reason</Button>}
          />
        }
      >
        <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
          <tr>
            {["Code", "Reason", "Tolerance enabled?", "What is measured", "Position tolerance %", "Total tolerance %", "Measured at", "Applies to", "Status", "Actions"].map((h) => (
              <th key={h} className={`${th} ${h === "Actions" ? "w-28 text-center" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {adding && (
            <tr className="border-t border-line bg-brand-soft/40">
              {editCells(adding, setAdding, true)}
              <td className={`${td} text-center`}>
                <span className="inline-flex items-center justify-center gap-1">
                  <button type="button" title="Save reason" aria-label="Save reason" disabled={!addValid} onClick={() => setConfirmAdd(true)} className={`${iconBtn} bg-brand text-white hover:bg-brand/90`}><Check size={15} /></button>
                  <button type="button" title="Cancel" aria-label="Cancel" onClick={() => setAdding(null)} className={`${iconBtn} border border-line bg-white text-muted hover:text-ink`}><X size={15} /></button>
                </span>
              </td>
            </tr>
          )}
          {reasons.map((base) => {
            const e = editing?.code === base.code ? editing : null
            if (e) {
              return (
                <tr key={base.code} className="border-t border-line bg-brand-soft/40">
                  {editCells(e, setEditing as (next: ReasonRow) => void, false)}
                  <td className={`${td} text-center`}>
                    <span className="inline-flex items-center justify-center gap-1">
                      <button type="button" title="Save" aria-label={`Save ${base.reason}`} disabled={!e.reason.trim()} onClick={saveEdit} className={`${iconBtn} bg-brand text-white hover:bg-brand/90`}><Check size={15} /></button>
                      <button type="button" title="Cancel" aria-label="Cancel" onClick={() => setEditing(null)} className={`${iconBtn} border border-line bg-white text-muted hover:text-ink`}><X size={15} /></button>
                    </span>
                  </td>
                </tr>
              )
            }
            const dash = <span className="text-muted">—</span>
            return (
              <tr key={base.code} className={`border-t border-line ${base.active ? "" : "text-muted"}`}>
                <td className={`${td} font-700 tabular-nums ${base.active ? "text-ink" : ""}`}>{base.code}</td>
                <td className={`${td} ${base.active ? "font-700 text-ink" : ""}`}>{base.reason}</td>
                <td className={`${td} font-700 ${base.toleranceEnabled ? "text-[#1a7a45]" : "text-ink-soft"}`}>{base.toleranceEnabled ? "Yes" : "No"}</td>
                <td className={td}>{base.toleranceEnabled && base.measured ? base.measured : dash}</td>
                <td className={`${td} tabular-nums`}>{base.toleranceEnabled ? <Chip tone="amber">{base.positionTol || "0"} %</Chip> : dash}</td>
                <td className={`${td} tabular-nums`}>{base.toleranceEnabled ? <Chip tone="amber">{base.totalTol || "0"} %</Chip> : dash}</td>
                <td className={td}>{base.toleranceEnabled ? base.measuredAt : dash}</td>
                <td className={td}>{base.toleranceEnabled ? base.appliedTo : dash}</td>
                <td className={td}><Badge tone={base.active ? "green" : "neutral"}>{base.active ? "Active" : "Inactive"}</Badge></td>
                <td className={`${td} text-center`}>
                  <span className="inline-flex items-center justify-center gap-1">
                    <button type="button" title={`Edit ${base.reason}`} aria-label={`Edit ${base.reason}`} disabled={busy} onClick={() => setEditing({ ...base })} className={`${iconBtn} text-muted hover:bg-brand-soft hover:text-brand`}><Pencil size={15} /></button>
                    <button type="button" title={`History of ${base.reason}`} aria-label={`History of ${base.reason}`} onClick={() => setHistoryCode(base.code)} className={`${iconBtn} text-muted hover:bg-brand-soft hover:text-brand`}><History size={15} /></button>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </TableCard>

      <Modal open={!!historyCode} onClose={() => setHistoryCode(null)} title={historyReason ? `History · ${historyReason.code} ${historyReason.reason}` : "History"} width="max-w-2xl">
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-[13px]">
            <Head cols={["Timestamp", "Change", "User"]} />
            <tbody>
              {historyRows.map((l, i) => (
                <tr key={i} className="border-t border-line">
                  <td className={`${td} w-32 whitespace-nowrap tabular-nums text-muted`}>{l.at}</td>
                  <td className={`${td} font-600 text-ink`}>{l.change}</td>
                  <td className={`${td} w-28 whitespace-nowrap text-muted`}>{l.by}</td>
                </tr>
              ))}
              {historyRows.length === 0 && <tr className="border-t border-line"><td colSpan={3} className="px-3 py-8 text-center text-muted">No changes recorded for this reason.</td></tr>}
            </tbody>
          </table>
        </div>
      </Modal>

      <ConfirmAddModal open={confirmAdd && !!adding} title="Save new return reason?" onCancel={() => setConfirmAdd(false)} onConfirm={saveAdd}
        body={adding && <>Add return reason <b className="text-ink">{adding.code.trim()} · {adding.reason.trim()}</b>?</>} />
    </div>
  )
}

type PFilters ={ crop: string; type: string; node: string; refClass: string; status: string }
const P_DEFAULT: PFilters = { crop: "2026/2027", type: "All", node: "All", refClass: "All", status: "Active" }

function OverpriceParams() {
  const toast = useToast()
  const [configs, setConfigs] = useState<OverConfig[]>(CONFIGS)
  const [draft, setDraft] = useState<PFilters>(P_DEFAULT)
  // Filters apply as soon as they change; there is no separate Search step.
  const f = draft
  const [sel, setSel] = useState(configs[0].id)
  const [add, setAdd] = useState<OverConfig | null>(null)
  const [confirmAdd, setConfirmAdd] = useState(false)
  const [editCfg, setEditCfg] = useState<OverConfig | null>(null)
  const [by, setBy] = useState("Price based")
  const up = (k: keyof PFilters) => (v: string) => setDraft((s) => ({ ...s, [k]: v }))
  const sapByRefClass: Record<string, string> = { B01: "20000855", B02: "20000856" }

  const rows = useMemo(() => configs.filter((c) => c.crop === f.crop && (f.type === "All" || c.type === f.type) && (f.node === "All" || c.node === f.node) && (f.refClass === "All" || c.refClass === f.refClass) && (f.status === "All" || c.status === f.status)), [configs, f])
  const upA = <K extends keyof OverConfig>(k: K) => (v: OverConfig[K]) => setAdd((c) => (c ? { ...c, [k]: v } : c))
  const valid = !!add && !!add.type && !!add.node && !!add.refClass && add.maxPrice > 0 && !!add.maxFarmer
  const startAdd = () => setAdd({ id: `c${Date.now()}`, crop: f.crop, type: "", node: "", refClass: "", internal: "", sap: "", from: "2026-10-01", to: "2027-02-28", maxPrice: 0, maxFarmer: null, status: "Active" })
  const saveAdd = () => {
    if (!add || !valid) return
    const c = { ...add }
    setConfigs((all) => [c, ...all]); setSel(c.id); setAdd(null); setConfirmAdd(false)
    toast({ tone: "success", title: "Configuration created", body: `${c.type} ${c.refClass} on ${c.node} is now allowed.` })
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid flex-1 grid-cols-1 items-end gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:max-w-[1080px]">
            <Field label="Crop"><Select value={draft.crop} onChange={up("crop")} options={opts(["2026/2027", "2025/2026"])} /></Field>
            <Field label="Tobacco type"><Select value={draft.type} onChange={up("type")} options={opts(["All", "Virginia", "Burley", "Common"])} /></Field>
            <Field label="Node hierarchy"><Select value={draft.node} onChange={up("node")} options={opts(["All", "GT 04", "GT 07"])} /></Field>
            <Field label="Reference class"><Select value={draft.refClass} onChange={up("refClass")} options={opts(["All", "B01", "B02"])} /></Field>
            <Field label="Status"><Select value={draft.status} onChange={up("status")} options={opts(["All", "Active", "Inactive"])} /></Field>
          </div>
          <div className="flex items-center gap-2.5">
            {add ? <>
              <Button variant="outline" onClick={() => setAdd(null)}>Cancel</Button>
              <Button disabled={!valid} onClick={() => setConfirmAdd(true)}><Check size={16} /> Save</Button>
            </> : <Button onClick={startAdd}><Plus size={16} /> New configuration</Button>}
          </div>
        </div>
      </Card>

      <TableCard minWidth={1240} header={
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <p className="text-[14px] font-800 text-ink">Configurations <span className="ml-1 font-600 text-muted">{rows.length}</span></p>
        </div>
      }>
        <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
          <tr>
            <th className={`${th} w-10`} />
            {["Crop", "Tobacco type", "Node", "Reference class", "Internal class", "SAP code", "From", "To"].map((h) => <th key={h} className={th}>{h}</th>)}
            <th className={`${th} text-right`}>Maximum price</th>
            <th className={`${th} text-right`}>Maximum per farmer</th>
            <th className={th}>Status</th>
            <th className={`${th} text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {add && (
            <tr className="border-t border-line bg-brand-soft/40 align-top">
              <td className={td}><span className="grid h-4 w-4 place-items-center rounded-full border-2 border-brand"><span className="h-2 w-2 rounded-full bg-brand" /></span></td>
              <td className={`${td} min-w-[130px]`}><Select value={add.crop} onChange={upA("crop")} options={opts(["2026/2027", "2025/2026"])} /></td>
              <td className={`${td} min-w-[140px]`}><Select value={add.type} onChange={upA("type")} options={opts(["Virginia", "Burley", "Common"])} placeholder="Select type" /></td>
              <td className={`${td} min-w-[130px]`}><Select value={add.node} onChange={upA("node")} options={opts(["GT 04", "GT 07"])} placeholder="Select node" /></td>
              <td className={`${td} min-w-[130px]`}><Select value={add.refClass} onChange={(v) => setAdd((c) => (c ? { ...c, refClass: v, internal: `${v}-INT`, sap: sapByRefClass[v] ?? "20000855" } : c))} options={opts(["B01", "B02"])} placeholder="Select class" /></td>
              <td className={`${td} pt-5 text-muted`}>{add.internal || dash()}</td>
              <td className={`${td} pt-5 font-600 tabular-nums text-ink`}>{add.sap || dash()}</td>
              <td className={`${td} min-w-[150px]`}><DatePicker value={add.from} onChange={upA("from")} /></td>
              <td className={`${td} min-w-[150px]`}><DatePicker value={add.to} onChange={upA("to")} /></td>
              <td className={`${td} min-w-[120px]`}><Input type="number" min={0} value={add.maxPrice || ""} onChange={(e) => upA("maxPrice")(Number(e.target.value))} className="text-right" placeholder="0.00" /></td>
              <td className={`${td} min-w-[120px]`}><Input type="number" min={0} value={add.maxFarmer ?? ""} onChange={(e) => upA("maxFarmer")(e.target.value ? Number(e.target.value) : null)} className="text-right" placeholder="0.00" /></td>
              <td className={`${td} min-w-[130px]`}><Select value={add.status} onChange={(v) => upA("status")(v as "Active" | "Inactive")} options={opts(["Active", "Inactive"])} /></td>
              <td className={`${td} text-right`}>
                <span className="inline-flex justify-end gap-1">
                  <button
                    type="button"
                    title="Save"
                    aria-label="Save"
                    disabled={!valid}
                    onClick={() => setConfirmAdd(true)}
                    className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white transition hover:bg-brand/90 disabled:opacity-40"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    title="Cancel"
                    aria-label="Cancel"
                    onClick={() => setAdd(null)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
                  >
                    <X size={15} />
                  </button>
                </span>
              </td>
            </tr>
          )}
          {rows.map((c) => {
            const on = sel === c.id
            const ec = editCfg?.id === c.id ? editCfg : null
            if (ec) {
              return (
                <tr key={c.id} className="border-t border-line bg-brand-soft/40 align-top">
                  <td className={td}><span className="grid h-4 w-4 place-items-center rounded-full border-2 border-brand"><span className="h-2 w-2 rounded-full bg-brand" /></span></td>
                  <td className={`${td} min-w-[130px]`}><Select value={ec.crop} onChange={(v) => setEditCfg({ ...ec, crop: v })} options={opts(["2026/2027", "2025/2026"])} /></td>
                  <td className={`${td} min-w-[140px]`}><Select value={ec.type} onChange={(v) => setEditCfg({ ...ec, type: v })} options={opts(["Virginia", "Burley", "Common"])} /></td>
                  <td className={`${td} min-w-[130px]`}><Select value={ec.node} onChange={(v) => setEditCfg({ ...ec, node: v })} options={opts(["GT 04", "GT 07"])} /></td>
                  <td className={`${td} min-w-[130px]`}><Select value={ec.refClass} onChange={(v) => setEditCfg({ ...ec, refClass: v, internal: `${v}-INT`, sap: sapByRefClass[v] ?? "20000855" })} options={opts(["B01", "B02"])} /></td>
                  <td className={`${td} pt-5 text-muted`}>{ec.internal}</td>
                  <td className={`${td} pt-5 font-600 tabular-nums text-ink`}>{ec.sap}</td>
                  <td className={`${td} min-w-[150px]`}><DatePicker value={ec.from} onChange={(v) => setEditCfg({ ...ec, from: v })} /></td>
                  <td className={`${td} min-w-[150px]`}><DatePicker value={ec.to} onChange={(v) => setEditCfg({ ...ec, to: v })} /></td>
                  <td className={`${td} min-w-[120px]`}><Input type="number" min={0} value={ec.maxPrice || ""} onChange={(e) => setEditCfg({ ...ec, maxPrice: Number(e.target.value) })} className="text-right" /></td>
                  <td className={`${td} min-w-[120px]`}><Input type="number" min={0} value={ec.maxFarmer ?? ""} onChange={(e) => setEditCfg({ ...ec, maxFarmer: e.target.value ? Number(e.target.value) : null })} className="text-right" /></td>
                  <td className={`${td} min-w-[130px]`}><Select value={ec.status} onChange={(v) => setEditCfg({ ...ec, status: v as "Active" | "Inactive" })} options={opts(["Active", "Inactive"])} /></td>
                  <td className={`${td} text-right`}>
                    <span className="inline-flex justify-end gap-1">
                      <button
                        type="button"
                        title="Save"
                        aria-label="Save"
                        onClick={() => {
                          setConfigs((all) => all.map((item) => (item.id === ec.id ? ec : item)))
                          setEditCfg(null)
                          toast({ tone: "success", title: "Configuration updated", body: `${ec.type} ${ec.refClass} (${ec.status}) saved.` })
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white transition hover:bg-brand/90"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        type="button"
                        title="Cancel"
                        aria-label="Cancel"
                        onClick={() => setEditCfg(null)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
                      >
                        <X size={15} />
                      </button>
                    </span>
                  </td>
                </tr>
              )
            }
            return (
              <tr key={c.id} onClick={() => setSel(c.id)} className={`cursor-pointer border-t border-line transition ${on ? "bg-brand-soft/50" : "hover:bg-canvas/60"}`}>
                <td className={td}><span className={`grid h-4 w-4 place-items-center rounded-full border-2 ${on ? "border-brand" : "border-line"}`}>{on && <span className="h-2 w-2 rounded-full bg-brand" />}</span></td>
                <td className={td}>{c.crop}</td>
                <td className={`${td} font-600`}>{c.type}</td>
                <td className={td}>{c.node}</td>
                <td className={`${td} font-700 text-brand`}>{c.refClass}</td>
                <td className={td}>{c.internal}</td>
                <td className={td}>{c.sap ? <span className="tabular-nums">{c.sap}</span> : <span className="inline-flex items-center gap-1 rounded-md bg-[#fdecec] px-2 py-0.5 text-[12px] font-700 text-[#c23b3b]"><AlertTriangle size={11} /> Missing</span>}</td>
                <td className={td}>{fmt(c.from)}</td>
                <td className={td}>{fmt(c.to)}</td>
                <td className={`${td} text-right font-700 tabular-nums`}>{money(c.maxPrice)}</td>
                <td className={`${td} text-right tabular-nums ${c.maxFarmer ? "font-700" : "text-muted"}`}>{c.maxFarmer ? money(c.maxFarmer) : "Not set"}</td>
                <td className={td}><Badge tone={c.status === "Active" ? "green" : "neutral"}>{c.status}</Badge></td>
                <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    title="Edit configuration"
                    aria-label="Edit configuration"
                    onClick={() => setEditCfg({ ...c })}
                    className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
                  >
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr className="border-t border-line"><td colSpan={13} className="px-3 py-10 text-center text-muted">No configurations match the filters.</td></tr>}
        </tbody>
      </TableCard>

      <Card className="p-5">
        <h3 className="text-[15px] font-800 text-ink">Cost appropriation on SAP</h3>
        <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Appropriate the cost by"><Select value={by} onChange={(v) => { setBy(v); toast({ tone: "success", title: "Cost appropriation updated", body: `Every complementary document now appropriates as ${v.toLowerCase()}.` }) }} options={opts(["Price based", "Quantity based"])} /></Field>
          <Field label="Set for"><Input value="Every complementary document" disabled /></Field>
          <Field label="Last changed"><Input value="28/09/2026" disabled /></Field>
          <Field label="By"><Input value="User 3110" disabled /></Field>
        </div>
      </Card>

      <ConfirmAddModal open={confirmAdd && !!add} title="Save new configuration?" onCancel={() => setConfirmAdd(false)} onConfirm={saveAdd}
        body={add && <>Allow <b className="text-ink">{add.type} {add.refClass}</b> on <b className="text-ink">{add.node}</b> for crop {add.crop}?</>} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Load detail                                                         */
/* ------------------------------------------------------------------ */

type DocStatus = "Invoice OK" | "Pending" | "Critical"
type FarmerDoc = { farmer: string; contract: string; invoice: string; series: string; type: "EN" | "DN" | "EC" | "ON" | "RC"; bales: number | null; kg: number | null; returned: number | null; amount: number; status: DocStatus; poSent: string; po: string; sap: string; issue: string }
const DOC_TYPE: Record<FarmerDoc["type"], string> = { EN: "Purchase", DN: "Return", EC: "Contingency", ON: "Overprice", RC: "Rebuy" }
const FARMER_DOCS: FarmerDoc[] = [
  { farmer: "Farmer 00052103", contract: "CT-104120", invoice: "771402", series: "11", type: "EN", bales: 54, kg: 3090, returned: null, amount: 41715, status: "Invoice OK", poSent: "29/09 10:44", po: "4600911204", sap: "29/09 12:02", issue: "" },
  { farmer: "Farmer 00052107", contract: "CT-104127", invoice: "", series: "", type: "EN", bales: 22, kg: 1260, returned: null, amount: 17010, status: "Critical", poSent: "", po: "", sap: "", issue: "Plot not registered" },
  { farmer: "Farmer 00052112", contract: "CT-104132", invoice: "771403", series: "11", type: "EN", bales: 25, kg: 1430, returned: null, amount: 19305, status: "Invoice OK", poSent: "29/09 10:44", po: "4600911205", sap: "29/09 12:02", issue: "" },
  { farmer: "Farmer 00052118", contract: "CT-104138", invoice: "771404", series: "11", type: "EN", bales: 19, kg: 1085, returned: null, amount: 14647.5, status: "Pending", poSent: "", po: "", sap: "", issue: "Access key not found - 217" },
  { farmer: "Farmer 00052124", contract: "CT-104144", invoice: "771405", series: "11", type: "EN", bales: 30, kg: 1715, returned: 340, amount: 23152.5, status: "Invoice OK", poSent: "29/09 10:45", po: "4600911206", sap: "29/09 12:02", issue: "" },
  { farmer: "Farmer 00052133", contract: "CT-104153", invoice: "771407", series: "11", type: "EN", bales: 41, kg: 2345, returned: null, amount: 31657.5, status: "Pending", poSent: "29/09 10:45", po: "", sap: "", issue: "No PO return - 52 min" },
  { farmer: "Farmer 00052140", contract: "CT-104160", invoice: "", series: "", type: "EN", bales: 22, kg: 1255, returned: null, amount: 16942.5, status: "Critical", poSent: "", po: "", sap: "", issue: "Declared 24 bales, bought 22" },
  { farmer: "Farmer 00052151", contract: "CT-104171", invoice: "771409", series: "11", type: "ON", bales: null, kg: null, returned: null, amount: 1240, status: "Invoice OK", poSent: "", po: "", sap: "29/09 12:02", issue: "" },
]
const DOC_TONE: Record<DocStatus, "green" | "red" | "amber"> = { "Invoice OK": "green", Pending: "amber", Critical: "red" }

/* ------------------------------------------------------------------ */
/* Load timeline                                                       */
/* ------------------------------------------------------------------ */

type Step = { label: string; time: string; warn?: boolean }
const LOAD_STEPS: Step[] = [
  { label: "Channel time", time: "06:12" }, { label: "Closing time", time: "09:48" }, { label: "Acceptance", time: "10:21" },
  { label: "Queue", time: "10:33" }, { label: "Generation end", time: "10:42" }, { label: "Enveloped", time: "11:41" },
]
const INVOICE_STEPS: Step[] = [
  { label: "Sent to SEFAZ", time: "10:44" }, { label: "Authorized", time: "10:52", warn: true }, { label: "Update", time: "10:55" },
  { label: "Credit", time: "11:02" }, { label: "Payment analysis", time: "11:09" }, { label: "Statement", time: "11:14" }, { label: "Ready to print", time: "11:18" },
]
const ELAPSED: { label: string; value: string; total?: boolean }[] = [
  { label: "Time in the channel", value: "3:35:35" }, { label: "Time in the invoicing room", value: "0:32:51" }, { label: "Waiting in the queue", value: "0:12:27" },
  { label: "Generation delay", value: "0:19:44" }, { label: "Submission delay", value: "0:08:21" }, { label: "Longest single invoice", value: "0:04:19" },
  { label: "Update delay", value: "0:06:55" }, { label: "SEFAZ delay, total", value: "0:19:12" }, { label: "Credit delay", value: "0:07:16" },
  { label: "Analysis delay", value: "0:11:02" }, { label: "Analysis per invoice, average", value: "0:00:22" }, { label: "Statement delay", value: "0:04:41" },
  { label: "File generation delay", value: "0:03:58" }, { label: "Total invoice delay", value: "0:45:19", total: true },
]
const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m }
const gap = (a: string, b: string) => { const d = mins(b) - mins(a); return d >= 60 ? `${Math.floor(d / 60)}h ${String(d % 60).padStart(2, "0")}m` : `${d}m` }

/* One phase: a proportional bar (each segment = time between two milestones) above the milestone list. */
function Track({ title, steps, span }: { title: string; steps: Step[]; span: string }) {
  const total = Math.max(1, mins(steps[steps.length - 1].time) - mins(steps[0].time))
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-800 text-ink">{title}</h3>
        <p className="text-[13px] text-muted"><span className="tabular-nums">{steps[0].time} – {steps[steps.length - 1].time}</span> · <span className="font-700 text-ink">{span}</span></p>
      </div>
      <div className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
        {steps.slice(1).map((st, i) => (
          <span key={st.label} title={`${steps[i].label} → ${st.label}: ${gap(steps[i].time, st.time)}`} style={{ flexGrow: Math.max(1, mins(st.time) - mins(steps[i].time)) / total * 100 }}
            className={st.warn ? "bg-[#d69e2e]" : "bg-brand/70"} />
        ))}
      </div>
      <ol className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 xl:grid-cols-7">
        {steps.map((st, i) => (
          <li key={st.label} className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-500 text-muted"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.warn ? "bg-[#d69e2e]" : "bg-brand"}`} /><span className="truncate">{st.label}</span></p>
            <p className={`mt-1 text-[16px] font-800 tabular-nums ${st.warn ? "text-[#9a6a12]" : "text-ink"}`}>{st.time}</p>
            <p className={`text-[11.5px] font-600 ${st.warn ? "text-[#9a6a12]" : "text-muted"}`}>{st.warn ? "Slower than usual" : i ? `+${gap(steps[i - 1].time, st.time)}` : "Start"}</p>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function LoadTimeline({ load: l, onBack }: { load: Load; onBack: () => void }) {
  const [all, setAll] = useState(false)
  const key = ["Time in the channel", "Time in the invoicing room", "SEFAZ delay, total"]
  const total = ELAPSED.find((e) => e.total)!
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<"queue" | "timeline"> value="timeline" onChange={(v) => v !== "timeline" && onBack()} items={[{ key: "queue", label: "Queue view" }, { key: "timeline", label: "Timeline" }]} />
        <span className="inline-flex items-center gap-1.5 text-[13px] font-700 text-[#187247]"><Check size={15} /> Released at {LOAD_STEPS[LOAD_STEPS.length - 1].time}</span>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[12.5px] font-500 text-muted">{l.id} · {fmt(l.date)} · {l.transporter} · {l.plate} · {l.unit}</p>
            <p className="mt-2 text-[12.5px] font-600 text-muted">Total load time</p>
            <p className="text-[34px] font-800 leading-none tracking-tight text-ink tabular-nums">5:06:12</p>
          </div>
          <div className="flex flex-wrap gap-8">
            {[...ELAPSED.filter((e) => key.includes(e.label)), total].map((e) => (
              <div key={e.label}>
                <p className="text-[12.5px] font-500 text-muted">{e.label.replace(", total", "")}</p>
                <p className={`mt-1 text-[20px] font-800 tabular-nums ${e.total ? "text-brand" : "text-ink"}`}>{e.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Track title="Load" steps={LOAD_STEPS} span={gap(LOAD_STEPS[0].time, LOAD_STEPS[LOAD_STEPS.length - 1].time)} />
      <Track title="Invoices" steps={INVOICE_STEPS} span={gap(INVOICE_STEPS[0].time, INVOICE_STEPS[INVOICE_STEPS.length - 1].time)} />

      <Card className="overflow-hidden">
        <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all} className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-canvas/60">
          <span className="text-[15px] font-800 text-ink">All elapsed times <span className="ml-1 font-600 text-muted">{ELAPSED.length}</span></span>
          <ChevronDown size={18} className={`text-muted transition ${all ? "rotate-180" : ""}`} />
        </button>
        {all && (
          <dl className="grid border-t border-line sm:grid-cols-2 xl:grid-cols-3">
            {ELAPSED.map((e) => (
              <div key={e.label} className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 text-[13.5px]">
                <dt className={e.total ? "font-700 text-ink" : "text-ink-soft"}>{e.label}</dt>
                <dd className={`font-700 tabular-nums ${e.total ? "text-brand" : "text-ink"}`}>{e.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </div>
  )
}

function LoadDetail({ load: l, onHistory, onInvoice, onPaymentAnalysis, onTimeline, focusExceptions = false }: { load: Load; onHistory: () => void; onInvoice: (id: string) => void; onPaymentAnalysis: (farmer: string) => void; onTimeline: () => void; focusExceptions?: boolean }) {
  const toast = useToast()
  /* Open exceptions of this load, worked per farmer. Resolved ones live in the audit trail. */
  const loadEx = EXCEPTIONS.filter((e) => e.load === l.id && e.status === "Open")
  const [exCat, setExCat] = useState<ExCategory | "All">("All")
  const [onlyEx, setOnlyEx] = useState(focusExceptions)
  const [fix, setFix] = useState<ExceptionRow | null>(null)
  const [note, setNote] = useState<ExceptionRow | null>(null)
  const exOf = (farmer: string) => loadEx.filter((e) => e.farmer === farmer && (exCat === "All" || e.category === exCat))
  const [openFarmer, setOpenFarmer] = useState<string | null>(() => (focusExceptions ? FARMER_DOCS.find((d) => loadEx.some((e) => e.farmer === d.farmer))?.farmer ?? null : null))
  const unlinked = loadEx.filter((e) => !FARMER_DOCS.some((d) => d.farmer === e.farmer) && (exCat === "All" || e.category === exCat))
  const [picked, setPicked] = useState<string[]>([])
  const [reverseOpen, setReverseOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [formats, setFormats] = useState<string[]>(["XML", "DANFE"])
  const [filters, setFilters] = useState(false)
  const [status, setStatus] = useState("All")
  const docs = FARMER_DOCS.filter((d) => (status === "All" || d.status === status) && (!onlyEx || exOf(d.farmer).length > 0))
  const withInvoice = docs.filter((d) => d.invoice)
  const allOn = withInvoice.length > 0 && withInvoice.every((d) => picked.includes(d.invoice))
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const act = (title: string, body: string) => toast({ tone: "info", title, body })
  const exceptionsActive = (onlyEx || openFarmer !== null) && loadEx.length > 0

  const sum = (k: "bales" | "kg" | "returned" | "amount") => docs.reduce((n, d) => n + (d[k] ?? 0), 0)
  const toneText = (t: "green" | "red" | "amber") => (t === "red" ? "text-[#c23b3b]" : t === "amber" ? "text-[#9a6a12]" : "text-ink")
  const pickCat = (c: ExCategory | "All") => { setExCat(c); if (c !== "All") setOnlyEx(true) }
  const iconBtn = "grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
  /* One compact line per exception: what is wrong, how long it waits, and the icon actions used across the app. */
  const exCard = (e: ExceptionRow) => {
    const canResubmit = e.category === "Authority" && e.reprocess
    return (
      <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${e.category === "Integration" ? "bg-[#d99a1e]" : "bg-[#c23b3b]"}`} />
        <span className={`w-[104px] shrink-0 text-[12.5px] font-700 ${CAT_TONE[e.category].text}`}>{e.category}</span>
        <p className="min-w-0 flex-1 truncate text-[13px] text-ink" title={`${e.description} - ${e.action}`}>
          <span className="font-700">{e.description}</span>
          <span className="text-muted"> · Code {e.code}{e.invoice ? ` · Invoice ${e.invoice}` : ""} · {e.action}</span>
        </p>
        <span className={`w-[72px] shrink-0 text-right text-[12.5px] font-700 tabular-nums ${e.agingMin >= 120 ? "text-[#c23b3b]" : "text-ink-soft"}`}>{aging(e.agingMin)}</span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" title={FIX_DEST[e.category].label} aria-label={`${FIX_DEST[e.category].label} for ${e.id}`} onClick={() => (e.code === "AG-118" ? setFix(e) : setNote(e))} className={iconBtn}><ExternalLink size={15} /></button>
          <button type="button" title={canResubmit ? "Resubmit to the authority" : "Resubmit not available"} aria-label={`Resubmit ${e.id}`} disabled={!canResubmit} onClick={() => toast({ tone: "success", title: "Resubmitted", body: `Invoice ${e.invoice} sent to the authority again.` })} className={`${iconBtn} disabled:pointer-events-none disabled:opacity-30`}><RefreshCw size={15} /></button>
          <button type="button" title="Audit trail" aria-label={`Audit trail ${e.id}`} onClick={() => act(`Audit trail ${e.id}`, "Opens the audit trail of this exception.")} className={iconBtn}><History size={15} /></button>
        </div>
      </div>
    )
  }

  if (fix) return <FarmerRegister e={fix} onBack={() => setFix(null)} />
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<"queue" | "timeline"> value={"queue"} onChange={(v) => v !== "queue" && onTimeline()} items={[{ key: "queue", label: "Queue view" }, { key: "timeline", label: "Timeline" }]} />
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            disabled={!picked.length && !exceptionsActive}
            onClick={() => {
              if (exceptionsActive && !picked.length) {
                setFormats(["Exceptions"])
              } else if (exceptionsActive) {
                setFormats(["XML", "DANFE", "Exceptions"])
              } else {
                setFormats(["XML", "DANFE"])
              }
              setExportOpen(true)
            }}
          >
            Export
          </Button>
          <Button variant="outline" disabled={!picked.length} onClick={() => act("Print", `${picked.length} documents sent to the printer.`)}>Print</Button>
          <Button variant="outline" onClick={onHistory}><History size={16} /> Reversal history</Button>
          <Button disabled={!picked.length} onClick={() => setReverseOpen(true)}><RotateCcw size={16} /> Reverse</Button>
        </div>
      </div>
      {reverseOpen && <ReverseDialog invoices={picked} onClose={() => setReverseOpen(false)} onDone={() => { setReverseOpen(false); setPicked([]) }} />}

      <Card className="p-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 xl:grid-cols-8">
          {[["Load", l.id], ["Movement date", fmt(l.date)], ["Transporter", l.transporter], ["License plate", l.plate], ["Buying unit", l.unit], ["Crop", l.crop], ["Tobacco type", l.type], ["Masters", String(l.masters)]].map(([k, v]) => (
            <div key={k} className="min-w-0"><p className="text-[12px] font-500 text-muted">{k}</p><p className="mt-1 truncate text-[14px] font-700 text-ink">{v}</p></div>
          ))}
        </div>
      </Card>

      {loadEx.length === 0 ? (
        <Card className="flex items-center gap-2.5 px-5 py-3.5 text-[13.5px] font-700 text-[#1a7a45]"><Check size={16} /> No open exceptions on this load</Card>
      ) : (
        <Card className="flex flex-wrap items-center gap-2 px-5 py-3.5">
          <span className="mr-1 flex items-center gap-2 text-[13.5px] font-800 text-ink"><AlertTriangle size={16} className="text-[#c23b3b]" /> Open exceptions <span className="tabular-nums">{loadEx.length}</span></span>
          {(["All", "Validation", "Authority", "Integration"] as const).map((c) => {
            const n = c === "All" ? loadEx.length : loadEx.filter((e) => e.category === c).length
            const on = exCat === c
            return (
              <button key={c} type="button" disabled={c !== "All" && !n} onClick={() => pickCat(c)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-700 transition disabled:opacity-40 ${on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand"}`}>
                {c} <span className={`tabular-nums ${on ? "text-white/80" : "text-muted"}`}>{n}</span>
              </button>
            )
          })}
        </Card>
      )}

      <TableCard minWidth={1500} maxHeight="calc(100vh - 220px)" header={
        <div className="border-b border-line px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] font-800 text-ink">Farmers and documents</p>
            {loadEx.length > 0 && <Checkbox checked={onlyEx} onChange={() => setOnlyEx((v) => !v)} label="Only farmers with exceptions" />}
          </div>
          {filters && (
            <div className="mt-3 w-[200px]">
              <Field label="Status"><Select value={status} onChange={setStatus} options={opts(["All", "Invoice OK", "Pending", "Critical"])} /></Field>
            </div>
          )}
        </div>
      }>
        <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
          <tr>
            <th className={`${th} w-10`}><input type="checkbox" aria-label="Select all" checked={allOn} onChange={() => setPicked(allOn ? [] : withInvoice.map((d) => d.invoice))} className="h-4 w-4" /></th>
            {["Farmer", "Contract ID", "Invoice", "Series", "Type"].map((h) => <th key={h} className={th}>{h}</th>)}
            {["Bales", "Purchased kg", "Returned kg", "Amount"].map((h) => <th key={h} className={`${th} text-right`}>{h}</th>)}
            {["PO number", "PO generated", "PO sent to SAP", "Exceptions", "Status"].map((h) => <th key={h} className={th}>{h}</th>)}
            <th className={`${th} text-center`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => {
            const on = !!d.invoice && picked.includes(d.invoice)
            const tone = DOC_TONE[d.status]
            const ex = exOf(d.farmer)
            const expanded = openFarmer === d.farmer && ex.length > 0
            return (
              <Fragment key={d.farmer}>
              <tr className={`border-t border-line transition ${on ? "bg-brand-soft/50" : expanded ? "bg-[#fdf5f5]" : "hover:bg-canvas/60"}`}>
                <td className={td}><input type="checkbox" aria-label={`Select ${d.farmer}`} checked={on} disabled={!d.invoice} onChange={() => toggle(d.invoice)} className="h-4 w-4 disabled:opacity-30" /></td>
                <td className={`${td} font-700 ${toneText(tone)}`}>{d.farmer}</td>
                <td className={`${td} font-600 ${toneText(tone)}`}>{d.contract}</td>
                <td className={td}>{d.invoice ? <span className="font-700 text-brand">{d.invoice}</span> : dash()}</td>
                <td className={td}>{d.series || dash()}</td>
                <td className={`${td} font-700 ${d.type === "ON" ? "text-[#5b3fa8]" : "text-ink"}`}>{d.type}</td>
                <td className={`${td} text-right tabular-nums`}>{d.bales ?? dash()}</td>
                <td className={`${td} text-right tabular-nums`}>{d.kg ? d.kg.toLocaleString("en-US") : dash()}</td>
                <td className={`${td} text-right tabular-nums ${d.returned && d.kg ? "font-700 text-[#9a6a12]" : ""}`}>{d.returned ? d.returned.toLocaleString("en-US") : dash()}</td>
                <td className={`${td} text-right tabular-nums`}>{money(d.amount)}</td>
                <td className={`${td} tabular-nums`}>{d.po || dash()}</td>
                <td className={td}>{d.poSent || dash()}</td>
                <td className={td}>{d.sap || dash()}</td>
                <td className={td}>{ex.length ? (
                  <button type="button" aria-expanded={expanded} onClick={() => setOpenFarmer(expanded ? null : d.farmer)} title={d.issue || undefined}
                    className="inline-flex h-7 items-center gap-1 rounded-full border border-[#f4c9c9] bg-[#fdecec] pl-2 pr-1.5 text-[12px] font-700 text-[#c23b3b] transition hover:border-[#c23b3b]">
                    <AlertTriangle size={12} /><span className="tabular-nums">{ex.length}</span><ChevronDown size={13} className={`transition ${expanded ? "rotate-180" : ""}`} />
                  </button>
                ) : dash()}</td>
                <td className={`${td} font-700 ${tone === "green" ? "text-[#1a7a45]" : toneText(tone)}`}>{d.status}</td>
                <td className={`${td} whitespace-nowrap text-center`}>
                  <div className="inline-flex items-center gap-1">
                    <span title={d.invoice ? `Open invoice ${d.invoice}` : "No invoice issued"} className="inline-flex"><button type="button" aria-label={`Invoice ${d.invoice || d.farmer}`} disabled={!d.invoice} onClick={() => onInvoice(d.invoice)} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted"><Receipt size={15} /></button></span>
                    <span title="Open payment analysis log" className="inline-flex"><button type="button" aria-label={`Payment analysis ${d.farmer}`} onClick={() => onPaymentAnalysis(d.farmer)} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted"><Coins size={15} /></button></span>
                  </div>
                </td>
              </tr>
              {expanded && (
                <tr className="bg-[#fdf5f5]">
                  <td colSpan={16} className="px-5 pb-3 pt-0">
                    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">{ex.map(exCard)}</div>
                  </td>
                </tr>
              )}
              </Fragment>
            )
          })}
        </tbody>
        <tfoot className="sticky bottom-0 z-10">
          <tr className="bg-canvas font-800 text-ink shadow-[0_-1px_0_#e3e8ef,0_-4px_8px_rgba(15,30,61,0.06)]">
            <td className={td} />
            <td className={td} colSpan={5}>Load total</td>
            <td className={`${td} text-right tabular-nums`}>{sum("bales").toLocaleString("en-US")}</td>
            <td className={`${td} text-right tabular-nums`}>{sum("kg").toLocaleString("en-US")}</td>
            <td className={`${td} text-right tabular-nums`}>{sum("returned").toLocaleString("en-US")}</td>
            <td className={`${td} text-right tabular-nums`}>{money(sum("amount"))}</td>
            <td className={td} colSpan={6} />
          </tr>
        </tfoot>
      </TableCard>

      {unlinked.length > 0 && (
        <Card className="p-5">
          <p className="mb-3 text-[14px] font-800 text-ink">Other exceptions on this load <span className="font-600 text-muted">{unlinked.length}</span></p>
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">{unlinked.map((e) => <div key={e.id} className="flex items-center"><span className="w-[150px] shrink-0 pl-4 text-[12.5px] font-700 text-ink-soft">{e.farmer}</span><div className="min-w-0 flex-1">{exCard(e)}</div></div>)}</div>
        </Card>
      )}
      {note && <CorrectionModal e={note} onClose={() => setNote(null)} />}

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export invoices" width="max-w-md">
        <p className="text-[13px] text-muted">Choose which files to export for the {picked.length} selected invoice{picked.length === 1 ? "" : "s"}.</p>
        <div className="mt-4 space-y-2.5">
          {[
            ...(picked.length > 0 ? [["XML", "Authorised electronic invoice file"], ["DANFE", "Printable PDF of the invoice"]] : []),
            ...(exceptionsActive ? [["Exceptions", `Open exceptions of this load (${loadEx.length}) as Excel`]] : []),
          ].map(([k, hint]) => {
            const on = formats.includes(k)
            return (
              <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${on ? "border-brand bg-brand-soft/40" : "border-line hover:bg-canvas"}`}>
                <Checkbox checked={on} onChange={() => setFormats((f) => (on ? f.filter((x) => x !== k) : [...f, k]))} />
                <span><span className="block text-[14px] font-700 text-ink">{k}</span><span className="block text-[12.5px] text-muted">{hint}</span></span>
              </label>
            )
          })}
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
          <Button disabled={!formats.length} onClick={() => { toast({ tone: "success", title: "Export started", body: `${formats.join(" and ")} exported${picked.length ? ` for ${picked.join(", ")}` : ` for ${l.id}`}.` }); setExportOpen(false) }}>Export</Button>
        </div>
      </Modal>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Reversal                                                            */
/* ------------------------------------------------------------------ */

const REVERSAL_HISTORY = [
  { at: "29/09 11:58", invoice: "771399", farmer: "Farmer 00052301", reason: "Price not confirmed at closing", by: "User 7712", auth: "Supervisor", reissued: "771408", origin: "Requested by Buying" },
  { at: "28/09 17:30", invoice: "771361", farmer: "Farmer 00052288", reason: "Denied by the authority", by: "User 7712", auth: "Supervisor", reissued: "771362", origin: "Requested by Buying" },
]

type RevRow = FarmerDoc & { load: string; transporter: string; plate: string }
/** Rows that never reached an authorised invoice can't be reversed. */
const revBlocked = (d: FarmerDoc) => !d.invoice || d.status === "Pending" || d.status === "Critical"
/** The paired return invoice (DN) issued with a purchase that carried returned volume. */
const pairOf = (d: FarmerDoc): FarmerDoc | null => (d.type === "EN" && d.returned && d.invoice
  ? { ...d, invoice: String(Number(d.invoice) + 1), type: "DN", bales: null, kg: d.returned, returned: null, amount: d.returned * 46.3, po: "", poSent: "" }
  : null)
const revDocs = (): FarmerDoc[] => FARMER_DOCS.flatMap((d) => { const p = pairOf(d); return p ? [d, p] : [d] })

type RevFilters = { crop: string; from: string; to: string; transporter: string; plate: string; load: string; invoice: string }

function ReverseDialog({ invoices, onClose, onDone }: { invoices: string[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [detail, setDetail] = useState("")
  // Blocked rows are skipped and a return invoice always travels with its purchase.
  const sel = [...new Set(invoices.flatMap((inv) => {
    const d = FARMER_DOCS.find((x) => x.invoice === inv)
    if (!d || revBlocked(d)) return []
    const p = pairOf(d)
    return [d, ...(p ? [p] : [])]
  }))]
  const pos = sel.filter((d) => d.po)
  const list = sel.map((d) => d.invoice).join(", ")

  return (
    <Modal open onClose={onClose} title={`Reverse ${sel.length} invoice${sel.length === 1 ? "" : "s"}?`} width="max-w-lg">
      {sel.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-ink-soft">The selected rows have no authorised invoice, so they can't be reversed.</p>
      ) : (<>
        <p className="text-[14px] leading-relaxed text-ink-soft">Every transaction already done for <b className="text-ink">{list}</b> is reversed:</p>
        <ul className="mt-3 space-y-2 text-[13.5px] text-ink-soft">
          <li className="flex gap-2"><Coins size={15} className="mt-0.5 shrink-0 text-brand" /> Credit allocation and generated information are undone.</li>
          <li className="flex gap-2"><Send size={15} className="mt-0.5 shrink-0 text-brand" /> The cancellation status is sent to SEFAZ.</li>
          <li className="flex gap-2"><Receipt size={15} className="mt-0.5 shrink-0 text-brand" /> {pos.length ? `A PO is created to cancel the original buying PO (${pos.map((d) => d.po).join(", ")}).` : "No buying PO to cancel for the selection."}</li>
        </ul>
        <div className="mt-5">
          <Field label="Comments"><Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="What went wrong" /></Field>
        </div>
      </>)}
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={!sel.length || !detail.trim()} onClick={() => { toast({ tone: "success", title: "Reversal sent", body: `${list} reversal requested.` }); onDone() }}><RotateCcw size={16} /> Confirm reversal</Button>
      </div>
    </Modal>
  )
}

function ReversalHistory() {
  return (
    <TableCard minWidth={1100} header={<div className="border-b border-line px-5 py-3.5"><p className="text-[14px] font-800 text-ink">Reversal history <span className="font-500 text-muted">· {REVERSAL_HISTORY.length} reversals</span></p></div>}>
      <Head cols={["Timestamp", "Invoice", "Farmer", "Reason", "Requested by", "Authorised by", "Reissued as", "Origin"]} />
      <tbody>
        {REVERSAL_HISTORY.map((h) => (
          <tr key={h.invoice} className="border-t border-line">
            <td className={td}>{h.at}</td><td className={`${td} font-700 text-ink`}>{h.invoice}</td><td className={td}>{h.farmer}</td><td className={td}>{h.reason}</td>
            <td className={td}>{h.by}</td><td className={td}>{h.auth}</td><td className={`${td} font-700 text-brand`}>{h.reissued}</td><td className={td}>{h.origin}</td>
          </tr>
        ))}
      </tbody>
    </TableCard>
  )
}

/* ------------------------------------------------------------------ */
/* Invoice items                                                       */
/* ------------------------------------------------------------------ */

const ITEM_LINES = [
  { line: "00010", cls: "B01", ext: "20000855", icls: "B01-INT", imat: "20000605", plant: "BRCE", storage: "A104", bales: 27, kg: 1545, price: 15, net: 23175, tax: "ICM3" },
  { line: "00020", cls: "B02", ext: "20000856", icls: "B02-INT", imat: "20000606", plant: "BRCE", storage: "A104", bales: 27, kg: 1545, price: 12, net: 18540, tax: "ICM3" },
]

function InvoiceItems({ load: l, doc: d }: { load: Load; doc: FarmerDoc }) {
  const toast = useToast()
  const bales = ITEM_LINES.reduce((n, i) => n + i.bales, 0)
  const kg = ITEM_LINES.reduce((n, i) => n + i.kg, 0)
  const net = ITEM_LINES.reduce((n, i) => n + i.net, 0)
  const num = (n: number) => n.toLocaleString("en-US")
  const tone = DOC_TONE[d.status]
  const statusCls = tone === "green" ? "border-[#bfe3c9] bg-[#eaf7ee] text-[#1f7a3d]" : tone === "red" ? "border-[#f4c9c9] bg-[#fdecec] text-[#c23b3b]" : "border-[#f1dcae] bg-[#fff6e5] text-[#9a6a12]"
  const facts: [string, React.ReactNode][] = [
    ["Series", d.series], ["Type", `${d.type} · ${DOC_TYPE[d.type]}`], ["Plot", "12A"], ["Buying unit", l.unit],
    ["PO number", d.po ? <span className="inline-flex items-center gap-1.5 text-[#1f7a3d]"><Check size={14} /> {d.po}</span> : <span className="text-muted">Pending</span>],
    ["Bales", String(d.bales ?? "-")], ["Kilos", d.kg ? num(d.kg) : "-"],
  ]

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Receipt size={20} /></span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[20px] font-800 leading-tight text-ink tabular-nums">Invoice {d.invoice}</p>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-700 ${statusCls}`}>{d.status}</span>
              </div>
              <p className="mt-0.5 truncate text-[13px] text-muted">{d.farmer} · Contract {d.contract} · Load {l.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right"><p className="text-[12px] font-500 text-muted">Amount</p><p className="text-[20px] font-800 leading-tight text-ink tabular-nums">{money(d.amount)}</p></div>
            <a href={sampleInvoice} download={`invoice-${d.invoice}.pdf`} onClick={() => toast({ tone: "success", title: "Invoice downloaded", body: `Invoice ${d.invoice} downloaded as PDF.` })} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-[14px] font-700 text-white transition hover:opacity-90"><FileText size={16} /> Download invoice</a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-4 xl:grid-cols-7">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0"><p className="text-[12px] font-500 text-muted">{k}</p><p className="mt-1 truncate text-[14px] font-700 text-ink tabular-nums">{v}</p></div>
          ))}
        </div>
      </Card>

      <TableCard minWidth={1300} header={
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <p className="text-[14px] font-800 text-ink">The item lines <span className="font-500 text-muted">· one per class, as the file will carry them</span></p>
        </div>
      }>
        <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
          <tr>
            {["Line", "Purchase class", "External material", "Internal class", "Internal material", "Plant", "Storage"].map((h) => <th key={h} className={th}>{h}</th>)}
            {["Bales", "Kilos", "Price per kg", "Net value"].map((h) => <th key={h} className={`${th} text-right`}>{h}</th>)}
            <th className={th}>Tax code</th>
          </tr>
        </thead>
        <tbody>
          {ITEM_LINES.map((i) => (
            <tr key={i.line} className="border-t border-line">
              <td className={td}>{i.line}</td>
              <td className={`${td} font-700 text-brand`}>{i.cls}</td>
              <td className={`${td} font-600 text-ink`}>{i.ext}</td>
              <td className={td}>{i.icls}</td>
              <td className={`${td} font-600 text-ink`}>{i.imat}</td>
              <td className={td}>{i.plant}</td>
              <td className={td}>{i.storage}</td>
              <td className={`${td} text-right tabular-nums`}>{i.bales}</td>
              <td className={`${td} text-right tabular-nums`}>{num(i.kg)}</td>
              <td className={`${td} text-right tabular-nums`}>{i.price.toFixed(2)}</td>
              <td className={`${td} text-right font-700 tabular-nums`}>{money(i.net)}</td>
              <td className={td}>{i.tax}</td>
            </tr>
          ))}
          <tr className="border-t border-line bg-canvas font-700 text-ink">
            <td className={td} colSpan={7}>Total</td>
            <td className={`${td} text-right tabular-nums`}>{bales}</td>
            <td className={`${td} text-right tabular-nums`}>{num(kg)}</td>
            <td className={`${td} text-right tabular-nums`}>{(net / kg).toFixed(2)} avg</td>
            <td className={`${td} text-right tabular-nums`}>{money(net)}</td>
            <td className={td} />
          </tr>
        </tbody>
      </TableCard>
    </div>
  )
}

/* Reports & parameters menu screen: one screen with a tab per section. */

export function TobaccoReportsParameters({ onCrumbs }: { onCrumbs?: (c: TobaccoCrumb[]) => void } = {}) {
  const [pSection, setPSection] = useState<PSection>("reports")
  useEffect(() => {
    onCrumbs?.([{ label: "Tobacco parameters", onClick: () => setPSection("reports") }, { label: P_SECTIONS.find((p) => p.key === pSection)!.label }])
  }, [pSection, onCrumbs])
  useEffect(() => () => onCrumbs?.([]), [onCrumbs])
  return <Parameters section={pSection} onSection={setPSection} />
}
