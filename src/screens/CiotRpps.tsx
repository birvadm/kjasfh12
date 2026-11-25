import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Check, ChevronLeft, Clock, ExternalLink, Eye, FileText, History, Link2, Plus, RotateCcw, ShieldCheck, SlidersHorizontal, Boxes, Unlink } from "../components/icons"
import { Badge, Button, Card, DatePicker, Field, Input, Modal, MultiSelect, Select, useToast } from "../components/ui"

export type CiotCrumb = { label: string; onClick?: () => void }

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

type Status = "Auto matched" | "Pending" | "Multiple matches" | "Divergence" | "Manually associated"
type Tone = "green" | "amber" | "red" | "blue" | "neutral"
const STATUS_TONE: Record<Status, Tone> = { "Auto matched": "green", Pending: "blue", "Multiple matches": "amber", Divergence: "red", "Manually associated": "neutral" }
const CLOSED: Status[] = ["Auto matched", "Manually associated"]

type Transporter = { code: string; name: string; taxId: string; type: string }
const TRANSPORTERS: Transporter[] = [
  { code: "384701", name: "Transporter A", taxId: "12.345.678/0001-90", type: "Own fleet" },
  { code: "384798", name: "Transporter B", taxId: "23.456.789/0001-01", type: "Third party" },
  { code: "384812", name: "Transporter C", taxId: "34.567.890/0001-12", type: "Third party" },
]
const byName = (n: string) => TRANSPORTERS.find((t) => t.name === n)!
/* Units assigned to the logged-in user. The first is the default; the unit is only selectable with more than one. */
const USER_UNITS = ["Unit 03", "Unit 01", "Unit 02"]
const UNITS = ["Unit 01", "Unit 02", "Unit 03"]

type Ciot = { id: string; issued: string; unit: string; plate: string; transporter: string; weight: number; value: number; origin: string; destination: string; nature: string; load: string; registeredAt: string; registeredBy: string }
type Log = { when: string; event: string; method: "Automatic" | "Manual" | "System"; candidate: string; outcome: string; tone: Tone; paramSet: string; user: string; justification: string }
type Rpps = { id: string; date: string; unit: string; plate: string; transporter: string; nature: string; weight: number; base: number; additional: number; load: string; status: Status; ciot?: string; candidates: string[]; runs: number; reprocessLeft: number; firstRun: string; lastRun: string; log: Log[] }

type IdKey = "plate" | "taxId" | "unit" | "transporterCode" | "nature" | "transporter"
type FieldRule = { cls: "Mandatory" | "Auxiliary"; tie: boolean }
type Params = { scope: string; ttype: string; effective: string; weightKg: number; weightPct: number; valueAbs: number; valuePct: number; dayWindow: number; minAdherence: number; reprocessHours: number; reprocessMax: number; fields: Record<IdKey, FieldRule>; rules?: { field: string; cls: RuleCls }[] }
type RuleCls = "Mandatory" | "Not mandatory"

const DEFAULT_PARAMS: Params = {
  scope: "All units", ttype: "All types", effective: "2026-10-01",
  weightKg: 300, weightPct: 2, valueAbs: 200, valuePct: 5, dayWindow: 3, minAdherence: 80, reprocessHours: 6, reprocessMax: 5,
  fields: {
    plate: { cls: "Mandatory", tie: false },
    taxId: { cls: "Mandatory", tie: false },
    unit: { cls: "Mandatory", tie: false },
    transporterCode: { cls: "Mandatory", tie: false },
    nature: { cls: "Mandatory", tie: false },
    transporter: { cls: "Auxiliary", tie: true },
  },
}

const ID_FIELDS: { key: IdKey; label: string; norm: string }[] = [
  { key: "plate", label: "Plate", norm: "Spaces and punctuation removed" },
  { key: "taxId", label: "Tax id", norm: "Punctuation removed" },
  { key: "unit", label: "Unit", norm: "Not needed" },
  { key: "transporterCode", label: "Transporter code", norm: "Not needed" },
  { key: "nature", label: "Nature", norm: "Case normalised" },
  { key: "transporter", label: "Transporter name", norm: "Case and spacing normalised" },
]

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const opts = (values: string[]) => values.map((value) => ({ value, label: value }))
const th = "px-3 py-3 whitespace-nowrap"
const td = "px-3 py-2.5 whitespace-nowrap"
const fmt = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "-")
const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const kg = (n: number) => n.toLocaleString("en-US")
const mask = (tax: string) => `**.***.***/${tax.slice(11, 15)}-**`
const isoToday = () => new Date().toISOString().slice(0, 10)
const now = () => {
  const d = new Date()
  return `${fmt(isoToday())} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
const days = (a: string, b: string) => Math.round((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
const normAlnum = (s: string) => s.replace(/[^a-z0-9]/gi, "").toUpperCase()
const normText = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase()
const paramSetLabel = (p: Params) => `${p.scope === "All units" && p.ttype === "All types" ? "General" : [p.scope, p.ttype].filter((x) => !x.startsWith("All")).join(" / ")}, from ${fmt(p.effective)}`
const USER = "Finance Analyst"

function idValue(key: IdKey, r: { plate: string; unit: string; transporter: string; nature: string }) {
  const t = byName(r.transporter)
  if (key === "plate") return normAlnum(r.plate)
  if (key === "taxId") return normAlnum(t?.taxId ?? "")
  if (key === "unit") return r.unit
  if (key === "transporterCode") return t?.code ?? ""
  if (key === "nature") return normText(r.nature)
  return normText(r.transporter)
}

type Compare = { weightDiff: number; weightPct: number; weightOk: boolean; valueDiff: number; valuePct: number; valueOk: boolean; dayDiff: number; dayOk: boolean; mandatoryOk: boolean; score: number; idResults: Record<IdKey, boolean> }

function compare(r: Rpps, c: Ciot, p: Params): Compare {
  const weightDiff = r.weight - c.weight
  const weightPct = (weightDiff / c.weight) * 100
  const valueDiff = r.base - c.value
  const valuePct = (valueDiff / c.value) * 100
  // A comparable passes when either its absolute or its percentage limit is met.
  const weightOk = Math.abs(weightDiff) <= p.weightKg || Math.abs(weightPct) <= p.weightPct
  const valueOk = Math.abs(valueDiff) <= p.valueAbs || Math.abs(valuePct) <= p.valuePct
  const dayDiff = days(r.date, c.issued)
  const dayOk = Math.abs(dayDiff) <= p.dayWindow
  const idResults = Object.fromEntries(ID_FIELDS.map((f) => [f.key, idValue(f.key, r) === idValue(f.key, c)])) as Record<IdKey, boolean>
  const mandatoryOk = dayOk && ID_FIELDS.every((f) => p.fields[f.key].cls !== "Mandatory" || idResults[f.key])
  const auxMisses = ID_FIELDS.filter((f) => p.fields[f.key].cls === "Auxiliary" && !idResults[f.key]).length
  return { weightDiff, weightPct, weightOk, valueDiff, valuePct, valueOk, dayDiff, dayOk, mandatoryOk, score: 100 - auxMisses * 20, idResults }
}

const linkedCiots = (all: Rpps[], except?: string) => new Set(all.filter((r) => r.id !== except && CLOSED.includes(r.status) && r.ciot).map((r) => r.ciot!))

/** The routine: mandatory filter, minimum adherence, tolerances, then tie-breaks. */
function runRoutine(r: Rpps, ciots: Ciot[], all: Rpps[], p: Params): { status: Status; candidates: string[]; ciot?: string } {
  const taken = linkedCiots(all, r.id)
  const cands = ciots.filter((c) => !taken.has(c.id)).map((c) => ({ c, x: compare(r, c, p) })).filter(({ x }) => x.mandatoryOk && x.score >= p.minAdherence)
  if (cands.length === 0) return { status: "Pending", candidates: [] }
  let pass = cands.filter(({ x }) => x.weightOk && x.valueOk)
  if (pass.length === 0) {
    const best = [...cands].sort((a, b) => Math.abs(a.x.weightPct) + Math.abs(a.x.valuePct) - Math.abs(b.x.weightPct) - Math.abs(b.x.valuePct))[0]
    return { status: "Divergence", candidates: [best.c.id] }
  }
  if (pass.length > 1 && r.load) {
    const sameLoad = pass.filter(({ c }) => c.load === r.load)
    if (sameLoad.length) pass = sameLoad
  }
  if (pass.length > 1) {
    const min = Math.min(...pass.map(({ x }) => Math.abs(x.dayDiff)))
    pass = pass.filter(({ x }) => Math.abs(x.dayDiff) === min)
  }
  if (pass.length === 1) return { status: "Auto matched", candidates: [pass[0].c.id], ciot: pass[0].c.id }
  return { status: "Multiple matches", candidates: pass.map(({ c }) => c.id) }
}

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

const ci = (id: string, issued: string, unit: string, plate: string, transporter: string, weight: number, value: number, by = "User 2204", load = ""): Ciot => ({
  id, issued, unit, plate, transporter, weight, value, origin: "Santa Cruz do Sul / RS", destination: "Venâncio Aires / RS", nature: "Supplies or tobacco", load, registeredAt: `${fmt(issued)} 14:22`, registeredBy: by,
})
const SEED_CIOTS: Ciot[] = [
  ci("123451", "2026-09-27", "Unit 03", "DEF4G56", "Transporter B", 13900, 4790),
  ci("123456", "2026-09-29", "Unit 03", "ABC1D23", "Transporter A", 13400, 4600),
  ci("123457", "2026-09-30", "Unit 03", "DEF4G56", "Transporter B", 14000, 4800, "User 2204", "LD-44120"),
  ci("123458", "2026-10-02", "Unit 01", "JKL2M34", "Transporter A", 12800, 4300, "User 2211"),
  ci("123459", "2026-10-02", "Unit 01", "JKL2M34", "Transporter A", 12760, 4310, "User 2211"),
  ci("123461", "2026-10-03", "Unit 01", "MNO5P67", "Transporter A", 11900, 3980, "User 2211"),
  ci("123463", "2026-10-04", "Unit 01", "XYZ9K12", "Transporter A", 10650, 3720, "User 2211"),
  ci("123464", "2026-10-04", "Unit 02", "PQR8S90", "Transporter C", 9800, 3100, "User 2230"),
  ci("123466", "2026-10-06", "Unit 01", "QRS3T45", "Transporter A", 11200, 3900, "User 2211"),
]

const L = (when: string, event: string, method: Log["method"], candidate: string, outcome: string, tone: Tone, paramSet = "-", user = "-", justification = "-"): Log => ({ when, event, method, candidate, outcome, tone, paramSet, user, justification })
const GEN_JUL = "General, from 01/07/2026"
const GEN_OCT = "General, from 01/10/2026"
const rp = (r: Omit<Rpps, "nature" | "additional" | "load" | "candidates" | "runs" | "reprocessLeft" | "firstRun" | "lastRun" | "log"> & Partial<Rpps>): Rpps => ({
  nature: "Supplies or tobacco", additional: 0, load: "", candidates: r.ciot ? [r.ciot] : [], runs: 1, reprocessLeft: 4, firstRun: r.date, lastRun: r.date,
  log: [L(`${fmt(r.date)} 18:04`, "Routine run", "Automatic", r.ciot ?? "-", r.status === "Auto matched" ? `Linked to CIOT ${r.ciot}` : r.status, STATUS_TONE[r.status], GEN_OCT)],
  ...r,
})
const SEED_RPPS: Rpps[] = [
  rp({ id: "900140", date: "2026-10-06", unit: "Unit 01", plate: "QRS3T45", transporter: "Transporter A", weight: 10500, base: 3950, status: "Divergence", candidates: ["123466"] }),
  rp({ id: "900142", date: "2026-10-05", unit: "Unit 02", plate: "PQR8S90", transporter: "Transporter C", weight: 9850, base: 3600, status: "Divergence", candidates: ["123464"] }),
  rp({ id: "900124", date: "2026-10-01", unit: "Unit 03", plate: "DEF4G56", transporter: "Transporter B", weight: 13650, base: 5100, additional: 240, load: "LD-44120", status: "Divergence", candidates: ["123457"], runs: 2, reprocessLeft: 3, lastRun: "2026-10-05",
    log: [L("01/10/2026 18:04", "Routine run", "Automatic", "123457", "Divergence", "red", GEN_JUL), L("05/10/2026 06:10", "Reprocess", "Automatic", "123457", "Divergence", "red", GEN_OCT)] }),
  rp({ id: "900137", date: "2026-10-02", unit: "Unit 03", plate: "DEF4G59", transporter: "Transporter B", weight: 13950, base: 4850, status: "Divergence", candidates: ["123457"] }),
  rp({ id: "900123", date: "2026-10-01", unit: "Unit 03", plate: "ABC1D23", transporter: "Transporter A", weight: 13440, base: 4600, status: "Auto matched", ciot: "123456" }),
  rp({ id: "900125", date: "2026-10-02", unit: "Unit 02", plate: "GHI7J89", transporter: "Transporter C", weight: 15180, base: 5240, status: "Pending", runs: 2, reprocessLeft: 3, lastRun: "2026-10-05",
    log: [L("02/10/2026 18:04", "Routine run", "Automatic", "-", "Pending", "blue", GEN_OCT), L("05/10/2026 06:10", "Reprocess", "Automatic", "-", "Pending", "blue", GEN_OCT)] }),
  rp({ id: "900126", date: "2026-10-01", unit: "Unit 03", plate: "DEF4G56", transporter: "Transporter B", weight: 13980, base: 4820, status: "Pending" }),
  rp({ id: "900128", date: "2026-10-03", unit: "Unit 01", plate: "JKL2M34", transporter: "Transporter A", weight: 12790, base: 4300, status: "Multiple matches", candidates: ["123458", "123459"], lastRun: "2026-10-05",
    log: [L("03/10/2026 18:04", "Routine run", "Automatic", "123458, 123459", "Multiple matches", "amber", GEN_OCT)] }),
  rp({ id: "900130", date: "2026-10-01", unit: "Unit 03", plate: "DEF4G56", transporter: "Transporter B", weight: 14200, base: 4900, status: "Pending" }),
  rp({ id: "900119", date: "2026-09-28", unit: "Unit 03", plate: "DEF4G56", transporter: "Transporter B", weight: 13900, base: 4790, status: "Auto matched", ciot: "123451" }),
  rp({ id: "900131", date: "2026-10-04", unit: "Unit 01", plate: "MNO5P67", transporter: "Transporter A", weight: 11880, base: 3980, status: "Auto matched", ciot: "123461" }),
  rp({ id: "900133", date: "2026-10-05", unit: "Unit 02", plate: "STU1V23", transporter: "Transporter C", weight: 8800, base: 2900, status: "Pending" }),
  rp({ id: "900135", date: "2026-10-05", unit: "Unit 01", plate: "XYZ9K12", transporter: "Transporter A", weight: 10200, base: 3500, status: "Manually associated", ciot: "123463",
    log: [L("05/10/2026 18:04", "Routine run", "Automatic", "123463", "Divergence", "red", GEN_OCT), L("06/10/2026 10:15", "Manual association", "Manual", "123463", "Linked to CIOT 123463", "neutral", "-", "User 2204", "Load split at the scale, CIOT covers the full trip.")] }),
]

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function TabStrip<T extends string>({ tabs, value, onChange, right }: { tabs: { key: T; label: string }[]; value: T; onChange: (t: T) => void; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line">
      <div className="flex flex-wrap items-center gap-6">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => onChange(t.key)} className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${value === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {right && <div className="flex items-center gap-2.5 pb-2">{right}</div>}
    </div>
  )
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex min-h-[36px] items-center justify-between gap-4">
      <h3 className="text-[13px] font-700 uppercase tracking-[0.08em] text-brand">{children}</h3>
      {action}
    </div>
  )
}

function TableCard({ children, minWidth = 1100 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]" style={{ minWidth }}>{children}</table>
      </div>
    </div>
  )
}
function Head({ cols, center = [] }: { cols: string[]; center?: string[] }) {
  return (
    <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted">
      <tr>{cols.map((c, i) => <th key={c + i} className={`${th} ${center.includes(c) ? "text-center" : ""}`}>{c}</th>)}</tr>
    </thead>
  )
}

function IconAction({ icon: Icon, label, onClick, disabled }: { icon: typeof Eye; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand disabled:pointer-events-none disabled:opacity-30">
      <Icon size={15} />
    </button>
  )
}

function Summary({ title, items }: { title: string; items: { label: string; value: React.ReactNode }[] }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
        <div className="min-w-[140px]">
          <p className="text-[12.5px] font-500 text-muted">Record</p>
          <p className="mt-1 text-[18px] font-800 text-ink">{title}</p>
        </div>
        {items.map((i) => (
          <div key={i.label}>
            <p className="text-[12.5px] font-500 text-muted">{i.label}</p>
            <div className="mt-1 text-[14px] font-600 text-ink">{i.value}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Diff({ diff, pct, ok, money: isMoney }: { diff: number; pct: number; ok: boolean; money?: boolean }) {
  const sign = diff > 0 ? "+" : ""
  return (
    <span className={`tabular-nums font-600 ${ok ? "text-[#1a7a45]" : "text-[#c23b3b]"}`}>
      {sign}{isMoney ? money(diff) : kg(diff)} / {sign}{pct.toFixed(1)}%
    </span>
  )
}

function Confirm({ open, title, body, confirm, onConfirm, onClose }: { open: boolean; title: string; body: React.ReactNode; confirm: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="text-[14px] leading-relaxed text-ink-soft">{body}</div>
      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { onConfirm(); onClose() }}>{confirm}</Button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

type Tab = "reconciliation" | "register" | "parameters"
const TAB_LABEL: Record<Tab, string> = { reconciliation: "Reconciliation", register: "CIOT register", parameters: "Parameters" }
type View = { kind: "list" } | { kind: "detail"; id: string } | { kind: "audit"; id: string } | { kind: "associate"; ciot?: string; rpps?: string; from: "list" | "detail" | "register" } | { kind: "newparams" } | { kind: "ciot"; id: string }

export default function CiotRpps({ onCrumbs }: { onCrumbs?: (c: CiotCrumb[]) => void } = {}) {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>("register")
  const [view, setView] = useState<View>({ kind: "list" })
  const [ciots, setCiots] = useState<Ciot[]>(SEED_CIOTS)
  const [rpps, setRpps] = useState<Rpps[]>(SEED_RPPS)
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS)
  const [sets, setSets] = useState<Params[]>([DEFAULT_PARAMS, { ...DEFAULT_PARAMS, scope: "Unit 03", ttype: "Legal entity", effective: "2026-10-15", weightKg: 250, dayWindow: 2 }])

  const toList = (t: Tab = tab) => { setTab(t); setView({ kind: "list" }) }
  const viewKey = JSON.stringify(view) + tab
  useEffect(() => {
    if (!onCrumbs) return
    const root = { label: "CIOT & RPPS", onClick: () => toList("register") }
    if (view.kind === "list") onCrumbs(tab === "register" ? [{ label: "CIOT & RPPS" }] : [root, { label: TAB_LABEL[tab] }])
    else if (view.kind === "detail") onCrumbs([root, { label: `RPPS ${view.id}` }])
    else if (view.kind === "ciot") onCrumbs([root, { label: "CIOT register", onClick: () => toList("register") }, { label: `CIOT ${view.id}` }])
    else if (view.kind === "newparams") onCrumbs([root, { label: "Parameters", onClick: () => toList("parameters") }, { label: "New parameter set" }])
    else if (view.kind === "audit") onCrumbs([root, { label: `RPPS ${view.id}`, onClick: () => setView({ kind: "detail", id: view.id }) }, { label: "Audit trail" }])
    else onCrumbs([root, ...(view.rpps && view.from === "detail" ? [{ label: `RPPS ${view.rpps}`, onClick: () => setView({ kind: "detail", id: view.rpps! }) }] : []), { label: "Manual association" }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey, onCrumbs])
  useEffect(() => () => onCrumbs?.([]), [onCrumbs])

  /** Runs the routine on each open record, then drops results whose candidate was taken. */
  const reprocess = (ids: string[]) => {
    const stamp = now()
    const set = paramSetLabel(params)
    let next = rpps.map((r) => ({ ...r }))
    let changed = 0
    for (const id of ids) {
      const i = next.findIndex((r) => r.id === id)
      const r = next[i]
      if (!r || CLOSED.includes(r.status) || r.reprocessLeft <= 0) continue
      const res = runRoutine(r, ciots, next, params)
      if (res.status !== r.status) changed++
      next[i] = { ...r, ...res, runs: r.runs + 1, reprocessLeft: r.reprocessLeft - 1, lastRun: isoToday(),
        log: [...r.log, L(stamp, "Reprocess", "Automatic", res.candidates.join(", ") || "-", res.status === "Auto matched" ? `Linked to CIOT ${res.ciot}` : res.status, STATUS_TONE[res.status], set)] }
    }
    const taken = linkedCiots(next)
    next = next.map((r) => {
      if (CLOSED.includes(r.status) || !r.candidates.some((c) => taken.has(c))) return r
      const left = r.candidates.filter((c) => !taken.has(c))
      const status: Status = left.length === 0 ? "Pending" : left.length === 1 ? (r.status === "Multiple matches" ? "Multiple matches" : r.status) : r.status
      return { ...r, candidates: left, status, log: [...r.log, L(stamp, "Result changed", "System", "-", status, STATUS_TONE[status], "-", "-", "Candidate taken by another RPPS")] }
    })
    setRpps(next)
    return changed
  }

  const associate = (ciotId: string, rppsId: string, justification: string, origin?: string) => {
    const stamp = now()
    setRpps((all) => all.map((r) => {
      if (r.id === rppsId) return { ...r, status: "Manually associated", ciot: ciotId, candidates: [ciotId], log: [...r.log, L(stamp, "Manual association", "Manual", ciotId, `Linked to CIOT ${ciotId}`, "neutral", "-", USER, justification)] }
      if (!CLOSED.includes(r.status) && (r.candidates.includes(ciotId) || r.id === origin)) {
        const left = r.candidates.filter((c) => c !== ciotId)
        const status: Status = left.length === 0 ? "Pending" : left.length === 1 && r.status === "Multiple matches" ? "Multiple matches" : r.status
        return { ...r, candidates: left, status, log: [...r.log,
          L(stamp, "Associated elsewhere", "Manual", ciotId, `CIOT linked to RPPS ${rppsId}`, "amber", "-", USER, justification),
          L(stamp, "Result changed", "System", "-", status, STATUS_TONE[status], "-", "-", "Candidate taken by another RPPS")] }
      }
      return r
    }))
    toast({ tone: "success", title: `RPPS ${rppsId} associated`, body: `CIOT ${ciotId} linked. The link, the differences and your justification are in the audit trail.` })
  }

  const dissociate = (id: string, justification = "-") => {
    const stamp = now()
    const r = rpps.find((x) => x.id === id)
    setRpps((all) => all.map((x) => x.id !== id ? x : { ...x, status: "Pending", ciot: undefined, candidates: [], log: [...x.log, L(stamp, "Manual dissociation", "Manual", x.ciot ?? "-", `Unlinked from CIOT ${x.ciot}`, "blue", "-", USER, justification)] }))
    toast({ tone: "success", title: `RPPS ${id} dissociated`, body: `CIOT ${r?.ciot} is available again. The RPPS is back to Pending.` })
  }

  if (view.kind === "detail") {
    const r = rpps.find((x) => x.id === view.id)
    if (r) return <RppsDetail r={r} ciots={ciots} params={params} onBack={() => toList()} onAudit={() => setView({ kind: "audit", id: r.id })}
      onReprocess={() => { reprocess([r.id]); toast({ tone: "info", title: `RPPS ${r.id} reprocessed`, body: "The routine ran again with the parameters in force." }) }}
      onAssociate={(cid) => setView({ kind: "associate", ciot: cid, rpps: r.id, from: "detail" })} />
  }
  if (view.kind === "audit") {
    const r = rpps.find((x) => x.id === view.id)
    if (r) return <AuditTrail r={r} onBack={() => setView({ kind: "detail", id: r.id })} />
  }
  if (view.kind === "ciot") {
    const c = ciots.find((x) => x.id === view.id)
    if (c) return <CiotView c={c} onBack={() => toList("register")} />
  }
  if (view.kind === "newparams") {
    return <NewParamSet base={params} existing={sets} onCancel={() => toList("parameters")} onSave={(p) => {
      setSets((all) => [...all, p])
      if (p.scope === "All units" && p.ttype === "All types") setParams(p)
      toList("parameters")
      toast({ tone: "success", title: "Parameter set saved", body: `${paramSetLabel(p)} applies to the next run.` })
    }} />
  }
  if (view.kind === "associate") {
    const back = () => (view.from === "detail" && view.rpps ? setView({ kind: "detail", id: view.rpps }) : toList())
    return <ManualAssociation initialCiot={view.ciot} origin={view.rpps} ciots={ciots} rpps={rpps} params={params} onCancel={back}
      onConfirm={(c, r) => associate(c, r, "-", view.rpps)} onDissociate={(r) => dissociate(r)} />
  }

  const openIds = rpps.filter((r) => !CLOSED.includes(r.status)).map((r) => r.id)

  return (
    <div className="space-y-5">
      <TabStrip<Tab> value={tab} onChange={setTab}
        tabs={[{ key: "register", label: "CIOT register" }, { key: "reconciliation", label: "Reconciliation" }, { key: "parameters", label: "Parameters" }]}
      />
      {tab === "reconciliation" && (
        <Reconciliation rpps={rpps} ciots={ciots} params={params} onOpen={(id) => setView({ kind: "detail", id })}
          onAssociate={(r) => setView({ kind: "associate", ciot: r.candidates[0], rpps: r.id, from: "list" })}
          onDissociate={(r) => setView({ kind: "associate", ciot: r.ciot, rpps: r.id, from: "list" })}
          onReprocess={(id) => { reprocess([id]); toast({ tone: "info", title: `RPPS ${id} reprocessed`, body: "The routine ran again with the parameters in force." }) }}
          onRunAll={() => { const n = reprocess(openIds); toast({ tone: "success", title: "Reconciliation run complete", body: `${openIds.length} open records processed, ${n} changed result.` }) }} />
      )}
      {tab === "register" && (
        <Register ciots={ciots} rpps={rpps} onAdd={(c) => setCiots((all) => [c, ...all])}
          onOpenCiot={(id) => setView({ kind: "ciot", id })} onAssociate={(cid) => setView({ kind: "associate", ciot: cid, from: "register" })} />
      )}
      {tab === "parameters" && <ParametersTab sets={sets} onNew={() => setView({ kind: "newparams" })} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Reconciliation                                                      */
/* ------------------------------------------------------------------ */

type RFilters = { unit: string; from: string; to: string; status: string; query: string; transporter: string }
const EXCEPTIONS = "Exceptions only"
const R_DEFAULT: RFilters = { unit: "All", from: "2026-09-25", to: "2026-10-10", status: "All", query: "", transporter: "All" }

function Reconciliation({ rpps, ciots, params, onOpen, onAssociate, onReprocess, onRunAll, onDissociate }: { rpps: Rpps[]; ciots: Ciot[]; params: Params; onOpen: (id: string) => void; onAssociate: (r: Rpps) => void; onDissociate: (r: Rpps) => void; onReprocess: (id: string) => void; onRunAll: () => void }) {
  const toast = useToast()
  const [f, setF] = useState<RFilters>(R_DEFAULT)
  const [transporters, setTransporters] = useState<string[]>([])
  const [confirmRun, setConfirmRun] = useState(false)
  const set = (k: keyof RFilters) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  const inPeriod = rpps.filter((r) => (!f.from || r.date >= f.from) && (!f.to || r.date <= f.to))
  const count = (s: Status) => inPeriod.filter((r) => r.status === s).length
  const kpis: { label: string; hint: string; status: string; value: number; icon: typeof Eye; chip: string }[] = [
    { label: "Auto matched", hint: "Linked without anyone", status: "Auto matched", value: count("Auto matched"), icon: ShieldCheck, chip: "bg-[#edf8f1] text-[#187247]" },
    { label: "Pending", hint: "No candidate met the minimum", status: "Pending", value: count("Pending"), icon: Clock, chip: "bg-brand-soft text-brand" },
    { label: "Multiple matches", hint: "Tie-breaks did not settle it", status: "Multiple matches", value: count("Multiple matches"), icon: Boxes, chip: "bg-[#fff6e5] text-[#9a6a12]" },
    { label: "Divergence", hint: "Outside tolerance", status: "Divergence", value: count("Divergence"), icon: AlertTriangle, chip: "bg-[#fdecec] text-[#c23b3b]" },
    { label: "Exceptions cleared", hint: "This period, by a person", status: "Manually associated", value: count("Manually associated"), icon: Check, chip: "bg-canvas text-ink-soft" },
  ]

  const q = f.query.trim().toLowerCase()
  const rows = inPeriod.filter((r) =>
    (f.unit === "All" || r.unit === f.unit) &&
    (!transporters.length || transporters.includes(r.transporter)) &&
    (f.status === "All" || (f.status === EXCEPTIONS ? !CLOSED.includes(r.status) : r.status === f.status)) &&
    (!q || r.id.includes(q) || r.plate.toLowerCase().includes(q) || r.candidates.some((c) => c.includes(q)) || (r.ciot ?? "").includes(q)),
  )
  const ciotOf = (id?: string) => ciots.find((c) => c.id === id)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => {
          const on = f.status === k.status
          return (
            <button key={k.label} type="button" onClick={() => set("status")(on ? "All" : k.status)} className="text-left">
              <Card className={`flex items-center gap-3.5 p-4 transition hover:border-brand-ring ${on ? "border-brand ring-4 ring-brand-soft" : ""}`}>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.chip}`}><k.icon size={19} /></span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-500 text-muted">{k.label}</p>
                  <p className="mt-0.5 text-[22px] font-800 leading-tight text-ink tabular-nums">{k.value}</p>
                  <p className="truncate text-[11.5px] text-muted">{k.hint}</p>
                </div>
              </Card>
            </button>
          )
        })}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid flex-1 grid-cols-1 items-end gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Field label="Unit"><Select value={f.unit} onChange={set("unit")} options={opts(["All", "Unit 01", "Unit 02", "Unit 03"])} /></Field>
            <Field label="Search"><Input value={f.query} onChange={(e) => set("query")(e.target.value)} placeholder="RPPS, CIOT or plate" /></Field>
            <Field label="From"><DatePicker value={f.from} onChange={set("from")} /></Field>
            <Field label="To"><DatePicker value={f.to} onChange={set("to")} /></Field>
            <Field label="Transporter"><MultiSelect searchable values={transporters} onChange={setTransporters} placeholder="Search name or code" allLabel="All transporters" options={TRANSPORTERS.map((t) => ({ value: t.name, label: `${t.code} · ${t.name}` }))} /></Field>
            <Field label="Status"><Select value={f.status} onChange={set("status")} options={opts(["All", EXCEPTIONS, "Auto matched", "Pending", "Multiple matches", "Divergence", "Manually associated"])} /></Field>
          </div>
          <Button variant="outline" onClick={() => toast({ tone: "success", title: "Export started", body: `${rows.length} records exported to Excel.` })}><ExternalLink size={16} /> Export</Button>
        </div>
      </Card>

      <TableCard minWidth={1380}>
        <Head cols={["RPPS", "CIOT", "RPPS date", "Plate", "Transporter", "CIOT weight", "RPPS weight", "Weight diff", "CIOT value", "Base freight", "Value diff", "Last run", "Status", "Actions"]} center={["Actions"]} />
        <tbody>
          {rows.map((r) => {
            const c = ciotOf(r.ciot ?? (r.candidates.length === 1 ? r.candidates[0] : undefined))
            const x = c ? compare(r, c, params) : null
            const exception = !CLOSED.includes(r.status)
            return (
              <tr key={r.id} className="border-t border-line hover:bg-canvas/60">
                <td className={td}><span className="inline-flex items-center gap-2 whitespace-nowrap"><button onClick={() => onOpen(r.id)} className="font-700 text-brand hover:underline">{r.id}</button>{r.candidates.length > 1 && <span className="font-600 text-[#9a6a12]">{r.candidates.length} found</span>}</span></td>
                <td className={td}>{(c ?? ciotOf(r.candidates[0]))?.id ?? <span className="text-muted">-</span>}</td>
                <td className={td}>{fmt(r.date)}</td>
                <td className={td}>{r.plate}</td>
                <td className={td}>{r.transporter}</td>
                <td className={`${td} tabular-nums`}>{c ? kg(c.weight) : "-"}</td>
                <td className={`${td} tabular-nums`}>{kg(r.weight)}</td>
                <td className={td}>{x ? <Diff diff={x.weightDiff} pct={x.weightPct} ok={x.weightOk} /> : "-"}</td>
                <td className={`${td} tabular-nums`}>{c ? money(c.value) : "-"}</td>
                <td className={`${td} tabular-nums`}>{money(r.base)}</td>
                <td className={td}>{x ? <Diff diff={x.valueDiff} pct={x.valuePct} ok={x.valueOk} money /> : "-"}</td>
                <td className={td}>{fmt(r.lastRun).slice(0, 5)}</td>
                <td className={td}>
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                </td>
                <td className={`${td} text-center`}>
                  <div className="inline-flex items-center gap-0.5">
                    <IconAction icon={Eye} label="View" onClick={() => onOpen(r.id)} />
                    <IconAction icon={Link2} label="Manual association" onClick={() => onAssociate(r)} disabled={!exception} />
                    <IconAction icon={Unlink} label="Manual dissociation" onClick={() => onDissociate(r)} disabled={exception} />
                  </div>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr className="border-t border-line"><td colSpan={14} className="px-3 py-10 text-center text-muted">No records match the search.</td></tr>}
        </tbody>
      </TableCard>

      <Confirm open={confirmRun} onClose={() => setConfirmRun(false)} title="Run reconciliation now?" confirm="Run now"
        onConfirm={onRunAll}
        body={<>The routine will run on every open RPPS ({rpps.filter((r) => !CLOSED.includes(r.status)).length}) using <b>{paramSetLabel(params)}</b>. Records already linked are not touched, and each run uses one reprocess.</>} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* RPPS detail                                                          */
/* ------------------------------------------------------------------ */

function RppsDetail({ r, ciots, params, onBack, onAudit, onReprocess, onAssociate }: { r: Rpps; ciots: Ciot[]; params: Params; onBack: () => void; onAudit: () => void; onReprocess: () => void; onAssociate: (ciot?: string) => void }) {
  const pool = r.ciot ? [r.ciot] : r.candidates
  const [pick, setPick] = useState(pool[0] ?? "")
  useEffect(() => setPick(pool[0] ?? ""), [r.id, pool.join()])
  const c = ciots.find((x) => x.id === pick)
  const x = c ? compare(r, c, params) : null
  const t = byName(r.transporter)
  const closed = CLOSED.includes(r.status)

  type Row = { label: string; ciot: string; rpps: string; diff: React.ReactNode; cls: string; tol: string; result: string; tone: "ok" | "bad" | "muted" }
  const rows: Row[] = []
  if (c && x) {
    const ct = byName(c.transporter)
    const idDisplay = (k: IdKey, src: { plate: string; unit: string; transporter: string; nature: string }, tr?: Transporter) =>
      k === "plate" ? src.plate : k === "taxId" ? mask(tr?.taxId ?? "") : k === "unit" ? src.unit : k === "transporterCode" ? tr?.code ?? "-" : k === "nature" ? src.nature : src.transporter
    // The comparison screen follows the client wireframe: Nature and Transporter code are not shown.
    for (const f of ID_FIELDS.filter((f) => f.key !== "nature" && f.key !== "transporterCode")) {
      const rule = params.fields[f.key]
      const ok = x.idResults[f.key]
      rows.push({ label: f.label, ciot: idDisplay(f.key, c, ct), rpps: idDisplay(f.key, r, t), diff: ok ? "-" : "Differs", cls: rule.cls, tol: rule.cls === "Mandatory" ? "Must match" : "Tie-break only",
        result: ok ? "Match" : rule.cls === "Mandatory" ? "No match" : "Lower score", tone: ok ? "ok" : rule.cls === "Mandatory" ? "bad" : "muted" })
    }
    rows.push({ label: "Date", ciot: fmt(c.issued), rpps: fmt(r.date), diff: x.dayDiff === 0 ? "Same day" : `${Math.abs(x.dayDiff)} day${Math.abs(x.dayDiff) > 1 ? "s" : ""}`, cls: "Mandatory", tol: `${params.dayWindow} day window`, result: x.dayOk ? "Within window" : "Outside window", tone: x.dayOk ? "ok" : "bad" })
    rows.push({ label: "Weight", ciot: `${kg(c.weight)} kg`, rpps: `${kg(r.weight)} kg`, diff: <Diff diff={x.weightDiff} pct={x.weightPct} ok={x.weightOk} />, cls: "Comparable", tol: `${params.weightKg} kg or ${params.weightPct.toFixed(1)}%`, result: x.weightOk ? "Within tolerance" : "Outside tolerance", tone: x.weightOk ? "ok" : "bad" })
    rows.push({ label: "Freight value", ciot: money(c.value), rpps: `${money(r.base)} base`, diff: <Diff diff={x.valueDiff} pct={x.valuePct} ok={x.valueOk} money />, cls: "Comparable", tol: `${money(params.valueAbs)} or ${params.valuePct.toFixed(1)}%`, result: x.valueOk ? "Within tolerance" : "Outside tolerance", tone: x.valueOk ? "ok" : "bad" })
    rows.push({ label: "Additional freight", ciot: "-", rpps: r.additional ? money(r.additional) : "-", diff: "Not compared", cls: "Excluded", tol: "Excluded by rule", result: "Set aside", tone: "muted" })
  }
  const scored = rows.filter((x) => x.cls !== "Excluded")
  const met = scored.filter((x) => x.tone === "ok").length
  const failed = rows.filter((x) => x.tone === "bad")

  const tone = (t: Row["tone"]) => t === "ok" ? "bg-[#edf8f1] text-[#187247]" : t === "bad" ? "bg-[#fdecec] text-[#c23b3b]" : "bg-canvas text-muted"
  const pct = scored.length ? Math.round((met / scored.length) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack}><ChevronLeft size={16} /> Back</Button>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" onClick={onAudit}><History size={16} /> Audit trail</Button>
          {!closed && <Button onClick={() => onAssociate(pick || undefined)}><Link2 size={16} /> Associate manually</Button>}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3.5">
            <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${failed.length ? "#c23b3b" : "#187247"} ${pct * 3.6}deg, #eef1f6 0deg)` }}>
              <div className="grid h-[40px] w-[40px] place-items-center rounded-full bg-white">
                <span className="text-[12px] font-800 tabular-nums text-ink">{c ? `${met}/${scored.length}` : "-"}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <p className="text-[17px] font-800 leading-tight text-ink">RPPS {r.id}</p>
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">
                {pool.length === 1 && <>{r.ciot ? "Linked to" : "Compared with"} <span className="font-700 text-ink">CIOT {pool[0]}</span> · </>}
                Last run {fmt(r.lastRun)} · {r.runs} run{r.runs === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
        {failed.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-[#fffafa] px-5 py-2.5">
            <span className="text-[12.5px] font-600 text-muted">Blocking</span>
            {failed.map((f) => (
              <span key={f.label} className="inline-flex items-center gap-1.5 rounded-full bg-[#fdecec] px-2.5 py-1 text-[12px] font-600 text-[#c23b3b]">
                <AlertTriangle size={12} /> {f.label}
              </span>
            ))}
          </div>
        )}
        {c && x ? (
          <div className="space-y-6 border-t border-line px-5 py-5">
            {pool.length > 1 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[12.5px] font-600 text-muted">{pool.length} candidate CIOTs</span>
                <div className="inline-flex rounded-full bg-canvas p-1" role="tablist" aria-label="Candidate CIOT">
                  {pool.map((p) => (
                    <button key={p} type="button" role="tab" aria-selected={pick === p} onClick={() => setPick(p)}
                      className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-700 transition ${pick === p ? "bg-white text-brand shadow-[0_1px_3px_rgba(15,30,61,0.15)]" : "text-muted hover:text-ink"}`}>
                      CIOT {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {(() => {
              const Pair = ({ ciot, rpps, state }: { ciot: string; rpps: string; state: "ok" | "bad" | "muted" }) => (
                <dl className="mt-3 space-y-1.5 text-[13.5px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[12px] font-600 text-muted">CIOT</dt>
                    <dd className="truncate font-700 tabular-nums text-ink">{ciot}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-[12px] font-600 text-muted">RPPS</dt>
                    <dd className={`truncate font-700 tabular-nums ${state === "bad" ? "text-[#c23b3b]" : "text-ink"}`}>{rpps}</dd>
                  </div>
                </dl>
              )
              const Status = ({ state }: { state: "ok" | "bad" | "muted" }) => (
                <span title={state === "ok" ? "Match" : "No match"} className={`grid h-5 w-5 place-items-center rounded-full ${state === "ok" ? "text-[#187247]" : state === "bad" ? "bg-[#c23b3b] text-white" : "text-muted"}`}>
                  {state === "ok" ? <Check size={14} /> : <AlertTriangle size={state === "bad" ? 11 : 13} />}
                </span>
              )
              const card = (state: string) => `rounded-xl border bg-white p-4 transition ${state === "bad" ? "border-[#e8a3a3] shadow-[inset_3px_0_0_#c23b3b]" : "border-line"}`
              const idRows = rows.filter((row) => ID_FIELDS.some((f) => f.label === row.label))
              const measured = [
                { label: "Date", ciot: fmt(c.issued).slice(0, 10), rpps: fmt(r.date).slice(0, 10), ok: x.dayOk, delta: x.dayDiff === 0 ? <span className="text-muted">Same day</span> : <span className={`font-600 ${x.dayOk ? "text-ink" : "text-[#c23b3b]"}`}>{Math.abs(x.dayDiff)} day{Math.abs(x.dayDiff) > 1 ? "s" : ""} apart</span> },
                { label: "Weight", ciot: `${kg(c.weight)} kg`, rpps: `${kg(r.weight)} kg`, ok: x.weightOk, delta: <Diff diff={x.weightDiff} pct={x.weightPct} ok={x.weightOk} /> },
                { label: "Freight value", ciot: money(c.value), rpps: money(r.base), ok: x.valueOk, delta: <Diff diff={x.valueDiff} pct={x.valuePct} ok={x.valueOk} money /> },
              ]
              return (
                <>
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[13px] font-700 text-ink">Identity</p>
                      <p className="text-[12px] text-muted">{idRows.filter((r) => r.tone === "ok").length} of {idRows.length} match</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {idRows.map((row) => (
                        <div key={row.label} className={card(row.tone)}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-700 text-ink">{row.label}</p>
                            <Status state={row.tone} />
                          </div>
                          <Pair ciot={row.ciot} rpps={row.rpps} state={row.tone} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-[13px] font-700 text-ink">Measured values</p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {measured.map((m) => {
                        const st = m.ok ? "ok" : "bad"
                        return (
                          <div key={m.label} className={card(st)}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[13px] font-700 text-ink">{m.label}</p>
                              <Status state={st} />
                            </div>
                            <Pair ciot={m.ciot} rpps={m.rpps} state={st} />
                            <p className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-line pt-2.5 text-[12.5px]"><span className="font-600 text-muted">Difference</span>{m.delta}</p>
                          </div>
                        )
                      })}
                      <div className={`${card("muted")} bg-canvas/40`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-700 text-ink">Additional freight</p>
                          <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-600 text-muted">Excluded</span>
                        </div>
                        <Pair ciot="-" rpps={r.additional ? money(r.additional) : "-"} state="muted" />
                        <p className="mt-2.5 flex items-baseline justify-between gap-3 border-t border-line pt-2.5 text-[12.5px]"><span className="font-600 text-muted">Difference</span><span className="text-muted">Not compared</span></p>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        ) : (
          <div className="mx-5 mb-5 mt-1 rounded-xl border border-dashed border-line bg-canvas/60 px-4 py-10 text-center text-[13.5px] text-muted">No candidate CIOT to compare against.</div>
        )}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Manual association                                                  */
/* ------------------------------------------------------------------ */

function ManualAssociation({ initialCiot, origin, ciots, rpps, params, onCancel, onConfirm, onDissociate }: { initialCiot?: string; origin?: string; ciots: Ciot[]; rpps: Rpps[]; params: Params; onCancel: () => void; onConfirm: (ciot: string, rpps: string) => void; onDissociate: (rpps: string) => void }) {
  const taken = linkedCiots(rpps)
  const originRec = rpps.find((r) => r.id === origin)
  const openCiots = ciots.filter((c) => !taken.has(c.id) && (!originRec || c.transporter === originRec.transporter || c.id === initialCiot))
  const [ciotId, setCiotId] = useState(initialCiot ?? openCiots[0]?.id ?? "")
  const c = ciots.find((x) => x.id === ciotId)
  const [transporter, setTransporter] = useState(c?.transporter ?? originRec?.transporter ?? TRANSPORTERS[0].name)
  const [unit, setUnit] = useState(c?.unit ?? originRec?.unit ?? "All")
  const [confirm, setConfirm] = useState<"associate" | "dissociate" | null>(null)

  const list = useMemo(() => {
    if (!c) return []
    const rows = rpps.filter((r) => r.transporter === transporter && (unit === "All" || r.unit === unit)).map((r) => ({ r, x: compare(r, c, params), linked: CLOSED.includes(r.status) ? r.ciot : undefined }))
    const best = rows.filter((v) => !v.linked && v.x.dayOk && v.x.weightOk && v.x.valueOk).sort((a, b) => Math.abs(a.x.weightPct) + Math.abs(a.x.valuePct) - Math.abs(b.x.weightPct) - Math.abs(b.x.valuePct))[0]
    return rows.map((v) => ({ ...v, label: v.linked ? "Linked" : v === best ? "Suggested" : !v.x.dayOk ? "Outside window" : v.r.candidates.includes(c.id) && v.r.status === "Divergence" ? "Divergence" : "Available" }))
      .sort((a, b) => Number(!!a.linked) - Number(!!b.linked) || a.r.id.localeCompare(b.r.id))
  }, [c, transporter, unit, rpps, params])

  const suggested = list.find((v) => v.label === "Suggested")?.r.id
  const [selected, setSelected] = useState<string>(origin ?? "")
  useEffect(() => setSelected((cur) => (list.some((v) => v.r.id === cur) ? cur : suggested ?? "")), [ciotId, transporter, unit])
  const sel = list.find((v) => v.r.id === selected)
  // Associate only an unlinked RPPS to a free CIOT; dissociate only a linked RPPS.
  const ciotTaken = !!c && rpps.some((r) => CLOSED.includes(r.status) && r.ciot === c.id)
  const canAssociate = !!c && !!sel && !sel.linked && !ciotTaken
  const canDissociate = !!sel?.linked
  const labelTone: Record<string, string> = { Suggested: "text-[#1a7a45] font-700", Divergence: "text-[#c23b3b] font-600", "Outside window": "text-muted", Available: "text-ink-soft", Linked: "text-muted" }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onCancel}><ChevronLeft size={16} /> Back</Button>
      </div>

      <Card className="p-5">
        <SectionTitle>CIOT being associated</SectionTitle>
        {c ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
            {[["CIOT", c.id], ["Issued", fmt(c.issued)], ["Unit", c.unit], ["Plate", c.plate], ["Transporter", c.transporter], ["Tax id", mask(byName(c.transporter).taxId)], ["Weight", `${kg(c.weight)} kg`], ["Freight value", money(c.value)]].map(([l, v]) => (
              <div key={l}><p className="text-[12.5px] font-500 text-muted">{l}</p><p className="mt-1 text-[14px] font-700 text-ink">{v}</p></div>
            ))}
          </div>
        ) : <p className="text-[13.5px] text-muted">There is no open CIOT for this Transporter. Register it in the CIOT register first.</p>}
      </Card>

      {c && (
        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Transporter" className="w-[260px]">
                <Select searchable value={transporter} onChange={setTransporter} options={TRANSPORTERS.map((t) => ({ value: t.name, label: `${t.code} · ${t.name}` }))} placeholder="Search transporter" />
              </Field>
              <Field label="Tax id" className="w-[200px]"><Input value={byName(transporter)?.taxId ?? ""} disabled placeholder="From transporter" /></Field>
              <Field label="Business unit" className="w-[180px]"><Select value={unit} onChange={setUnit} options={opts(["All", ...UNITS])} /></Field>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="outline" disabled={!canDissociate} onClick={() => setConfirm("dissociate")}><Unlink size={16} /> Dissociate</Button>
              <Button disabled={!canAssociate} onClick={() => setConfirm("associate")}><Link2 size={16} /> Associate</Button>
            </div>
          </div>
          <TableCard minWidth={1100}>
            <Head cols={["", "RPPS", "Date", "Plate", "Weight", "Weight diff", "Base freight", "Value diff", "Status", "Already associated"]} />
            <tbody>
              {list.map(({ r, x, linked, label }) => {
                const on = selected === r.id
                return (
                  <tr key={r.id} onClick={() => setSelected(r.id)} className={`cursor-pointer border-t border-line ${on ? "bg-brand-soft/60" : "hover:bg-canvas/60"}`}>
                    <td className={`${td} w-10`}>
                      <span className={`grid h-[18px] w-[18px] place-items-center rounded-full border-2 ${on ? "border-brand" : "border-line"}`}>{on && <span className="h-2 w-2 rounded-full bg-brand" />}</span>
                    </td>
                    <td className={`${td} font-700`}>{r.id}</td>
                    <td className={td}>{fmt(r.date)}</td>
                    <td className={td}>{r.plate}</td>
                    <td className={`${td} tabular-nums`}>{kg(r.weight)}</td>
                    <td className={`${td} ${linked ? "opacity-60" : ""}`}><Diff diff={x.weightDiff} pct={x.weightPct} ok={x.weightOk} /></td>
                    <td className={`${td} tabular-nums`}>{money(r.base)}</td>
                    <td className={`${td} ${linked ? "opacity-60" : ""}`}><Diff diff={x.valueDiff} pct={x.valuePct} ok={x.valueOk} money /></td>
                    <td className={`${td} ${labelTone[label]}`}>{label}</td>
                    <td className={td}>{linked ? <Badge tone="red">Yes - CIOT {linked}</Badge> : "No"}</td>
                  </tr>
                )
              })}
              {list.length === 0 && <tr className="border-t border-line"><td colSpan={10} className="px-3 py-10 text-center text-muted">No RPPS issued for this Transporter and business unit.</td></tr>}
            </tbody>
          </TableCard>
        </div>
      )}


      {c && sel && (
        <Confirm open={!!confirm} onClose={() => setConfirm(null)}
          title={confirm === "dissociate" ? `Dissociate RPPS ${sel.r.id}?` : `Associate RPPS ${sel.r.id}?`}
          confirm={confirm === "dissociate" ? "Dissociate" : "Associate"}
          onConfirm={() => (confirm === "dissociate" ? onDissociate(sel.r.id) : onConfirm(c.id, sel.r.id))}
          body={confirm === "dissociate"
            ? <>Are you sure you want to unlink CIOT <b className="text-ink">{sel.linked}</b> from RPPS <b className="text-ink">{sel.r.id}</b>? The RPPS returns to Pending.</>
            : <>Are you sure you want to link CIOT <b className="text-ink">{c.id}</b> to RPPS <b className="text-ink">{sel.r.id}</b>?</>} />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Audit trail                                                         */
/* ------------------------------------------------------------------ */

function AuditTrail({ r, onBack }: { r: Rpps; onBack: () => void }) {
  const toast = useToast()
  const manual = r.log.filter((l) => l.method === "Manual").length
  const auto = r.log.filter((l) => l.method === "Automatic").length
  const toneCls: Record<Tone, string> = { green: "text-[#1a7a45]", red: "text-[#c23b3b]", amber: "text-[#9a6a12]", blue: "text-brand", neutral: "text-ink" }
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onBack}><ChevronLeft size={16} /> Back</Button>
      </div>
      <Summary title={`RPPS ${r.id}`} items={[
        { label: "CIOT now linked", value: r.ciot && CLOSED.includes(r.status) ? r.ciot : "None" },
        { label: "Current result", value: <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge> },
        { label: "Automatic runs", value: auto },
        { label: "Manual actions", value: manual },
        { label: "First run", value: fmt(r.firstRun) },
        { label: "Last run", value: fmt(r.lastRun) },
        { label: "Reprocesses left", value: r.reprocessLeft },
        { label: "Unit", value: r.unit },
      ]} />
      <div>
        <SectionTitle action={<Button size="sm" variant="outline" onClick={() => toast({ tone: "success", title: "Export started", body: `${r.log.length} entries exported to Excel.` })}><ExternalLink size={15} /> Export</Button>}>Executions and decisions</SectionTitle>
        <TableCard minWidth={900}>
          <Head cols={["Timestamp", "Candidate", "Outcome", "Parameter set", "User", "Justification"]} />
          <tbody>
            {r.log.map((l, i) => (
              <tr key={i} className="border-t border-line">
                <td className={td}>{l.when}</td>
                <td className={td}>{l.candidate}</td>
                <td className={`${td} font-600 ${toneCls[l.tone]}`}>{l.outcome}</td>
                <td className={td}>{l.paramSet}</td>
                <td className={td}>{l.user}</td>
                <td className="px-3 py-2.5 text-ink-soft">{l.justification}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* CIOT register                                                       */
/* ------------------------------------------------------------------ */

function Register({ ciots, rpps, onAdd, onOpenCiot, onAssociate }: { ciots: Ciot[]; rpps: Rpps[]; onAdd: (c: Ciot) => void; onOpenCiot: (id: string) => void; onAssociate: (ciot: string) => void }) {
  const toast = useToast()
  const [ciotNo, setCiotNo] = useState("")
  const [plate, setPlate] = useState("")
  const [transporters, setTransporters] = useState<string[]>([])
  const [nature, setNature] = useState("All")
  const [unit, setUnit] = useState("All")
  const [open, setOpen] = useState(false)

  const association = (c: Ciot): { label: string; tone: Tone; rpps?: string } => {
    const linked = rpps.find((r) => CLOSED.includes(r.status) && r.ciot === c.id)
    if (linked) return { label: "Linked", tone: "green", rpps: linked.id }
    const cand = rpps.find((r) => !CLOSED.includes(r.status) && r.candidates.includes(c.id))
    if (cand) return { label: cand.status, tone: STATUS_TONE[cand.status], rpps: cand.id }
    return { label: "Not associated", tone: "blue" }
  }
  const qPlate = normAlnum(plate)
  const rows = ciots.map((c) => ({ c, a: association(c) })).filter(({ c, a }) =>
    (!ciotNo.trim() || c.id.includes(ciotNo.trim())) && (!qPlate || normAlnum(c.plate).includes(qPlate)) &&
    (transporters.length === 0 || transporters.includes(c.transporter)) &&
    (nature === "All" || c.nature === nature || c.nature === "Supplies or tobacco") &&
    (unit === "All" || c.unit === unit))

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid flex-1 grid-cols-1 items-end gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Field label="CIOT number"><Input value={ciotNo} onChange={(e) => setCiotNo(e.target.value.replace(/\D/g, ""))} placeholder="123457" /></Field>
            <Field label="Plate"><Input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} placeholder="DEF4G56" /></Field>
            <Field label="Transporter"><MultiSelect searchable values={transporters} onChange={setTransporters} placeholder="Search name or code" allLabel="All transporters" options={TRANSPORTERS.map((t) => ({ value: t.name, label: `${t.code} · ${t.name}` }))} /></Field>
            <Field label="Nature"><Select value={nature} onChange={setNature} options={opts(["All", "Supplies", "Tobacco"])} /></Field>
            <Field label="Unit"><Select value={unit} onChange={setUnit} options={opts(["All", "Unit 01", "Unit 02", "Unit 03"])} /></Field>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={() => toast({ tone: "success", title: "Export started", body: `${rows.length} CIOT records exported to Excel.` })}><ExternalLink size={16} /> Export</Button>
            <Button onClick={() => setOpen(true)}><Plus size={16} /> Register CIOT</Button>
          </div>
        </div>
      </Card>

      <TableCard minWidth={1300}>
        <Head cols={["CIOT", "Issued", "Unit", "Load", "Plate", "Tax id", "Transporter", "Transporter type", "Weight", "Freight value", "Registered by", "Actions"]} center={["Actions"]} />
        <tbody>
          {rows.map(({ c, a }) => (
            <tr key={c.id} className="border-t border-line hover:bg-canvas/60">
              <td className={`${td} font-700`}>{c.id}</td>
              <td className={td}>{fmt(c.issued)}</td>
              <td className={td}>{c.unit}</td>
              <td className={td}>{c.load || <span className="text-muted">-</span>}</td>
              <td className={td}>{c.plate}</td>
              <td className={td}>{mask(byName(c.transporter).taxId)}</td>
              <td className={td}>{c.transporter}</td>
              <td className={td}>{byName(c.transporter).type}</td>
              <td className={`${td} tabular-nums`}>{kg(c.weight)} kg</td>
              <td className={`${td} tabular-nums`}>{money(c.value)}</td>
              <td className={td}>{c.registeredBy}</td>
              <td className={`${td} text-center`}>
                <div className="inline-flex gap-0.5">
                  <IconAction icon={Eye} label={`View CIOT ${c.id}`} onClick={() => onOpenCiot(c.id)} />
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr className="border-t border-line"><td colSpan={12} className="px-3 py-10 text-center text-muted">No CIOT records match the search.</td></tr>}
        </tbody>
      </TableCard>
      <p className="text-[12.5px] text-muted">Association is written by the routine, never by the person registering. Divergence and multiple matches are resolved on the Reconciliation tab.</p>

      <RegisterModal open={open} existing={ciots.map((c) => c.id)} onClose={() => setOpen(false)}
        onSave={(c) => { onAdd(c); setOpen(false); toast({ tone: "success", title: `CIOT ${c.id} registered`, body: "It waits for the routine to find it when the RPPS is issued." }) }} />
    </div>
  )
}

type CiotForm = { id: string; issued: string; unit: string; load: string; transporter: string; plate: string; taxId: string; origin: string; destination: string; weight: string; value: string; nature: string }
const EMPTY_FORM: CiotForm = { id: "", issued: isoToday(), unit: USER_UNITS[0], load: "", transporter: "", plate: "", taxId: "", origin: "", destination: "", weight: "", value: "", nature: "" }

function RegisterModal({ open, existing, onClose, onSave }: { open: boolean; existing: string[]; onClose: () => void; onSave: (c: Ciot) => void }) {
  const [f, setF] = useState<CiotForm>(EMPTY_FORM)
  const [tried, setTried] = useState(false)
  useEffect(() => { if (open) { setF(EMPTY_FORM); setTried(false) } }, [open])
  const set = (k: keyof CiotForm) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  const t = TRANSPORTERS.find((x) => x.name === f.transporter)
  // Picking the transporter fills its tax id; the field stays editable.
  const pickTransporter = (name: string) => setF((s) => ({ ...s, transporter: name, taxId: TRANSPORTERS.find((x) => x.name === name)?.taxId ?? s.taxId }))
  const errors: Partial<Record<keyof CiotForm, string>> = {}
  if (!/^\d{6}$/.test(f.id)) errors.id = "Six digits"
  else if (existing.includes(f.id)) errors.id = "Already registered"
  if (!f.issued) errors.issued = "Required"
  if (!f.unit) errors.unit = "Required"
  if (!f.load.trim()) errors.load = "Required"
  if (!t) errors.transporter = "Required"
  if (!f.nature) errors.nature = "Required"
  if (normAlnum(f.plate).length !== 7) errors.plate = "Seven characters, e.g. DEF4G56"
  if (!f.taxId.trim()) errors.taxId = "Required"
  if (!(Number(f.weight) > 0)) errors.weight = "Greater than zero"
  if (!(Number(f.value) > 0)) errors.value = "Greater than zero"
  if (!f.origin.trim()) errors.origin = "Required"
  if (!f.destination.trim()) errors.destination = "Required"
  const err = (k: keyof CiotForm) => (tried && errors[k] ? <p className="mt-1 text-[12px] text-[#c23b3b]">{errors[k]}</p> : null)
  const stamp = now()

  const save = () => {
    setTried(true)
    if (Object.keys(errors).length || !t) return
    onSave({ id: f.id, issued: f.issued, unit: f.unit, plate: normAlnum(f.plate), transporter: t.name, weight: Number(f.weight), value: Number(f.value), origin: f.origin.trim(), destination: f.destination.trim(), nature: f.nature, load: f.load.trim(), registeredAt: stamp, registeredBy: USER })
  }

  return (
    <Modal open={open} onClose={onClose} title="Register CIOT" width="max-w-4xl">
      <div className="space-y-5">
        <div>
          <p className="mb-3 text-[12px] font-700 uppercase tracking-[0.08em] text-brand">Document</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="CIOT number"><Input value={f.id} onChange={(e) => set("id")(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123457" />{err("id")}</Field>
            <Field label="Date of issue"><DatePicker value={f.issued} onChange={set("issued")} />{err("issued")}</Field>
            <Field label="Unit"><Select value={f.unit} onChange={set("unit")} options={opts(USER_UNITS)} placeholder="Select unit" />{err("unit")}</Field>
            <Field label="Load or booking"><Input value={f.load} onChange={(e) => set("load")(e.target.value.toUpperCase())} placeholder="LD-44120" />{err("load")}</Field>
          </div>
        </div>
        <div>
          <p className="mb-3 text-[12px] font-700 uppercase tracking-[0.08em] text-brand">Vehicle and Transporter</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Transporter code and name" className="sm:col-span-2"><Select searchable value={f.transporter} onChange={pickTransporter} options={TRANSPORTERS.map((x) => ({ value: x.name, label: `${x.code} · ${x.name}` }))} placeholder="Search code or name" />{err("transporter")}</Field>
            <Field label="Tax id"><Input value={f.taxId} onChange={(e) => set("taxId")(e.target.value)} placeholder="Filled from the transporter" />{err("taxId")}</Field>
            <Field label="Plate"><Input value={f.plate} onChange={(e) => set("plate")(e.target.value.toUpperCase())} placeholder="DEF4G56" />{err("plate")}</Field>
          </div>
        </div>
        <div>
          <p className="mb-3 text-[12px] font-700 uppercase tracking-[0.08em] text-brand">Trip, as stated on the CIOT</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Weight on the CIOT (kg)"><Input type="number" min={0} value={f.weight} onChange={(e) => set("weight")(e.target.value)} placeholder="14000" />{err("weight")}</Field>
            <Field label="Freight value on the CIOT"><Input type="number" min={0} step="0.01" value={f.value} onChange={(e) => set("value")(e.target.value)} placeholder="4800.00" />{err("value")}</Field>
            <Field label="Origin"><Input value={f.origin} onChange={(e) => set("origin")(e.target.value)} placeholder="Santa Cruz do Sul / RS" />{err("origin")}</Field>
            <Field label="Destination"><Input value={f.destination} onChange={(e) => set("destination")(e.target.value)} placeholder="Passa Sete / RS" />{err("destination")}</Field>
            <Field label="Nature"><Select value={f.nature} onChange={set("nature")} options={opts(["Supplies", "Tobacco"])} placeholder="Select nature" />{err("nature")}</Field>
            <Field label="Registered at"><Input value={stamp} disabled /></Field>
            <Field label="Registered by"><Input value={USER} disabled /></Field>
          </div>
        </div>
        <div className="flex items-start gap-2.5 rounded-xl bg-brand-soft/60 px-4 py-3 text-[13px] text-ink-soft">
          <FileText size={16} className="mt-0.5 shrink-0 text-brand" />
          All fields are required. The tax id is filled from the Transporter record once the transporter is chosen. Enter the weight and freight value stated on the CIOT, not what the load weighed.
        </div>
        <div className="flex justify-end gap-2.5 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  )
}

/* Read-only view of a registered CIOT: the same fields as the registration form. */
function CiotView({ c, onBack }: { c: Ciot; onBack: () => void }) {
  const t = byName(c.transporter)
  const groups: { title: string; items: [string, React.ReactNode][] }[] = [
    { title: "Document", items: [["CIOT number", c.id], ["Date of issue", fmt(c.issued)], ["Unit", c.unit], ["Load or booking", c.load || "-"]] },
    { title: "Vehicle and Transporter", items: [["Plate", c.plate], ["Tax id", mask(t.taxId)], ["Transporter code", t.code], ["Transporter name", `${t.name} (${t.type})`]] },
    { title: "Trip, as stated on the CIOT", items: [["Weight on the CIOT", `${kg(c.weight)} kg`], ["Freight value on the CIOT", money(c.value)], ["Origin", c.origin], ["Destination", c.destination], ["Nature", c.nature], ["Registered at", c.registeredAt], ["Registered by", c.registeredBy]] },
  ]
  return (
    <div className="space-y-5">
      <Button variant="outline" onClick={onBack}><ChevronLeft size={16} /> Back</Button>
      <Card className="space-y-6 p-5">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-3 text-[12px] font-700 uppercase tracking-[0.08em] text-brand">{g.title}</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              {g.items.map(([l, v]) => (
                <div key={l}>
                  <p className="text-[12.5px] font-500 text-muted">{l}</p>
                  <p className="mt-0.5 text-[14px] font-600 text-ink">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Parameters                                                          */
/* ------------------------------------------------------------------ */

const FIELD_RULES: { label: string; cls: RuleCls }[] = [
  { label: "Plate", cls: "Mandatory" }, { label: "Tax id", cls: "Mandatory" }, { label: "Unit", cls: "Mandatory" },
  { label: "Date against the window", cls: "Mandatory" }, { label: "Weight", cls: "Not mandatory" }, { label: "Freight value, base only", cls: "Not mandatory" },
  { label: "Transporter name", cls: "Not mandatory" }, { label: "Transporter code", cls: "Mandatory" }, { label: "Nature", cls: "Mandatory" },
]
const FIELD_OPTIONS = FIELD_RULES.map((f) => f.label)
const TTYPES = ["All types", "Individual", "Legal entity"]
const CLS_TONE = { Mandatory: "green", "Not mandatory": "neutral" } as const

function ParametersTab({ sets, onNew }: { sets: Params[]; onNew: () => void }) {
  const [scope, setScope] = useState(sets[0].scope)
  const [ttype, setTtype] = useState(sets[0].ttype)
  const [eff, setEff] = useState(sets[0].effective)
  const uniq = (xs: string[]) => [...new Set(xs)]
  const byScope = sets.filter((x) => x.scope === scope)
  const byType = byScope.filter((x) => x.ttype === ttype)
  const p = byType.find((x) => x.effective === eff) ?? byType[0] ?? byScope[0] ?? sets[0]
  const pick = (x: Params) => { setScope(x.scope); setTtype(x.ttype); setEff(x.effective) }
  const onScope = (v: string) => pick(sets.find((s) => s.scope === v)!)
  const onType = (v: string) => pick(byScope.find((s) => s.ttype === v)!)
  const tiles: { icon: typeof Eye; title: string; value: string; hint: string }[] = [
    { icon: Boxes, title: "Weight tolerance", value: `${kg(p.weightKg)} kg`, hint: `or ${p.weightPct.toFixed(1)}%, whichever is wider` },
    { icon: FileText, title: "Freight value tolerance", value: `${money(p.valueAbs)} BRL`, hint: `or ${p.valuePct.toFixed(1)}%, base freight only` },
    { icon: Clock, title: "Day window", value: `${p.dayWindow} days`, hint: "Between CIOT issue and RPPS date" },
    { icon: RotateCcw, title: "Reprocessing", value: `Every ${p.reprocessHours} h`, hint: `Up to ${p.reprocessMax} times per record` },
  ]
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid flex-1 grid-cols-1 items-end gap-3 sm:grid-cols-3 lg:max-w-[720px]">
            <Field label="Applies to"><Select value={p.scope} onChange={onScope} options={opts(uniq(sets.map((x) => x.scope)))} /></Field>
            <Field label="Transporter type"><Select value={p.ttype} onChange={onType} options={opts(uniq(byScope.map((x) => x.ttype)))} /></Field>
            <Field label="Effective from"><Select value={p.effective} onChange={setEff} options={byType.map((x) => ({ value: x.effective, label: fmt(x.effective) }))} /></Field>
          </div>
          <Button onClick={onNew}><Plus size={16} /> New parameter set</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-[12.5px]">
          <span className="font-600 text-muted">{sets.length} parameter sets:</span>
          {sets.map((x) => (
            <button key={x.scope + x.ttype + x.effective} type="button" onClick={() => pick(x)}
              className={`rounded-full border px-3 py-1 font-600 transition ${x === p ? "border-brand bg-brand-soft text-brand" : "border-line bg-canvas text-ink-soft hover:border-brand/50"}`}>
              {paramSetLabel(x)}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 py-4"><h3 className="text-[15px] font-800 text-ink">Tolerances and limits</h3></div>
        <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.title} className="flex items-start gap-3 bg-white px-5 py-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><t.icon size={17} /></span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-500 text-muted">{t.title}</p>
                <p className="mt-0.5 text-[18px] font-800 leading-tight text-ink tabular-nums">{t.value}</p>
                <p className="mt-0.5 text-[12px] text-muted">{t.hint}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <TableCard minWidth={560}>
        <Head cols={["Field", "Class"]} />
        <tbody>
          {(p.rules ?? FIELD_RULES.map((f) => ({ field: f.label, cls: f.cls }))).map((f) => (
            <tr key={f.field} className="border-t border-line">
              <td className={`${td} font-600`}>{f.field}</td>
              <td className={td}><Badge tone={CLS_TONE[f.cls]}>{f.cls}</Badge></td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </div>
  )
}

function NewParamSet({ base, existing, onCancel, onSave }: { base: Params; existing: Params[]; onCancel: () => void; onSave: (p: Params) => void }) {
  const [d, setD] = useState<Params>({ ...base, scope: "", ttype: "", effective: "", rules: [] })
  const rules = d.rules ?? []
  const setRule = (i: number, k: "field" | "cls", v: string) => setD((s) => ({ ...s, rules: (s.rules ?? []).map((r, j) => (j === i ? { ...r, [k]: v } : r)) }))
  const scopeReady = !!d.scope && !!d.ttype && !!d.effective
  const duplicateSet = scopeReady && existing.some((e) => e.scope === d.scope && e.ttype === d.ttype && e.effective === d.effective)
  const dupFields = rules.map((r) => r.field).filter((f, i, a) => f && a.indexOf(f) !== i)
  const rulesInvalid = rules.length === 0 || rules.some((r) => !r.field || !r.cls) || dupFields.length > 0
  const [confirm, setConfirm] = useState(false)
  const num = (k: keyof Params) => (e: React.ChangeEvent<HTMLInputElement>) => setD((s) => ({ ...s, [k]: e.target.value === "" ? NaN : Number(e.target.value) }))
  const invalid = [d.weightKg, d.weightPct, d.valueAbs, d.valuePct, d.dayWindow, d.reprocessHours, d.reprocessMax].some((n) => !(n >= 0)) || !scopeReady || duplicateSet || rulesInvalid

  const groups: { title: string; items: { k: keyof Params; label: string; unit: string; step?: string }[] }[] = [
    { title: "Weight", items: [{ k: "weightKg", label: "Absolute", unit: "kg" }, { k: "weightPct", label: "Percentage", unit: "%", step: "0.1" }] },
    { title: "Freight value", items: [{ k: "valueAbs", label: "Absolute", unit: "BRL", step: "0.01" }, { k: "valuePct", label: "Percentage", unit: "%", step: "0.1" }] },
    { title: "Date", items: [{ k: "dayWindow", label: "Day window", unit: "days" }] },
    { title: "Reprocessing", items: [{ k: "reprocessHours", label: "Run every", unit: "hours" }, { k: "reprocessMax", label: "Up to", unit: "times" }] },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={invalid} onClick={() => setConfirm(true)}><Check size={16} /> Save parameter set</Button>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="text-[15px] font-800 text-ink">Scope</h3>
        <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-3 lg:max-w-[760px]">
          <Field label="Applies to"><Select value={d.scope} onChange={(v) => setD((s) => ({ ...s, scope: v }))} options={opts(["All units", "Unit 01", "Unit 02", "Unit 03"])} placeholder="Select scope" /></Field>
          <Field label="Transporter type"><Select value={d.ttype} onChange={(v) => setD((s) => ({ ...s, ttype: v }))} options={opts(TTYPES)} placeholder="Select type" /></Field>
          <Field label="Effective from"><DatePicker value={d.effective} onChange={(v) => setD((s) => ({ ...s, effective: v }))} /></Field>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-[15px] font-800 text-ink">Tolerances and limits</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {groups.map((g) => (
            <div key={g.title} className="rounded-xl border border-line p-4">
              <p className="text-[13px] font-700 text-ink">{g.title}</p>
              <div className={`mt-3 grid gap-3 ${g.items.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {g.items.map((l) => (
                  <Field key={l.k} label={l.label}>
                    <div className="relative">
                      <Input type="number" min={0} step={l.step ?? "1"} value={Number.isNaN(d[l.k] as number) ? "" : String(d[l.k])} onChange={num(l.k)} className="pr-14 tabular-nums" />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">{l.unit}</span>
                    </div>
                  </Field>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-800 text-ink">How each field is used</h3>
          <Button variant="outline" disabled={!scopeReady || rules.length >= FIELD_OPTIONS.length} onClick={() => setD((s) => ({ ...s, rules: [...(s.rules ?? []), { field: "", cls: "" as RuleCls }] }))}><Plus size={16} /> Add field</Button>
        </div>
        {!scopeReady ? (
          <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">Select the scope of this set to start adding fields.</p>
        ) : (
          <table className="mt-4 w-full text-[13.5px]">
            <Head cols={["Field", "Class", ""]} />
            <tbody>
              {rules.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  <td className={td}>
                    <Select value={r.field} onChange={(v) => setRule(i, "field", v)} placeholder="Select field"
                      options={opts(FIELD_OPTIONS.filter((f) => f === r.field || !rules.some((x) => x.field === f)))} />
                    {dupFields.includes(r.field) && <p className="mt-1 text-[12px] text-[#c23b3b]">Field already added</p>}
                  </td>
                  <td className={td}><Select value={r.cls} onChange={(v) => setRule(i, "cls", v)} placeholder="Select class" options={opts(["Mandatory", "Not mandatory"])} /></td>
                  <td className={`${td} w-12 text-center`}><button type="button" aria-label="Remove field" className="text-muted hover:text-[#c23b3b]" onClick={() => setD((s) => ({ ...s, rules: (s.rules ?? []).filter((_, j) => j !== i) }))}>&times;</button></td>
                </tr>
              ))}
              {rules.length === 0 && <tr className="border-t border-line"><td colSpan={3} className="px-3 py-8 text-center text-muted">No fields yet. Use Add field.</td></tr>}
            </tbody>
          </table>
        )}
        {duplicateSet && <p className="mt-3 text-[12.5px] text-[#c23b3b]">A parameter set for {d.scope} / {d.ttype} from {fmt(d.effective)} already exists.</p>}
        {invalid && !duplicateSet && <p className="mt-3 text-[12.5px] text-[#c23b3b]">Complete the scope, every tolerance and at least one field with its class. Values cannot be negative.</p>}
      </Card>

      <Confirm open={confirm} onClose={() => setConfirm(false)} title="Save parameter set?" confirm="Save"
        onConfirm={() => onSave(d)}
        body={<>The set <b>{paramSetLabel(d)}</b> applies from the next run. Results already recorded keep the set they were judged under.</>} />
    </div>
  )
}
