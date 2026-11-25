import { useEffect, useMemo, useState } from "react"
import { Check, ChevronLeft, Pencil, Plus, RotateCcw, Trash2, X, ExternalLink, Info, Boxes, ShieldCheck, AlertTriangle, Clock, FileText, Lock, SlidersHorizontal, Eye, Undo2, ArrowLeftRight } from "../components/icons"
import { Badge, Button, Card, Checkbox, DatePicker, Field, Input, Modal, MultiSelect, Select, useToast } from "../components/ui"

export type BindingCrumb = { label: string; onClick?: () => void }

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

type State = "Active" | "Amending" | "Pending" | "Dissolved" | "Draft" | "Cancelled"

type Member = {
  farmer: string
  relationship: string
  contracts: string
  indebtedness: number
  ofEstimate: number
  deviator: boolean
  filler: boolean
  trigger: string
  appliedVersion: string
  signature: string
  inForce: boolean
}

type Version = { version: string; document: string; members: number; issued: string; signedBy: string[]; outstanding: string[]; status: "Applied" | "Awaiting signature" | "Refused" }
type LogEntry = { when: string; event: string; ver: string; farmer: string; by: string; detail: string }
type Credit = { id: string; date: string; event: string; farmer: string; credit: number; ownDebt: number; recovered: number; takenFrom: string; debtAfter: number; analysis: string; reversed?: number }

type BindingRec = {
  id: string
  crop: string
  tobaccoType: string
  origin: string
  document: string
  state: State
  applied: "Yes" | "No"
  trigger: string
  appliedOn: string
  created: string
  members: Member[]
  versions: Version[]
  log: LogEntry[]
  credits: Credit[]
  dissolvedOn?: string
  /* Snapshot taken before the latest membership change, used to revert it. */
  prev?: { members: Member[]; document: string; state: State }
}

const STATE_TONE: Record<State, "green" | "amber" | "blue" | "neutral" | "red"> = {
  Active: "green",
  Amending: "amber",
  Pending: "blue",
  Dissolved: "neutral",
  Draft: "neutral",
  Cancelled: "neutral",
}

const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const today = () => new Date().toLocaleDateString("en-GB")
const now = () => {
  const d = new Date()
  return `${today()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
const latestVersion = (b: BindingRec) => b.versions[b.versions.length - 1]?.version ?? "v1"
const appliedVersion = (b: BindingRec) => [...b.versions].reverse().find((v) => v.status === "Applied")?.version ?? "—"

/* Sample farmer names so filters show "code - name" like the other screens. */
const FARMER_NAMES = ["João Schneider", "Maria Kunz", "Ademir Wagner", "Lúcia Becker", "Paulo Hoffmann", "Rosa Klein", "Valdir Schmitt", "Neusa Krause", "Ivo Müller", "Clara Weber", "Elton Fischer", "Irene Braun"]
const farmerLabel = (farmer: string) => {
  const code = farmer.replace(/^Farmer\s*/, "")
  const n = [...code].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7)
  return `${code} - ${FARMER_NAMES[n % FARMER_NAMES.length]}`
}

const m = (farmer: string, relationship: string, contracts: string, indebtedness: number, ofEstimate: number, extra: Partial<Member> = {}): Member => ({
  farmer, relationship, contracts, indebtedness, ofEstimate, deviator: false, filler: false, trigger: "None", appliedVersion: "v1", signature: "Not required", inForce: true, ...extra,
})

/* Generic history for bindings without a hand-written record. */
const simpleBinding = (b: Omit<BindingRec, "versions" | "log" | "credits">, issued: string, needsDoc: boolean): BindingRec => ({
  ...b,
  versions: needsDoc
    ? [{ version: "v1", document: `2026-${b.id}-1`, members: b.members.length, issued, signedBy: b.members.filter((x) => x.signature.startsWith("Signed")).map((x) => x.farmer), outstanding: b.members.filter((x) => !x.signature.startsWith("Signed")).map((x) => x.farmer), status: b.state === "Pending" ? "Awaiting signature" : "Applied" }]
    : [],
  log: [{ when: `${b.created} 09:00`, event: "Binding requested", ver: "v1", farmer: "-", by: b.origin.startsWith("Automatic") ? "System" : "User 4471", detail: `${b.members.length} members, tobacco type ${b.tobaccoType}. ${b.origin}.` }],
  credits: [],
})

const SEED: BindingRec[] = [
  {
    id: "BND-0004417", crop: "2026/2027", tobaccoType: "Virginia", origin: "Requested - technician", document: "v2 sent 26/09/2026",
    state: "Amending", applied: "Yes", trigger: "Indebtedness 57.6%", appliedOn: "02/09/2026", created: "04/08/2026",
    members: [
      m("Farmer 00041288", "Head of household", "CT-100121", 18.4, 96, { signature: "Signed 29/09/2026" }),
      m("Farmer 00041290", "Spouse of the head", "CT-100123", 22.1, 38, { signature: "Signed 29/09/2026" }),
      m("Farmer 00047733", "Son, own contract", "CT-100311", 57.6, 70, { filler: true, trigger: "Indebtedness", signature: "Signed 28/09/2026" }),
      m("Farmer 00047901", "Son, own contract", "CT-100521", 31.0, 93, { appliedVersion: "v2", signature: "Pending", inForce: false }),
    ],
    versions: [
      { version: "v1", document: "2026-BND-004417-1", members: 3, issued: "04/08/2026", signedBy: ["Farmer 00041288", "Farmer 00041290", "Farmer 00047733"], outstanding: [], status: "Applied" },
      { version: "v2", document: "2026-BND-004417-2", members: 4, issued: "26/09/2026", signedBy: ["Farmer 00047733", "Farmer 00041288", "Farmer 00041290"], outstanding: ["Farmer 00047901"], status: "Awaiting signature" },
    ],
    log: [
      { when: "04/08/2026 09:12", event: "Binding requested", ver: "v1", farmer: "-", by: "User 4471", detail: "Three members, tobacco type Virginia. Approved by User 3110. State Pending, Applied No. Document 2026-BND-004417-1 issued and sent for signature." },
      { when: "07/08/2026 14:30", event: "Signature received", ver: "v1", farmer: "Farmer 00041288", by: "Field", detail: "1 of 3." },
      { when: "09/08/2026 10:05", event: "Signature received", ver: "v1", farmer: "Farmer 00041290", by: "Field", detail: "2 of 3." },
      { when: "12/08/2026 16:41", event: "Signature received", ver: "v1", farmer: "Farmer 00047733", by: "Field", detail: "3 of 3. Version complete." },
      { when: "12/08/2026 16:41", event: "Version applied", ver: "v1", farmer: "-", by: "System", detail: "All signatures returned. State Active, Applied No. Applied version moves to v1 for all three members." },
      { when: "02/09/2026 03:20", event: "Binding applied", ver: "v1", farmer: "Farmer 00047733", by: "System", detail: "Indebtedness 57.6% against a limit of 40%. Applied turns Yes for every member in force. Analysis PA-0009142." },
      { when: "26/09/2026 11:08", event: "Member added", ver: "v2", farmer: "Farmer 00047901", by: "User 4471", detail: "Approved by User 3110. State Amending. Version 1 keeps governing the other three." },
      { when: "26/09/2026 11:09", event: "Document issued", ver: "v2", farmer: "-", by: "System", detail: "2026-BND-004417-2 generated and sent to four members. Every member signs again." },
      { when: "28/09/2026 09:44", event: "Signature received", ver: "v2", farmer: "Farmer 00047733", by: "Field", detail: "1 of 4." },
      { when: "29/09/2026 08:15", event: "Signature received", ver: "v2", farmer: "Farmer 00041288", by: "Field", detail: "2 of 4." },
      { when: "29/09/2026 08:52", event: "Signature received", ver: "v2", farmer: "Farmer 00041290", by: "Field", detail: "3 of 4. Awaiting Farmer 00047901. Applied version stays v1 until the last one arrives." },
    ],
    credits: [
      { id: "c1", date: "08/09/2026", event: "Tobacco delivery", farmer: "Farmer 00041288", credit: 50000, ownDebt: 30000, recovered: 20000, takenFrom: "Farmer 00047733", debtAfter: 22000, analysis: "PA-0009142" },
      { id: "c2", date: "14/09/2026", event: "Tobacco delivery", farmer: "Farmer 00041290", credit: 12400, ownDebt: 12400, recovered: 0, takenFrom: "-", debtAfter: 22000, analysis: "PA-0009331" },
      { id: "c3", date: "19/09/2026", event: "Insurance credit", farmer: "Farmer 00047733", credit: 8000, ownDebt: 8000, recovered: 0, takenFrom: "-", debtAfter: 14000, analysis: "PA-0009402" },
      { id: "c4", date: "23/09/2026", event: "Tobacco delivery", farmer: "Farmer 00041288", credit: 22000, ownDebt: 0, recovered: 14000, takenFrom: "Farmer 00047733", debtAfter: 0, analysis: "PA-0009517" },
      { id: "c5", date: "28/09/2026", event: "Tobacco delivery", farmer: "Farmer 00047733", credit: 15600, ownDebt: 0, recovered: 0, takenFrom: "-", debtAfter: 0, analysis: "PA-0009620" },
    ],
  },
  simpleBinding({ id: "BND-0004418", crop: "2026/2027", tobaccoType: "Virginia", origin: "Automatic - same tax number", document: "Not required", state: "Active", applied: "No", trigger: "None", appliedOn: "-", created: "01/07/2026",
    members: [m("Farmer 00038120", "Same tax number", "CT-100081", 12.3, 81), m("Farmer 00038121", "Same tax number", "CT-100082", 9.7, 74)] }, "01/07/2026", false),
  simpleBinding({ id: "BND-0004392", crop: "2026/2027", tobaccoType: "Virginia", origin: "Automatic - spouse", document: "Not required", state: "Active", applied: "No", trigger: "None", appliedOn: "-", created: "01/07/2026",
    members: [m("Farmer 00036004", "Head of household", "CT-100191", 24.0, 88), m("Farmer 00036005", "Spouse of the head", "CT-100193", 15.2, 61)] }, "01/07/2026", false),
  simpleBinding({ id: "BND-0004455", crop: "2026/2027", tobaccoType: "Burley", origin: "Requested - Finance", document: "v1 sent 19/09/2026", state: "Pending", applied: "No", trigger: "Estimate 231%", appliedOn: "Held - unsigned", created: "19/09/2026",
    members: [m("Farmer 00044010", "Head of household", "CT-100441", 20.5, 231, { trigger: "Estimate", signature: "Pending", inForce: false }), m("Farmer 00044011", "Brother, own contract", "CT-100451", 18.0, 64, { signature: "Pending", inForce: false }), m("Farmer 00044012", "Son, own contract", "CT-100452", 11.4, 59, { signature: "Pending", inForce: false })] }, "19/09/2026", true),
  simpleBinding({ id: "BND-0004501", crop: "2026/2027", tobaccoType: "Virginia", origin: "Requested - technician", document: "Refused 22/09/2026", state: "Pending", applied: "No", trigger: "None", appliedOn: "-", created: "15/09/2026",
    members: [m("Farmer 00045220", "Head of household", "CT-100271", 28.9, 77, { signature: "Refused 22/09/2026", inForce: false }), m("Farmer 00045221", "Son, own contract", "CT-100272", 19.6, 52, { signature: "Pending", inForce: false })] }, "15/09/2026", true),
  { ...simpleBinding({ id: "BND-0004180", crop: "2026/2027", tobaccoType: "Virginia", origin: "Requested - technician", document: "Signed 02/06/2026", state: "Dissolved", applied: "No", trigger: "Indebtedness 51.0%", appliedOn: "14/08/2026", created: "20/05/2026",
    members: [m("Farmer 00031002", "Head of household", "CT-100051", 51.0, 90, { signature: "Signed 02/06/2026", inForce: false }), m("Farmer 00031003", "Spouse of the head", "CT-100052", 12.0, 47, { signature: "Signed 02/06/2026", inForce: false })] }, "20/05/2026", true), dissolvedOn: "30/09/2026" },
]

/* Candidate farmers offered on New binding and Add a farmer. */
const CANDIDATES: Member[] = [
  m("Farmer 00041288", "Head of household", "CT-100121", 18.4, 96),
  m("Farmer 00041290", "Spouse of the head", "CT-100123", 22.1, 38),
  m("Farmer 00047733", "Son, own contract", "CT-100311", 57.6, 70),
  m("Farmer 00047901", "Same cluster, no family link", "CT-100521", 31.0, 93),
  m("Farmer 00048115", "Brother, own contract", "CTR-118431", 26.4, 55),
  m("Farmer 00050201", "Head of household", "CTR-118402", 18.4, 92),
  m("Farmer 00050202", "Brother, own contract", "CTR-118403", 24.6, 78),
  m("Farmer 00050203", "Spouse of the head", "CTR-118405", 21.0, 64),
  m("Farmer 00050204", "Head of household", "CTR-118411", 29.5, 85),
  m("Farmer 00050205", "Son, own contract", "CTR-118412", 17.8, 71),
  m("Farmer 00050206", "Sister, own contract", "CTR-118432", 22.3, 69),
  m("Farmer 00050207", "Brother, own contract", "CTR-120104", 31.1, 60),
  m("Farmer 00050210", "Head of household", "CTR-120101", 14.2, 81),
  m("Farmer 00050211", "Son, own contract", "CTR-120102", 33.8, 66),
  m("Farmer 00050212", "Head of household", "CTR-120103", 21.5, 74),
  m("Farmer 00050213", "Daughter, own contract", "CTR-120105", 44.9, 58),
  m("Farmer 00050220", "Head of household", "CTR-120201", 19.7, 88),
  m("Farmer 00050221", "Son, own contract", "CTR-120202", 27.3, 61),
  m("Farmer 00050222", "Daughter, own contract", "CTR-120203", 12.6, 95),
  m("Farmer 00050223", "Head of household", "CTR-120204", 38.1, 52),
  m("Farmer 00050224", "Same cluster, no family link", "CTR-120205", 24.0, 70),
  m("Farmer 00050225", "Nephew, own contract", "CTR-120206", 16.8, 83),
  m("Farmer 00050230", "Head of household", "CTR-120301", 29.4, 77),
  m("Farmer 00050231", "Son, own contract", "CTR-120302", 41.2, 49),
  m("Farmer 00050232", "Same cluster, no family link", "CTR-120303", 18.9, 90),
  m("Farmer 00050233", "Head of household", "CTR-120304", 23.6, 68),
  m("Farmer 00050234", "Son, own contract", "CTR-120305", 35.5, 57),
  m("Farmer 00050235", "Same cluster, no family link", "CTR-120306", 11.3, 99),
  m("Farmer 00050214", "Same cluster, no family link", "CTR-120106", 27.9, 72),
  m("Farmer 00050215", "Same cluster, no family link", "CTR-120107", 15.4, 86),
  m("Farmer 00050226", "Same cluster, no family link", "CTR-120207", 30.2, 64),
]

/* Household links: selecting the main farmer selects the linked farmers automatically. */
const LINKS: Record<string, string[]> = {
  "Farmer 00041288": ["Farmer 00041290", "Farmer 00047733"],
  "Farmer 00050210": ["Farmer 00050211"],
  "Farmer 00050212": ["Farmer 00050213"],
  "Farmer 00050220": ["Farmer 00050221", "Farmer 00050222"],
  "Farmer 00050223": ["Farmer 00050225"],
  "Farmer 00050230": ["Farmer 00050231"],
  "Farmer 00050233": ["Farmer 00050234"],
}
const mainOf = (f: string) => Object.keys(LINKS).find((h) => LINKS[h].includes(f))
/* Toggle a farmer in a selection; the main farmer brings (or drops) the linked farmers that can be selected. */
const toggleLinked = (sel: string[], f: string, selectable: string[]) => {
  const linked = (LINKS[f] ?? []).filter((x) => selectable.includes(x))
  return sel.includes(f) ? sel.filter((x) => x !== f && !linked.includes(x)) : [...new Set([...sel, f, ...linked])]
}
const live = (b: BindingRec) => b.state !== "Dissolved" && b.state !== "Cancelled"
/* The binding a farmer already belongs to, if any. */
const boundIn = (all: BindingRec[], f: string, exceptId?: string) => all.find((b) => b.id !== exceptId && live(b) && b.members.some((x) => x.farmer === f))?.id
/* Stands in for the server-side check run before a binding is saved. */
const checkBinding = (all: BindingRec[], farmers: string[], exceptId?: string) =>
  new Promise<string | null>((resolve) => setTimeout(() => {
    const set = [...farmers].sort().join("|")
    const same = all.find((b) => b.id !== exceptId && live(b) && b.members.map((x) => x.farmer).sort().join("|") === set)
    if (same) return resolve(`A binding with these farmers already exists: ${same.id}.`)
    const clash = farmers.map((f) => [f, boundIn(all, f, exceptId)] as const).filter(([, id]) => id)
    resolve(clash.length ? `Already bound in another binding: ${clash.map(([f, id]) => `${f} (${id})`).join(", ")}.` : null)
  }, 700))

/* Reverses every open binding recovery that matches; amounts go back to the farmer they were taken from. */
const reverseRecoveries = (cur: BindingRec, match: (c: Credit) => boolean): BindingRec => {
  const hits = cur.credits.filter((c) => c.recovered > 0 && match(c))
  if (!hits.length) return cur
  const total = hits.reduce((n, c) => n + c.recovered, 0)
  return {
    ...cur,
    credits: cur.credits.map((c) => (hits.includes(c) ? { ...c, recovered: 0, reversed: c.recovered } : c)),
    log: [...cur.log, { when: now(), event: "Recovery reversed", ver: latestVersion(cur), farmer: "-", by: "User 4471", detail: `${money(total)} reversed across ${hits.length} recoveries.` }],
  }
}
const recoveredFor = (b: BindingRec, match: (c: Credit) => boolean) => b.credits.filter((c) => c.recovered > 0 && match(c)).reduce((n, c) => n + c.recovered, 0)
const ReverseCheck = ({ checked, onChange, amount }: { checked: boolean; onChange: (v: boolean) => void; amount: number }) => (
  <div className="mt-4 rounded-xl border border-line bg-canvas px-4 py-3">
    <Checkbox checked={checked} onChange={() => onChange(!checked)} disabled={amount === 0} label={`Also reverse the recovery amount (${money(amount)})`} />
    {amount === 0 && <p className="mt-1 pl-7 text-[12px] text-muted">Nothing has been recovered, so there is nothing to reverse.</p>}
  </div>
)

/* Cancellation: a new request is withdrawn; a pending change reverts to the previous version. */
const cancellable = (b: BindingRec) => b.state === "Pending" || b.state === "Amending" || b.state === "Draft"
const isNewRequest = (b: BindingRec) => b.state === "Draft" || (b.state === "Pending" && b.versions.length <= 1)
const previousVersion = (b: BindingRec) => b.versions[b.versions.length - 2]?.version ?? "v1"
const pendingMembers = (b: BindingRec) => {
  const latest = b.versions[b.versions.length - 1]?.version
  const before = b.prev?.members ?? b.members.filter((x) => x.inForce || x.appliedVersion !== latest)
  return { added: b.members.filter((x) => !before.some((y) => y.farmer === x.farmer)).map((x) => x.farmer), removed: before.filter((x) => !b.members.some((y) => y.farmer === x.farmer)).map((x) => x.farmer), before }
}
const cancelPending = (cur: BindingRec, comment: string): BindingRec => {
  const note = comment.trim() ? ` Comment: ${comment.trim()}` : ""
  if (isNewRequest(cur)) return {
    ...cur, state: "Cancelled", document: `Cancelled ${today()}`, prev: undefined, members: cur.members.map((x) => ({ ...x, inForce: false })),
    versions: cur.versions.map((v) => ({ ...v, status: "Refused" as const })),
    log: [...cur.log, { when: now(), event: "Binding cancelled", ver: latestVersion(cur), farmer: "-", by: "User 4471", detail: `Request withdrawn before it was applied. The document sent for signature is void.${note}` }],
  }
  const last = latestVersion(cur)
  const back = previousVersion(cur)
  const { before } = pendingMembers(cur)
  return {
    ...cur, prev: undefined, members: before,
    state: cur.prev?.state ?? (before.some((x) => x.inForce) ? "Active" : "Pending"),
    document: cur.prev?.document ?? `${back} in force`,
    versions: cur.versions.slice(0, -1),
    log: [...cur.log, { when: now(), event: "Change cancelled", ver: back, farmer: "-", by: "User 4471", detail: `${last} withdrawn and its signatures voided. Binding reverted to ${back}.${note}` }],
  }
}
const Comment = ({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) => (
  <label className="mt-4 block">
    <span className="mb-1.5 block text-[12.5px] font-600 text-ink-soft">{label}{required && <span className="text-[#c23b3b]"> *</span>}</span>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft" />
  </label>
)
const Explain = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-3 flex gap-2 rounded-xl border border-[#f2ddb3] bg-[#fdf6e7] px-3.5 py-2.5 text-[13px] text-[#7a5410]"><Info size={15} className="mt-0.5 shrink-0" /><span>{children}</span></div>
)
/* Cancel control used in table actions (icon) and inside the edit screen (button). */
function CancelBinding({ b, onChange, variant = "icon" }: { b: BindingRec; onChange: (fn: (b: BindingRec) => BindingRec) => void; variant?: "icon" | "button" }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState("")
  if (!cancellable(b)) return null
  const fresh = isNewRequest(b)
  const back = previousVersion(b)
  const { added, removed } = pendingMembers(b)
  const label = fresh ? "Cancel binding" : `Cancel change - revert to ${back}`
  const go = () => {
    onChange((cur) => cancelPending(cur, comment))
    setOpen(false)
    toast({ tone: "success", title: fresh ? "Binding cancelled" : "Change cancelled", body: fresh ? `${b.id} was withdrawn.` : `${b.id} is back on ${back}.` })
  }
  return (<>
    {variant === "icon"
      ? <button type="button" onClick={() => { setComment(""); setOpen(true) }} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[#fdecec] hover:text-[#c23b3b]" aria-label={`${label} ${b.id}`} title={label}><Undo2 size={15} /></button>
      : <Button variant="outline" size="sm" onClick={() => { setComment(""); setOpen(true) }}><Undo2 size={15} /> {fresh ? "Cancel binding" : "Cancel change"}</Button>}
    <Modal open={open} onClose={() => setOpen(false)} title={fresh ? "Cancel this binding?" : `Cancel ${latestVersion(b)} and revert?`} width="max-w-md">
      <p className="text-[14px] text-ink">
        {fresh
          ? <><b>{b.id}</b> has not been applied yet. Cancelling withdraws the request and voids the document sent for signature. No farmer is bound.</>
          : <>The pending change on <b>{b.id}</b> is withdrawn and the binding goes back to <b>{back}</b>, exactly as it was before.</>}
      </p>
      {!fresh && (added.length > 0 || removed.length > 0) && (
        <div className="mt-3 space-y-1 rounded-xl border border-line bg-canvas px-4 py-3 text-[13px]">
          {added.map((f) => <p key={f}><span className="font-700 text-[#c23b3b]">Leaves:</span> {f} (added in {latestVersion(b)})</p>)}
          {removed.map((f) => <p key={f}><span className="font-700 text-[#1a7a45]">Returns:</span> {f} (removed in {latestVersion(b)})</p>)}
        </div>
      )}
      <Comment label="Comment" value={comment} onChange={setComment} />
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="outline" onClick={() => setOpen(false)}>Keep</Button>
        <Button variant="danger" onClick={go} className="!border-[#c23b3b] !bg-[#c23b3b] !text-white hover:!bg-[#a83232]">{fresh ? "Cancel binding" : `Revert to ${back}`}</Button>
      </div>
    </Modal>
  </>)
}

const opts = (values: string[]) => values.map((value) => ({ value, label: value }))
const th = "px-3 py-3 whitespace-nowrap"
const td = "px-3 py-2.5"

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

function TabStrip<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-6 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${value === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
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

const Head = ({ cols }: { cols: string[] }) => (
  <thead className="bg-brand-soft text-[11px] font-700 uppercase tracking-wide text-brand">
    <tr>{cols.map((c, i) => <th key={i} className={th}>{c}</th>)}</tr>
  </thead>
)

function Meta({ items }: { items: { label: string; value: React.ReactNode; tone?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-9">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-[10.5px] font-800 uppercase tracking-wide text-muted">{it.label}</dt>
          <dd className={`mt-0.5 truncate text-[13.5px] font-700 ${it.tone ?? "text-ink"}`}>{it.value}</dd>
        </div>
      ))}
    </div>
  )
}

/* Relationship cell with the main farmer it is linked to. */
function LinkedRel({ c }: { c: Member }) {
  const main = mainOf(c.farmer)
  return <span>{c.relationship}{main && <span className="ml-1.5 text-[12px] text-muted">- linked to {main.replace("Farmer ", "")}</span>}{LINKS[c.farmer] && <span className="ml-1.5 text-[12px] text-muted">- selects {LINKS[c.farmer].length} linked</span>}</span>
}

/* A farmer that cannot be selected because it already belongs to another binding. */
function BlockedRow({ c, id, cols }: { c: Member; id: string; cols: number }) {
  return (
    <tr className="cursor-not-allowed border-t border-line bg-canvas/50 text-muted">
      <td className={`${td} w-10`}><Lock size={14} /></td>
      <td className={`${td} font-600`}>{c.farmer}</td>
      <td className={td} colSpan={cols - 2}>Already in {id} - a farmer can belong to one binding only</td>
    </tr>
  )
}

function ConflictNote({ text }: { text: string }) {
  return (
    <p className="mt-3 flex items-start gap-2 rounded-lg border border-[#f3c9c9] bg-[#fdecec] px-3 py-2.5 text-[13px] font-600 text-[#a83232]">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {text}
    </p>
  )
}

/* Flat KPI strip: evenly spaced figures separated by hairlines, no card chrome. */
function StatStrip({ items }: { items: { label: string; value: React.ReactNode; tone?: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-y-4 border-y border-line py-4 sm:grid-cols-3 xl:flex xl:divide-x xl:divide-line">
      {items.map((it) => (
        <div key={it.label} className="min-w-0 px-5 first:pl-0 xl:flex-1">
          <dt className="text-[11px] font-700 uppercase tracking-[0.06em] text-muted">{it.label}</dt>
          <dd className={`mt-1.5 truncate text-[20px] font-800 leading-tight tabular-nums ${it.tone ?? "text-ink"}`}>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`flex items-center gap-2 text-[12px] font-700 ${checked ? "text-brand" : "text-muted"}`}>
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-brand" : "bg-[#c7d2e6]"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
      {checked ? "On" : "Off"}
    </button>
  )
}

/* Shared confirmation dialog for actions that change or end a binding. */
function ConfirmDialog({ open, title, children, confirmLabel, danger, onCancel, onConfirm }: { open: boolean; title: string; children: React.ReactNode; confirmLabel: string; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} width="max-w-md">
      <div className="text-[14px] leading-relaxed text-ink-soft">{children}</div>
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} className={danger ? "!bg-[#c23b3b] hover:!bg-[#a83232]" : ""}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

const RadioDot = ({ on }: { on: boolean }) => (
  <span className={`inline-grid h-[18px] w-[18px] place-items-center rounded-full border ${on ? "border-brand" : "border-[#c4cfe4]"}`}>
    {on && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
  </span>
)

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

type View = { kind: "list" } | { kind: "detail"; id: string; readOnly?: boolean } | { kind: "new" } | { kind: "history" }

export default function Binding({ onCrumbs, ft = false, onOpenAnalysis }: { onCrumbs?: (crumbs: BindingCrumb[]) => void; ft?: boolean; onOpenAnalysis?: () => void } = {}) {
  const [bindings, setBindings] = useState<BindingRec[]>(SEED)
  const [view, setView] = useState<View>({ kind: "list" })
  const [listTab, setListTab] = useState<ListTab>("bindings")
  const [history, setHistory] = useState<HistoryRow[]>(SEED_HISTORY)
  const viewKey = view.kind === "detail" ? `d:${view.id}:${view.readOnly ? "v" : "e"}` : view.kind

  useEffect(() => {
    if (!onCrumbs) return
    const toList = () => setView({ kind: "list" })
    const root = ft ? "Binding FT Requests" : "Binding"
    if (view.kind === "list") onCrumbs([{ label: root }])
    else if (view.kind === "history") onCrumbs([{ label: root, onClick: () => { setListTab("bindings"); toList() } }, { label: "Parameters", onClick: () => { setListTab("parameters"); toList() } }, { label: "Change history" }])
    else if (view.kind === "new") onCrumbs([{ label: root, onClick: toList }, { label: "New binding" }])
    else onCrumbs([{ label: root, onClick: toList }, { label: view.id }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey, onCrumbs])
  useEffect(() => () => onCrumbs?.([]), [onCrumbs])
  const update = (id: string, fn: (b: BindingRec) => BindingRec) => setBindings((all) => all.map((b) => (b.id === id ? fn(b) : b)))

  if (view.kind === "new") {
    return (
      <NewBinding
        nextId={`BND-${String(4502 + bindings.length).padStart(7, "0")}`}
        bindings={bindings}
        onBack={() => setView({ kind: "list" })}
        onCreate={(b) => { setBindings((all) => [b, ...all]); setView({ kind: "list" }) }}
      />
    )
  }
  if (view.kind === "history") return <ChangeHistory history={history} onBack={() => { setListTab("parameters"); setView({ kind: "list" }) }} />
  if (view.kind === "detail") {
    const b = bindings.find((x) => x.id === view.id)
    if (b) return <BindingDetail onOpenAnalysis={onOpenAnalysis} all={bindings} readOnly={!!view.readOnly} binding={b} onBack={() => setView({ kind: "list" })} onChange={(fn) => update(b.id, fn)} />
  }
  if (ft) return <FtRequests bindings={bindings} onOpen={(id) => setView({ kind: "detail", id })} onView={(id) => setView({ kind: "detail", id, readOnly: true })} onNew={() => setView({ kind: "new" })} onChange={update} />
  return <BindingList tab={listTab} setTab={setListTab} history={history} setHistory={setHistory} onHistory={() => setView({ kind: "history" })} onChange={update} bindings={bindings} onOpen={(id) => setView({ kind: "detail", id })} onView={(id) => setView({ kind: "detail", id, readOnly: true })} onNew={() => setView({ kind: "new" })} />
}

/* ------------------------------------------------------------------ */
/* List                                                                 */
/* ------------------------------------------------------------------ */

type ListTab = "bindings" | "requests" | "dissolutions" | "parameters"

function BindingList({ tab, setTab, history, setHistory, onHistory, onChange, bindings, onOpen, onView, onNew }: { onChange: (id: string, fn: (b: BindingRec) => BindingRec) => void; tab: ListTab; setTab: (t: ListTab) => void; history: HistoryRow[]; setHistory: React.Dispatch<React.SetStateAction<HistoryRow[]>>; onHistory: () => void; bindings: BindingRec[]; onOpen: (id: string) => void; onView: (id: string) => void; onNew: () => void }) {
  return (
    <div className="space-y-5">
      <TabStrip<ListTab>
        value={tab}
        onChange={setTab}
        tabs={[{ key: "bindings", label: "Bindings" }, { key: "requests", label: "Requests" }, { key: "dissolutions", label: "Dissolutions" }, { key: "parameters", label: "Parameters" }]}
      />
      {tab === "bindings" && <BindingsTab onChange={onChange} bindings={bindings} onOpen={onOpen} onView={onView} onNew={onNew} />}
      {tab === "requests" && <RequestsTab onChange={onChange} bindings={bindings.filter((b) => b.state === "Pending" || b.state === "Draft" || b.state === "Amending")} onOpen={onOpen} onView={onView} />}
      {tab === "dissolutions" && <DissolutionsTab bindings={bindings.filter((b) => b.state === "Dissolved")} onOpen={onView} />}
      {tab === "parameters" && <ParametersTab setHistory={setHistory} onHistory={onHistory} count={history.length} />}
    </div>
  )
}

type Filters = { farmer: string; binding: string; crop: string; tobacco: string; state: string; applied: string; origin: string }
const NO_FILTERS: Filters = { farmer: "", binding: "", crop: "2026/2027", tobacco: "All", state: "All", applied: "All", origin: "All" }

const filterBindings = (bindings: BindingRec[], filters: Filters) => bindings.filter((b) =>
  (!filters.farmer || b.members.some((x) => x.farmer === filters.farmer)) &&
  (!filters.binding || b.id === filters.binding) &&
  b.crop === filters.crop &&
  (filters.tobacco === "All" || b.tobaccoType === filters.tobacco) &&
  (filters.state === "All" || b.state === filters.state) &&
  (filters.applied === "All" || b.applied === filters.applied) &&
  (filters.origin === "All" || b.origin.startsWith(filters.origin)),
)

/* Shared filter card for the Bindings tab and the FT requests screen. */
function BindingFilters({ bindings, filters, setFilters, actions }: { bindings: BindingRec[]; filters: Filters; setFilters: React.Dispatch<React.SetStateAction<Filters>>; actions?: React.ReactNode }) {
  const draft = filters
  const set = (k: keyof Filters) => (v: string) => setFilters((f) => ({ ...f, [k]: v }))
  const [more, setMore] = useState(false)
  const extraActive = (["tobacco", "state", "applied", "origin"] as const).filter((k) => filters[k] !== "All").length
  const farmers = Array.from(new Set(bindings.flatMap((b) => b.members.map((x) => x.farmer)))).sort()
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid flex-1 grid-cols-1 items-end gap-3 sm:grid-cols-3 lg:max-w-[720px]">
          <Field label="Farmer"><Select searchable clearable value={draft.farmer} onChange={set("farmer")} options={farmers.map((value) => ({ value, label: farmerLabel(value) }))} placeholder="Search code or name" /></Field>
          <Field label="Binding"><Select searchable clearable value={draft.binding} onChange={set("binding")} options={opts(bindings.map((b) => b.id))} placeholder="Any binding" /></Field>
          <Field label="Crop"><Select value={draft.crop} onChange={set("crop")} options={opts(["2025/2026", "2026/2027"])} /></Field>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={() => setMore((m) => !m)}>
            <SlidersHorizontal size={16} /> {more ? "Fewer filters" : "More filters"}{extraActive > 0 && !more ? ` (${extraActive})` : ""}
          </Button>
          {actions}
        </div>
      </div>
      {more && (
        <div className="mt-4 grid grid-cols-1 items-end gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tobacco type"><Select value={draft.tobacco} onChange={set("tobacco")} options={opts(["All", "Virginia", "Burley"])} /></Field>
        <Field label="State"><Select value={draft.state} onChange={set("state")} options={opts(["All", "Active", "Amending", "Pending", "Dissolved", "Draft"])} /></Field>
        <Field label="Applied"><Select value={draft.applied} onChange={set("applied")} options={opts(["All", "Yes", "No"])} /></Field>
        <Field label="Origin"><Select value={draft.origin} onChange={set("origin")} options={opts(["All", "Requested", "Automatic"])} /></Field>
        </div>
      )}
    </Card>
  )
}

function BindingsTab({ bindings, onOpen, onView, onNew, onChange }: { onChange: (id: string, fn: (b: BindingRec) => BindingRec) => void; bindings: BindingRec[]; onOpen: (id: string) => void; onView: (id: string) => void; onNew: () => void }) {
  const toast = useToast()
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const rows = filterBindings(bindings, filters)

  const kpis = [
    { label: "Bindings in the crop", value: bindings.length, icon: Boxes, chip: "bg-brand-soft text-brand" },
    { label: "Active", value: bindings.filter((b) => b.state === "Active").length, icon: ShieldCheck, chip: "bg-[#edf8f1] text-[#187247]" },
    { label: "Applied - recovering", value: bindings.filter((b) => b.applied === "Yes").length, icon: AlertTriangle, chip: "bg-[#fdecec] text-[#c23b3b]" },
    { label: "Awaiting signature", value: bindings.filter((b) => b.versions.some((v) => v.status === "Awaiting signature")).length, icon: Clock, chip: "bg-brand-soft text-brand" },
    { label: "Amending - new version out", value: bindings.filter((b) => b.state === "Amending").length, icon: FileText, chip: "bg-[#fff6e5] text-[#9a6a12]" },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="flex items-center gap-3.5 p-4">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.chip}`}><k.icon size={19} /></span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-500 text-muted">{k.label}</p>
              <p className="mt-0.5 text-[22px] font-800 leading-tight text-ink tabular-nums">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <BindingFilters bindings={bindings} filters={filters} setFilters={setFilters} actions={<>
        <Button variant="outline" onClick={() => toast({ tone: "success", title: "Export started", body: `${rows.length} bindings exported to Excel.` })}><ExternalLink size={16} /> Export</Button>
        <Button onClick={onNew}><Plus size={16} /> New binding</Button>
      </>} />

      <div>
        <TableCard minWidth={1350}>
          <Head cols={["Binding", "Members", "Tobacco type", "Origin", "Ver", "Document", "State", "Applied", "Trigger", "Applied on", "Created", "Actions"]} />
          <tbody>
            {rows.map((b) => {
              const dim = b.state === "Dissolved"
              return (
                <tr key={b.id} className={`border-t border-line ${dim ? "italic text-muted" : ""}`}>
                  <td className={td}><button onClick={() => onOpen(b.id)} className="font-700 text-brand hover:underline">{b.id}</button></td>
                  <td className={`${td} tabular-nums`}>{b.members.length}</td>
                  <td className={td}>{b.tobaccoType}</td>
                  <td className={td}>{b.origin}</td>
                  <td className={td}>{latestVersion(b)}</td>
                  <td className={`${td} ${b.document.startsWith("Refused") ? "text-[#c23b3b]" : b.document.includes("sent") ? "text-[#9a6a12]" : ""}`}>{b.document}</td>
                  <td className={td}><Badge tone={STATE_TONE[b.state]}>{b.state}</Badge></td>
                  <td className={`${td} ${b.applied === "Yes" ? "font-700 text-[#c23b3b]" : ""}`}>{b.applied}</td>
                  <td className={`${td} ${b.trigger === "None" ? "text-muted" : ""}`}>{b.trigger}</td>
                  <td className={`${td} ${b.appliedOn.startsWith("Held") ? "text-[#c23b3b]" : ""}`}>{b.appliedOn}</td>
                  <td className={td}>{b.created}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    <div className="inline-flex items-center gap-1">
                    <button onClick={() => onView(b.id)} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand" aria-label={`View ${b.id}`} title="View binding"><Eye size={15} /></button>
                    <button onClick={() => onOpen(b.id)} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand" aria-label={`Edit ${b.id}`} title="Edit binding">
                      <Pencil size={15} />
                    </button>
                    
                    </div>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr className="border-t border-line"><td colSpan={12} className="px-3 py-8 text-center text-muted">No bindings match the search.</td></tr>
            )}
          </tbody>
        </TableCard>
      </div>
    </div>
  )
}

function RequestsTab({ bindings, onOpen, onView, onChange }: { onChange: (id: string, fn: (b: BindingRec) => BindingRec) => void; bindings: BindingRec[]; onOpen: (id: string) => void; onView: (id: string) => void }) {
  return (
    <div>
      <TableCard minWidth={900}>
        <Head cols={["Binding", "Origin", "Members", "Document", "Outstanding signatures", "State", "Created", "Actions"]} />
        <tbody>
          {bindings.map((b) => {
            const v = b.versions[b.versions.length - 1]
            return (
              <tr key={b.id} className="border-t border-line">
                <td className={td}><button onClick={() => onOpen(b.id)} className="font-700 text-brand hover:underline">{b.id}</button></td>
                <td className={td}>{b.origin}</td>
                <td className={`${td} tabular-nums`}>{b.members.length}</td>
                <td className={td}>{b.document}</td>
                <td className={`${td} ${v?.outstanding.length ? "text-[#c23b3b]" : "text-muted"}`}>{v?.outstanding.join(", ") || "None"}</td>
                <td className={td}><Badge tone={STATE_TONE[b.state]}>{b.state}</Badge></td>
                <td className={td}>{b.created}</td>
                <td className={`${td} whitespace-nowrap`}><div className="inline-flex items-center gap-1"><button onClick={() => onView(b.id)} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand" aria-label={`View ${b.id}`} title="View binding"><Eye size={15} /></button><button onClick={() => onOpen(b.id)} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand" aria-label={`Edit ${b.id}`} title="Edit binding"><Pencil size={15} /></button></div></td>
              </tr>
            )
          })}
        </tbody>
      </TableCard>
    </div>
  )
}

/* FT requests: requests table with New binding and Dissolve actions. */
function FtRequests({ bindings, onOpen, onView, onNew, onChange }: { bindings: BindingRec[]; onOpen: (id: string) => void; onView: (id: string) => void; onNew: () => void; onChange: (id: string, fn: (b: BindingRec) => BindingRec) => void }) {
  const toast = useToast()
  const [selected, setSelected] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [reverse, setReverse] = useState(false)
  const [comment, setComment] = useState("")
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const rows = filterBindings(bindings, filters)
  const sel = bindings.find((b) => b.id === selected)
  const canDissolve = !!sel && sel.state !== "Dissolved" && sel.state !== "Cancelled"
  const dissolve = () => {
    if (!sel) return
    onChange(sel.id, (cur) => ({
      ...cur, state: "Dissolved", applied: "No", dissolvedOn: today(), members: cur.members.map((x) => ({ ...x, inForce: false })),
      log: [...cur.log, { when: now(), event: "Binding dissolved", ver: latestVersion(cur), farmer: "-", by: "User 4471", detail: `Dissolution approved. All credits in the history of the binding are reversed. Comment: ${comment.trim()}` }],
    }))
    if (reverse) onChange(sel.id, (cur) => reverseRecoveries(cur, () => true))
    toast({ tone: "success", title: "Binding dissolved", body: `${sel.id} is now dissolved.${reverse ? " Recoveries reversed." : ""}` })
    setConfirm(false)
  }
  return (
    <div className="space-y-5">
      <BindingFilters bindings={bindings} filters={filters} setFilters={setFilters} actions={<>
        <Button variant="danger" disabled={!canDissolve} onClick={() => { setReverse(false); setComment(""); setConfirm(true) }} className="!border-[#c23b3b] !text-[#c23b3b] hover:!bg-[#fdecec]">Dissolve</Button>
        <Button onClick={onNew}><Plus size={16} /> New binding</Button>
      </>} />
      <TableCard minWidth={960}>
        <Head cols={["", "Binding", "Origin", "Members", "Document", "Outstanding signatures", "State", "Created", "Actions"]} />
        <tbody>
          {rows.map((b) => {
            const v = b.versions[b.versions.length - 1]
            const on = selected === b.id
            return (
              <tr key={b.id} onClick={() => setSelected(b.id)} className={`cursor-pointer border-t border-line transition ${on ? "bg-brand-soft/50" : "hover:bg-canvas"}`}>
                <td className={`${td} w-10`}><RadioDot on={on} /></td>
                <td className={td}><button onClick={(e) => { e.stopPropagation(); onOpen(b.id) }} className="font-700 text-brand hover:underline">{b.id}</button></td>
                <td className={td}>{b.origin}</td>
                <td className={`${td} tabular-nums`}>{b.members.length}</td>
                <td className={td}>{b.document}</td>
                <td className={`${td} ${v?.outstanding.length ? "text-[#c23b3b]" : "text-muted"}`}>{v?.outstanding.join(", ") || "None"}</td>
                <td className={td}><Badge tone={STATE_TONE[b.state]}>{b.state}</Badge></td>
                <td className={td}>{b.created}</td>
                <td className={`${td} whitespace-nowrap`} onClick={(e) => e.stopPropagation()}><div className="inline-flex items-center gap-1"><button onClick={() => onView(b.id)} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand" aria-label={`View ${b.id}`} title="View binding"><Eye size={15} /></button>{b.state !== "Dissolved" && b.state !== "Cancelled" && <button onClick={() => onOpen(b.id)} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand" aria-label={`Edit ${b.id}`} title="Edit binding"><Pencil size={15} /></button>}</div></td>
              </tr>
            )
          })}
          {rows.length === 0 && <tr className="border-t border-line"><td colSpan={9} className="px-3 py-8 text-center text-muted">No bindings match the search.</td></tr>}
        </tbody>
      </TableCard>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Dissolve binding?" width="max-w-md">
        <p className="text-[14px] text-ink">Dissolve <b>{sel?.id}</b>? Every member will be analysed on their own position from now on. This cannot be undone.</p>
        <Explain>All credits in the history of the binding are reversed.</Explain>
        {sel && <ReverseCheck checked={reverse} onChange={setReverse} amount={recoveredFor(sel, () => true)} />}
        <Comment label="Dissolution comment" value={comment} onChange={setComment} required />
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button variant="danger" disabled={!comment.trim()} onClick={dissolve} className="!border-[#c23b3b] !bg-[#c23b3b] !text-white hover:!bg-[#a83232]">Dissolve binding</Button>
        </div>
      </Modal>
    </div>
  )
}

function DissolutionsTab({ bindings, onOpen }: { bindings: BindingRec[]; onOpen: (id: string) => void }) {
  return (
    <div>
      <TableCard minWidth={800}>
        <Head cols={["Binding", "Members", "Tobacco type", "Last trigger", "Applied on", "Dissolved on", "Actions"]} />
        <tbody>
          {bindings.map((b) => (
            <tr key={b.id} className="border-t border-line">
              <td className={td}><button onClick={() => onOpen(b.id)} className="font-700 text-brand hover:underline">{b.id}</button></td>
              <td className={`${td} tabular-nums`}>{b.members.length}</td>
              <td className={td}>{b.tobaccoType}</td>
              <td className={td}>{b.trigger}</td>
              <td className={td}>{b.appliedOn}</td>
              <td className={td}>{b.dissolvedOn ?? "-"}</td>
              <td className={`${td} text-center`}><button onClick={() => onOpen(b.id)} className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-brand" title="View binding"><Eye size={15} /></button></td>
            </tr>
          ))}
          {bindings.length === 0 && <tr className="border-t border-line"><td colSpan={7} className="px-3 py-8 text-center text-muted">No dissolved bindings.</td></tr>}
        </tbody>
      </TableCard>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Parameters                                                          */
/* ------------------------------------------------------------------ */

type Trigger = { key: string; title: string; description: string; comparison: string; on: boolean; value: number | null; lastChanged: string }
type HistoryRow = { changed: string; parameter: string; from: string; to: string; effective: string; by: string; approvedBy: string; applied: string }

const TRIGGERS: Trigger[] = [
  { key: "estimate", title: "Delivered above the estimate", description: "Tobacco delivered above a multiple of the estimate for the member.", comparison: "Delivered / estimate above", on: true, value: 110, lastChanged: "User 3110 - 12/03/2026" },
  { key: "indebtedness", title: "Indebtedness above the limit", description: "The indebtedness ratio of the member against the configured limit.", comparison: "Indebtedness ratio above", on: true, value: 40, lastChanged: "User 3110 - 02/04/2026" },
  { key: "deviator", title: "Flagged as a deviator", description: "The deviator flag maintained on the farmer. There is no value to configure.", comparison: "Flag is set", on: true, value: null, lastChanged: "User 3110 - 01/07/2025" },
  { key: "filler", title: "Flagged as a filler", description: "The filler flag maintained on the farmer. There is no value to configure.", comparison: "Flag is set", on: true, value: null, lastChanged: "User 3110 - 01/07/2025" },
]

const SEED_HISTORY: HistoryRow[] = [
  { changed: "02/04/2026 14:32", parameter: "Indebtedness limit", from: "30%", to: "40%", effective: "02/04/2026", by: "User 4471", approvedBy: "User 3110", applied: "12 - unchanged by this edit" },
  { changed: "18/03/2026 09:15", parameter: "Indebtedness limit", from: "40%", to: "30%", effective: "18/03/2026", by: "User 4471", approvedBy: "User 3110", applied: "31 - unchanged by this edit" },
]
const isoToBr = (iso: string) => { const [y, m, d] = iso.split("-"); return y && m && d ? `${d}/${m}/${y}` : iso }

function ParametersTab({ setHistory, onHistory, count }: { setHistory: React.Dispatch<React.SetStateAction<HistoryRow[]>>; onHistory: () => void; count: number }) {
  const toast = useToast()
  const [saved, setSaved] = useState(TRIGGERS)
  const [triggers, setTriggers] = useState(TRIGGERS)
  const [effectiveIso, setEffectiveIso] = useState("2026-10-01")
  const effective = isoToBr(effectiveIso)
  const dirty = JSON.stringify(saved) !== JSON.stringify(triggers)
  const [ask, setAsk] = useState<null | "discard">(null)
  const [editing, setEditing] = useState<string | null>(null)
  const patch = (key: string, p: Partial<Trigger>) => setTriggers((ts) => ts.map((t) => (t.key === key ? { ...t, ...p } : t)))

  const submit = () => {
    const stamp = `User 4471 - ${today()}`
    const rows: HistoryRow[] = []
    const next = triggers.map((t) => {
      const before = saved.find((s) => s.key === t.key)!
      if (before.on === t.on && before.value === t.value) return t
      const label = t.key === "estimate" ? "Estimate multiple" : t.key === "indebtedness" ? "Indebtedness limit" : t.key === "filler" ? "Filler trigger" : "Deviator trigger"
      if (before.value !== t.value) rows.push({ changed: now(), parameter: label, from: `${before.value}%`, to: `${t.value}%`, effective, by: "User 4471", approvedBy: "-", applied: "0 - unchanged by this edit" })
      if (before.on !== t.on) rows.push({ changed: now(), parameter: `${label} evaluated`, from: before.on ? "On" : "Off", to: t.on ? "On" : "Off", effective, by: "User 4471", approvedBy: "-", applied: "0 - unchanged by this edit" })
      return { ...t, lastChanged: stamp }
    })
    setHistory((h) => [...rows, ...h])
    setSaved(next)
    setTriggers(next)
    setEditing(null)
    toast({ tone: "success", title: "Parameters saved", body: `${rows.length} change(s) saved, effective ${effective}.` })
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle>Scope</SectionTitle>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Effective from" className="w-[190px]"><DatePicker value={effectiveIso} onChange={setEffectiveIso} /></Field>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={onHistory}><ExternalLink size={16} /> Change history ({count})</Button>
            {editing && <>
              <Button variant="outline" onClick={() => (dirty ? setAsk("discard") : setEditing(null))}><X size={16} /> Cancel</Button>
              <Button disabled={!dirty} onClick={submit}><Check size={16} /> Save</Button>
            </>}
          </div>
        </div>
      </Card>

      <div>
        <TableCard minWidth={900}>
          <Head cols={["Trigger", "Comparison", "Value", "Last changed", "Evaluated", "Actions"]} />
          <tbody>
            {triggers.map((t) => { const ed = editing === t.key; return (
              <tr key={t.key} className={`border-t border-line align-middle ${ed ? "bg-brand-soft/40" : ""}`}>
                <td className={td}>
                  <p className="font-700 text-ink">{t.title}</p>
                  <p className="text-[12.5px] text-muted">{t.description}</p>
                </td>
                <td className={`${td} text-ink-soft`}>{t.comparison}</td>
                <td className={`${td} w-40`}>
                  {t.value === null ? (
                    ed ? <Input disabled value="n/a" className="h-9 w-24 text-center" /> : <span className="text-muted">n/a</span>
                  ) : !ed ? (
                    <span className="font-700 tabular-nums text-ink">{t.value}%</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input type="number" value={t.value} disabled={!t.on} onChange={(e) => patch(t.key, { value: Number(e.target.value) })} className="h-9 w-24" />
                      <span className="text-muted">%</span>
                    </div>
                  )}
                </td>
                <td className={`${td} whitespace-nowrap text-ink-soft`}>{t.lastChanged}</td>
                <td className={`${td} w-28`}>{ed ? <Toggle checked={t.on} onChange={(on) => patch(t.key, { on })} /> : <span className={`font-700 ${t.on ? "text-[#1a7a45]" : "text-muted"}`}>{t.on ? "Yes" : "No"}</span>}</td>
                <td className={`${td} w-20`}>
                  <button type="button" title={`Edit ${t.title}`} aria-label={`Edit ${t.title}`} disabled={!!editing && !ed} onClick={() => setEditing(t.key)}
                    className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-35 ${ed ? "bg-brand-soft text-brand" : "text-muted hover:bg-brand-soft hover:text-brand"}`}><Pencil size={15} /></button>
                </td>
              </tr>
            ) })}
          </tbody>
        </TableCard>
      </div>

      <ConfirmDialog open={ask === "discard"} title="Discard changes?" confirmLabel="Discard" danger onCancel={() => setAsk(null)} onConfirm={() => { setAsk(null); setTriggers(saved); setEditing(null) }}>
        Your unsaved trigger changes will be lost.
      </ConfirmDialog>
    </div>
  )
}

function ChangeHistory({ history, onBack }: { history: HistoryRow[]; onBack: () => void }) {
  const toast = useToast()
  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onBack}><ChevronLeft size={16} /> Back</Button>
      </div>
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2.5">{<Button onClick={() => toast({ tone: "success", title: "Export started", body: "Change history exported." })}><ExternalLink size={16} /> Export</Button>}</div>
        <TableCard minWidth={1000}>
          <Head cols={["Timestamp", "Parameter", "From", "To", "Effective from", "Changed by", "Approved by", "Bindings applied while in force"]} />
          <tbody>
            {history.map((h, i) => (
              <tr key={i} className="border-t border-line">
                <td className={`${td} whitespace-nowrap tabular-nums`}>{h.changed}</td>
                <td className={td}>{h.parameter}</td>
                <td className={td}>{h.from}</td>
                <td className={`${td} font-700 text-brand`}>{h.to}</td>
                <td className={td}>{h.effective}</td>
                <td className={td}>{h.by}</td>
                <td className={td}>{h.approvedBy}</td>
                <td className={td}>{h.applied}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

type DetailTab = "members" | "documents" | "credits"

function BindingDetail({ all, binding: b, readOnly = false, onBack, onChange, onOpenAnalysis }: { all: BindingRec[]; binding: BindingRec; readOnly?: boolean; onBack: () => void; onChange: (fn: (b: BindingRec) => BindingRec) => void; onOpenAnalysis?: () => void }) {
  const [tab, setTab] = useState<DetailTab>("members")
  const [docHistory, setDocHistory] = useState(false)
  const [farmer, setFarmer] = useState<string | null>(null)
  if (farmer) return <FarmerAccount farmer={farmer} b={b} onBack={() => setFarmer(null)} />
  if (docHistory) return <DocumentHistory b={b} onBack={() => setDocHistory(false)} />
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <TabStrip<DetailTab> value={tab} onChange={setTab} tabs={[{ key: "members", label: "Members" }, { key: "documents", label: "Documents" }, { key: "credits", label: "Credits and recoveries" }]} />
        <div className="flex items-center gap-2.5 pb-1">
          <Button variant="outline" onClick={onBack}><ChevronLeft size={16} /> Back</Button>
          {tab === "documents" && <Button variant="outline" onClick={() => setDocHistory(true)}><Clock size={16} /> History ({b.log.length})</Button>}
        </div>
      </div>
      {tab === "members" && <MembersTab all={all} b={b} readOnly={readOnly} onChange={onChange} />}
      {tab === "documents" && <DocumentsTab b={b} />}
      {tab === "credits" && <CreditsTab b={b} readOnly={readOnly} onChange={onChange} onFarmer={setFarmer} onAnalysis={onOpenAnalysis} />}
    </div>
  )
}

function MembersTab({ all, b, readOnly = false, onChange }: { all: BindingRec[]; b: BindingRec; readOnly?: boolean; onChange: (fn: (b: BindingRec) => BindingRec) => void }) {
  const toast = useToast()
  const [selected, setSelected] = useState<string | null>(null)
  const [adding, setAdding] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const [conflict, setConflict] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [confirm, setConfirm] = useState<null | "remove" | "dissolve">(null)
  const [confirmAdd, setConfirmAdd] = useState(false)
  const [reverse, setReverse] = useState(false)
  const [withReplace, setWithReplace] = useState(false)
  const [comment, setComment] = useState("")
  const [replacing, setReplacing] = useState<string | null>(null)
  const [replaceWith, setReplaceWith] = useState<string | null>(null)
  /* Replacement candidates: same crop year and cluster as the farmer being replaced, not bound elsewhere. */
  const replaceOptions = replacing ? CANDIDATES.filter((c) => !b.members.some((x) => x.farmer === c.farmer) && clusterOf(c.farmer) === clusterOf(replacing) && !boundIn(all, c.farmer, b.id)) : []
  const replace = () => {
    const out = replacing, inn = CANDIDATES.find((c) => c.farmer === replaceWith)
    if (!out || !inn) return
    issueVersion(b.members.map((x) => (x.farmer === out ? { ...inn, signature: "Pending", inForce: false } : x)), "Member replaced", `${out} -> ${inn.farmer}`, `${out} replaced by ${inn.farmer}. A new version is issued to the members for signature.`)
    toast({ tone: "success", title: "Farmer replaced", body: `${out} replaced by ${inn.farmer}. A new version was issued for signature.` })
    setReplacing(null); setReplaceWith(null)
  }
  const removeMatch = (c: Credit) => c.farmer === selected || c.takenFrom === selected
  const dissolved = b.state === "Dissolved" || b.state === "Cancelled"
  const noActions = dissolved || readOnly
  /* While a version awaits signature (Pending / Amending), FT and FA users cannot add or remove farmers. */
  const awaiting = b.state === "Pending" || b.state === "Amending"
  /* Offer farmers from the binding's own cluster and tobacco type. */
  const bCluster = b.members[0] ? clusterOf(b.members[0].farmer) : "Cluster 0882"
  const matches = (f: string) => contractsOf(f).some((id) => CONTRACT_INFO[id]?.cluster === bCluster && CONTRACT_INFO[id]?.tobacco === b.tobaccoType)
  const pool = CANDIDATES.filter((c) => !b.members.some((x) => x.farmer === c.farmer) && matches(c.farmer))
  const available = pool.filter((c) => !boundIn(all, c.farmer, b.id)).slice(0, 4)
  const selectable = available.map((c) => c.farmer)

  /* Any membership change issues a new version that every member must sign. */
  const issueVersion = (members: Member[], event: string, farmer: string, detail: string) => {
    onChange((cur) => {
      const ver = `v${cur.versions.length + 1}`
      const log: LogEntry[] = [
        { when: now(), event, ver, farmer, by: "User 4471", detail },
        { when: now(), event: "Document issued", ver, farmer: "-", by: "System", detail: `2026-${cur.id}-${cur.versions.length + 1} generated and sent to ${members.length} members. Every member signs again.` },
      ]
      return {
        ...cur,
        state: cur.state === "Pending" ? "Pending" : "Amending",
        prev: { members: cur.members, document: cur.document, state: cur.state },
        document: `${ver} sent ${today()}`,
        members: members.map((x) => (x.inForce ? x : { ...x, appliedVersion: ver })),
        versions: [...cur.versions, { version: ver, document: `2026-${cur.id}-${cur.versions.length + 1}`, members: members.length, issued: today(), signedBy: [], outstanding: members.map((x) => x.farmer), status: "Awaiting signature" }],
        log: [...cur.log, ...log],
      }
    })
  }

  const addFarmer = async () => {
    const cs = CANDIDATES.filter((x) => adding.includes(x.farmer))
    if (!cs.length) return
    setChecking(true)
    const err = await checkBinding(all, [...b.members.map((x) => x.farmer), ...adding], b.id)
    setChecking(false)
    if (err) { setConflict(err); return }
    setConfirmAdd(false)
    issueVersion([...b.members, ...cs.map((c) => ({ ...c, signature: "Pending", inForce: false }))], "Member added", adding.join(", "), "Approved by User 3110. Previous version keeps governing the other members.")
    setAdding([])
    toast({ tone: "success", title: cs.length > 1 ? "Farmers added" : "Farmer added", body: `${adding.join(", ")} added. A new version was issued for signature.` })
  }
  const remove = () => {
    if (!selected) return
    if (b.members.length <= 2) { dissolve(); setSelected(null); return }
    issueVersion(b.members.filter((x) => x.farmer !== selected), "Member removed", selected, "Removed from the binding. All credits in the name of the leaving farmer are reversed (paid or paid for). A new version is issued to the remaining members.")
    if (reverse) { const f = selected; onChange((cur) => reverseRecoveries(cur, (c) => c.farmer === f || c.takenFrom === f)) }
    toast({ tone: "success", title: "Member removed", body: `${selected} removed from ${b.id}.` })
    setSelected(null)
    setConfirm(null)
  }
  const dissolve = () => {
    onChange((cur) => ({
      ...cur, state: "Dissolved", applied: "No", dissolvedOn: today(), members: cur.members.map((x) => ({ ...x, inForce: false })),
      log: [...cur.log, { when: now(), event: "Binding dissolved", ver: latestVersion(cur), farmer: "-", by: "User 4471", detail: `Dissolution approved. All credits in the history of the binding are reversed. Comment: ${comment.trim()}` }],
    }))
    if (reverse) onChange((cur) => reverseRecoveries(cur, () => true))
    toast({ tone: "success", title: "Binding dissolved", body: `${b.id} is now dissolved.${reverse ? " Recoveries reversed." : ""}` })
    setConfirm(null)
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Meta items={[
          { label: "Crop", value: b.crop },
          { label: "Tobacco type", value: b.tobaccoType },
          { label: "Members", value: b.members.length },
          { label: "Origin", value: b.origin },
          { label: "Timestamp", value: b.log[0]?.when ?? `${b.created} 09:00` },
          { label: "State", value: b.state },
          { label: "Latest version", value: latestVersion(b) },
          { label: "Applied", value: <span className={b.applied === "Yes" ? "text-[#c23b3b]" : ""}>{b.applied === "Yes" ? `Yes - ${b.appliedOn}` : "No"}</span> },
        ]} />
      </Card>
      {!readOnly && cancellable(b) && (() => {
        const v = b.versions[b.versions.length - 1]
        const { added, removed } = pendingMembers(b)
        const fresh = isNewRequest(b)
        return (
          <Card className="flex flex-wrap items-center gap-3 border-[#f2ddb3] bg-[#fdf6e7] p-4">
            <Clock size={18} className="shrink-0 text-[#9a6a12]" />
            <div className="min-w-0 flex-1 text-[13px] text-[#7a5410]">
              <p className="font-700 text-ink">{fresh ? "New binding awaiting signature" : `${latestVersion(b)} awaiting signature`}</p>
              <p>{fresh
                ? `Not applied yet${v?.outstanding.length ? ` - waiting on ${v.outstanding.length} signature${v.outstanding.length === 1 ? "" : "s"}` : ""}. You can still cancel the request.`
                : `${[added.length ? `Added: ${added.join(", ")}` : "", removed.length ? `Removed: ${removed.join(", ")}` : ""].filter(Boolean).join(" - ") || "Membership changed"}. Cancel to go back to ${previousVersion(b)}.`}</p>
              {awaiting && <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-muted"><Info size={14} className="shrink-0" /> Farmers cannot be added or removed while the binding is {b.state.toLowerCase()}.</p>}
            </div>
            <CancelBinding b={b} onChange={onChange} variant="button" />
          </Card>
        )
      })()}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2.5">{!noActions && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="outline" size="sm" disabled={awaiting || available.length === 0} title={awaiting ? `Not allowed while ${b.state}` : undefined} onClick={() => { setAdding([]); setAddOpen(true) }}><Plus size={15} /> Add a farmer</Button>
              <Button variant="danger" size="sm" disabled={awaiting} title={awaiting ? `Not allowed while ${b.state}` : undefined} onClick={() => { setReverse(false); setComment(""); setConfirm("dissolve") }} className="!border-[#c23b3b] !text-[#c23b3b] hover:!bg-[#fdecec]">Dissolve binding</Button>
            </div>
          )}</div>
        <TableCard minWidth={1250}>
          <Head cols={["Farmer", "Relationship", "Contracts", "Cluster", "Indebtedness", "% of Estimate Completed", "Deviator", "Filler", "Trigger", "Applied version", "Latest version", "Signature", ...(noActions ? [] : ["Actions"])]} />
          <tbody>
            {b.members.map((x) => {
              const latest = latestVersion(b)
              return (
                <tr key={x.farmer} className="border-t border-line transition hover:bg-canvas">
                  <td className={`${td} font-700 text-brand`}>{x.farmer}</td>
                  <td className={td}>{x.relationship}</td>
                  <td className={td}>{x.contracts}</td>
                  <td className={td}>{clusterOf(x.farmer)}</td>
                  <td className={`${td} tabular-nums ${x.indebtedness >= 40 ? "font-700 text-[#c23b3b]" : ""}`}>{x.indebtedness.toFixed(1)}%</td>
                  <td className={`${td} tabular-nums`}>{x.ofEstimate}%</td>
                  <td className={`${td} text-muted`}>{x.deviator ? "Yes" : "No"}</td>
                  <td className={`${td} text-muted`}>{x.filler ? "Yes" : "No"}</td>
                  <td className={`${td} ${x.trigger === "None" ? "text-muted" : "font-700 text-[#c23b3b]"}`}>{x.trigger}</td>
                  <td className={`${td} font-700 ${x.inForce ? "text-[#1a7a45]" : "text-[#c23b3b]"}`}>{x.appliedVersion}</td>
                  <td className={`${td} font-700 ${latest === x.appliedVersion ? "text-[#1a7a45]" : "text-[#9a6a12]"}`}>{latest}</td>
                  <td className={`${td} ${x.signature.startsWith("Signed") ? "text-[#1a7a45]" : x.signature === "Not required" ? "text-muted" : "font-700 text-[#c23b3b]"}`}>{x.signature}</td>
                  {!noActions && (
                    <td className={`${td} whitespace-nowrap`}>
                      <div className="inline-flex items-center gap-1">
                      <button type="button" disabled={awaiting} title={awaiting ? `Not allowed while ${b.state}` : `Replace ${x.farmer}`} aria-label={`Replace ${x.farmer}`} onClick={() => { setReplacing(x.farmer); setReplaceWith(null) }} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"><ArrowLeftRight size={15} /></button>
                      <button type="button" disabled={awaiting} title={awaiting ? `Not allowed while ${b.state}` : `Remove ${x.farmer}`} aria-label={`Remove ${x.farmer}`} onClick={() => { setSelected(x.farmer); setReverse(false); setWithReplace(false); setConfirm("remove") }} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[#fdecec] hover:text-[#c23b3b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </TableCard>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={`Add a farmer to ${b.id}`} width="max-w-3xl">
        <p className="mb-4 text-[13px] text-muted">Select the farmers to add. Linked household members are selected with the main farmer. A new version of the binding document is issued and every member signs again.</p>
        <TableCard minWidth={640}>
          <Head cols={["", "Farmer", "Relationship", "Contracts", "Indebtedness", "% of Estimate Completed"]} />
          <tbody>
            {available.map((c) => {
              const on = adding.includes(c.farmer)
              const toggle = () => setAdding((a) => toggleLinked(a, c.farmer, selectable))
              return (
                <tr key={c.farmer} onClick={toggle} className={`cursor-pointer border-t border-line transition ${on ? "bg-brand-soft/50" : "hover:bg-canvas"}`}>
                  <td className={`${td} w-10`} onClick={(e) => e.stopPropagation()}><Checkbox checked={on} onChange={toggle} /></td>
                  <td className={`${td} font-700 text-brand`}>{c.farmer}</td>
                  <td className={td}><LinkedRel c={c} /></td>
                  <td className={td}>{c.contracts}</td>
                  <td className={`${td} tabular-nums ${c.indebtedness >= 40 ? "font-700 text-[#c23b3b]" : ""}`}>{c.indebtedness.toFixed(1)}%</td>
                  <td className={`${td} tabular-nums`}>{c.ofEstimate}%</td>
                </tr>
              )
            })}
          </tbody>
        </TableCard>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button disabled={!adding.length} onClick={() => { setAddOpen(false); setConflict(null); setConfirmAdd(true) }}><Plus size={16} /> {adding.length > 1 ? `Add ${adding.length} farmers` : "Add farmer"}</Button>
        </div>
      </Modal>

      <Modal open={!!replacing} onClose={() => setReplacing(null)} title={`Replace ${replacing ?? ""}`} width="max-w-3xl">
        <p className="mb-4 text-[13px] text-muted">Farmers in crop year <b className="text-ink">{b.crop}</b> and <b className="text-ink">{replacing ? clusterOf(replacing) : ""}</b> who are not in another binding. A new version of the binding document is issued and every member signs again.</p>
        <TableCard minWidth={640}>
          <Head cols={["", "Farmer", "Relationship", "Cluster", "Indebtedness", "% of Estimate Completed"]} />
          <tbody>
            {replaceOptions.map((c) => {
              const on = replaceWith === c.farmer
              return (
                <tr key={c.farmer} onClick={() => setReplaceWith(c.farmer)} className={`cursor-pointer border-t border-line transition ${on ? "bg-brand-soft/50" : "hover:bg-canvas"}`}>
                  <td className={`${td} w-10`}><RadioDot on={on} /></td>
                  <td className={`${td} font-700 text-brand`}>{c.farmer}</td>
                  <td className={td}>{c.relationship}</td>
                  <td className={td}>{clusterOf(c.farmer)}</td>
                  <td className={`${td} tabular-nums ${c.indebtedness >= 40 ? "font-700 text-[#c23b3b]" : ""}`}>{c.indebtedness.toFixed(1)}%</td>
                  <td className={`${td} tabular-nums`}>{c.ofEstimate}%</td>
                </tr>
              )
            })}
            {replaceOptions.length === 0 && <tr className="border-t border-line"><td colSpan={6} className="px-3 py-8 text-center text-muted">No other farmers available in this crop year and cluster.</td></tr>}
          </tbody>
        </TableCard>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setReplacing(null)}>Cancel</Button>
          <Button disabled={!replaceWith} onClick={replace}><ArrowLeftRight size={16} /> Replace farmer</Button>
        </div>
      </Modal>

      <Modal open={confirmAdd} onClose={() => !checking && setConfirmAdd(false)} title={adding.length > 1 ? "Add farmers?" : "Add farmer?"} width="max-w-md">
        <p className="text-[14px] text-ink">Add <b>{adding.join(", ")}</b> to <b>{b.id}</b>? A new version of the document is issued and every member must sign again.</p>
        {conflict && <ConflictNote text={conflict} />}
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" disabled={checking} onClick={() => { setConfirmAdd(false); setAddOpen(true) }}>Cancel</Button>
          <Button disabled={checking || !!conflict} onClick={addFarmer}>{checking ? "Checking existing bindings..." : "Add and issue new version"}</Button>
        </div>
      </Modal>

      <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === "dissolve" ? "Dissolve binding?" : "Remove member?"} width="max-w-md">
        <p className="text-[14px] text-ink">
          {confirm === "dissolve"
            ? <>Dissolve <b>{b.id}</b>? Every member will be analysed on their own position from now on. This cannot be undone.</>
            : b.members.length <= 2
              ? <>Remove <b>{selected}</b>? A binding needs at least two members, so <b>{b.id}</b> will be dissolved. This cannot be undone.</>
              : <>Remove <b>{selected}</b> from <b>{b.id}</b>? A new version is issued to the remaining members for signature.</>}
        </p>
        {confirm === "dissolve" && <Explain>All credits in the history of the binding are reversed.</Explain>}
        {confirm === "remove" && (
          <div className="mt-4 rounded-xl border border-line bg-canvas px-4 py-3">
            <Checkbox checked={withReplace} onChange={() => setWithReplace((v) => !v)} label="Replace with another farmer" />
            <p className="mt-1 pl-7 text-[12px] text-muted">Choose a farmer from {b.crop} and {selected ? clusterOf(selected) : "this cluster"} to take their place.</p>
          </div>
        )}
        {!withReplace && <ReverseCheck checked={reverse} onChange={setReverse} amount={confirm === "remove" && b.members.length > 2 ? recoveredFor(b, removeMatch) : recoveredFor(b, () => true)} />}
        {!withReplace && (confirm === "dissolve" || b.members.length <= 2) && <Comment label="Dissolution comment" value={comment} onChange={setComment} required />}
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
          {confirm === "remove" && withReplace ? (
            <Button onClick={() => { const f = selected; setConfirm(null); setReplacing(f); setReplaceWith(null) }}><ArrowLeftRight size={16} /> Replace</Button>
          ) : (
            <Button variant="danger" disabled={(confirm === "dissolve" || b.members.length <= 2) && !comment.trim()} onClick={confirm === "dissolve" ? dissolve : remove} className="!border-[#c23b3b] !bg-[#c23b3b] !text-white hover:!bg-[#a83232]">
              {confirm === "dissolve" ? "Dissolve binding" : "Remove member"}
            </Button>
          )}
        </div>
      </Modal>
    </div>
  )
}

function eventTone(e: string) {
  if (e.startsWith("Signature")) return "text-[#1a7a45]"
  if (e === "Binding applied" || e === "Binding dissolved" || e === "Recovery reversed") return "text-[#c23b3b]"
  if (e.startsWith("Member")) return "text-[#9a6a12]"
  if (e === "Document issued") return "text-ink"
  return "text-brand"
}

function DocumentsTab({ b }: { b: BindingRec }) {
  const latest = b.versions[b.versions.length - 1]
  const outstanding = latest?.outstanding ?? []
  return (
    <div className="space-y-5">
      <Card className="p-5"><Meta items={[
        { label: "Versions issued", value: b.versions.length },
        { label: "Applied version", value: appliedVersion(b) },
        { label: "Latest version", value: latestVersion(b) },
        { label: "Signatures outstanding", value: outstanding.length, tone: outstanding.length ? "text-[#9a6a12]" : undefined },
        { label: "Awaiting", value: outstanding.join(", ") || "None", tone: outstanding.length ? "text-[#9a6a12]" : undefined },
        { label: "State", value: b.state },
      ]} /></Card>
      <div>
        <TableCard minWidth={1000}>
          <Head cols={["Version", "Document", "Members", "Issued", "Signatures", "Status", "Signed by", "Outstanding"]} />
          <tbody>
            {b.versions.map((v) => (
              <tr key={v.version} className="border-t border-line">
                <td className={`${td} font-700`}>{v.version}</td>
                <td className={td}>{v.document}</td>
                <td className={`${td} tabular-nums`}>{v.members}</td>
                <td className={td}>{v.issued}</td>
                <td className={`${td} ${v.outstanding.length ? "text-[#9a6a12]" : "text-[#1a7a45]"}`}>{v.signedBy.length} of {v.members}</td>
                <td className={td}><Badge tone={v.status === "Applied" ? "green" : v.status === "Refused" ? "red" : "amber"}>{v.status}</Badge></td>
                <td className={td}>{v.signedBy.join(", ") || "—"}</td>
                <td className={`${td} ${v.outstanding.length ? "font-700 text-[#c23b3b]" : "text-muted"}`}>{v.outstanding.join(", ") || "None"}</td>
              </tr>
            ))}
            {b.versions.length === 0 && <tr className="border-t border-line"><td colSpan={8} className="px-3 py-6 text-center text-muted">No document required — this binding was created automatically.</td></tr>}
          </tbody>
        </TableCard>
      </div>
    </div>
  )
}

/* Full event log of a binding, opened from History on the Documents tab. */
/* Placeholder farmer account, opened from Credits and recoveries. */
function FarmerAccount({ farmer, b, onBack }: { farmer: string; b: BindingRec; onBack: () => void }) {
  const m = b.members.find((x) => x.farmer === farmer)
  const credits = b.credits.filter((c) => c.farmer === farmer)
  return (
    <div className="space-y-5">
      <div><Button variant="outline" onClick={onBack}><ChevronLeft size={16} /> Back to {b.id}</Button></div>
      <Card className="p-5">
        <p className="text-[12px] font-700 uppercase tracking-[0.08em] text-brand">Farmer account</p>
        <h2 className="mt-1 text-[20px] font-800 text-ink">{farmer}</h2>
        <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ["Tax id", `***.${farmer.replace(/\D/g, "").slice(-3).padStart(3, "0")}.***-**`],
            ["Unit", "Unit 03"], ["Field technician", "User 5102"], ["Crop", "2026/2027"],
            ["Relationship", m?.relationship ?? "-"], ["Contracts", m?.contracts ?? "-"],
            ["Indebtedness", m ? money(m.indebtedness) : "-"], ["% of estimate completed", m ? `${m.ofEstimate}%` : "-"],
            ["Binding", b.id], ["Address", "Linha Santa Cruz, Santa Cruz do Sul / RS"], ["Phone", "(51) 9 8123-4567"], ["Bank account", "Banco 041 · Ag 0123 · CC ****-7"],
          ] as [string, string][]).map(([l, v]) => (
            <div key={l}><p className="text-[12.5px] font-500 text-muted">{l}</p><p className="mt-0.5 text-[14px] font-600 text-ink">{v}</p></div>
          ))}
        </div>
      </Card>
      <TableCard minWidth={700}>
        <thead className="bg-canvas text-[12px] font-600 uppercase tracking-[0.04em] text-muted"><tr>{["Date", "Event", "Credit", "Recovered", "Debt after"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {credits.map((c) => (
            <tr key={c.id} className="border-t border-line">
              <td className={td}>{c.date}</td><td className={td}>{c.event}</td>
              <td className={`${td} tabular-nums`}>{money(c.credit)}</td>
              <td className={`${td} tabular-nums`}>{c.recovered ? money(c.recovered) : "-"}</td>
              <td className={`${td} tabular-nums`}>{money(c.debtAfter)}</td>
            </tr>
          ))}
          {credits.length === 0 && <tr className="border-t border-line"><td colSpan={5} className="px-3 py-8 text-center text-muted">No credits for this farmer in the binding.</td></tr>}
        </tbody>
      </TableCard>
    </div>
  )
}

function DocumentHistory({ b, onBack }: { b: BindingRec; onBack: () => void }) {
  const toast = useToast()
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[15px] font-800 text-ink">Document history - {b.id}</p>
          <p className="mt-0.5 text-[13px] text-muted">{b.log.length} events across {b.versions.length} version{b.versions.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={onBack}><ChevronLeft size={16} /> Back</Button>
          <Button onClick={() => toast({ tone: "success", title: "Export started", body: `${b.log.length} log entries exported.` })}><ExternalLink size={16} /> Export</Button>
        </div>
      </div>
      <div>
        <TableCard minWidth={1100}>
          <Head cols={["Timestamp", "Event", "Ver", "Farmer", "By", "Detail"]} />
          <tbody>
            {b.log.map((l, i) => (
              <tr key={i} className="border-t border-line">
                <td className={`${td} whitespace-nowrap tabular-nums`}>{l.when}</td>
                <td className={`${td} whitespace-nowrap font-700 ${eventTone(l.event)}`}>{l.event}</td>
                <td className={td}>{l.ver}</td>
                <td className={`${td} whitespace-nowrap`}>{l.farmer}</td>
                <td className={`${td} whitespace-nowrap`}>{l.by}</td>
                <td className={`${td} text-ink-soft`}>{l.detail}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </div>
    </div>
  )
}

function CreditsTab({ b, readOnly = false, onChange, onFarmer, onAnalysis }: { b: BindingRec; readOnly?: boolean; onChange: (fn: (b: BindingRec) => BindingRec) => void; onFarmer: (f: string) => void; onAnalysis?: () => void }) {
  const toast = useToast()
  const [selected, setSelected] = useState<string | null>(b.credits[0]?.id ?? null)
  const sel = b.credits.find((c) => c.id === selected)
  const recovered = b.credits.reduce((s, c) => s + c.recovered, 0)
  const ownSettled = b.credits.reduce((s, c) => s + c.ownDebt, 0)
  const reversed = b.credits.reduce((s, c) => s + (c.reversed ?? 0), 0)
  const outstanding = b.credits.length ? b.credits[b.credits.length - 1].debtAfter : 0

  const [askReverse, setAskReverse] = useState(false)
  const [justification, setJustification] = useState("")
  const reverse = () => {
    if (!sel || sel.recovered <= 0) return
    const amount = sel.recovered
    onChange((cur) => {
      let carry = 0
      const credits = cur.credits.map((c) => {
        if (c.id === sel.id) { carry = amount; return { ...c, recovered: 0, reversed: amount, debtAfter: c.debtAfter + carry } }
        return carry ? { ...c, debtAfter: c.debtAfter + carry } : c
      })
      return {
        ...cur, credits,
        log: [...cur.log, { when: now(), event: "Recovery reversed", ver: latestVersion(cur), farmer: sel.takenFrom, by: "User 4471", detail: `${money(amount)} returned to ${sel.takenFrom} from ${sel.analysis}. Credit released to ${sel.farmer}. Justification: ${justification.trim()}` }],
      }
    })
    toast({ tone: "success", title: "Recovery reversed", body: `${money(amount)} returned to ${sel.takenFrom}.` })
  }

  return (
    <div className="space-y-5">
      <Card className="p-5"><Meta items={[
        { label: "Applied since", value: b.applied === "Yes" ? b.appliedOn : "—" },
        { label: "Credits analysed", value: b.credits.length },
        { label: "Recovered for the binding", value: money(recovered), tone: recovered ? "text-[#c23b3b]" : undefined },
        { label: "Own debt settled", value: money(ownSettled) },
        { label: "Reversed", value: money(reversed) },
        { label: "Debt outstanding", value: money(outstanding), tone: outstanding ? "text-[#c23b3b]" : "text-[#1a7a45]" },
      ]} /></Card>
      <div>
        <TableCard minWidth={1150}>
          <Head cols={["", "Date", "Event", "Farmer", "Credit", "Own debt settled", "Recovered for the binding", "Debt taken from", "Binding debt after", "Analysis"]} />
          <tbody>
            {b.credits.map((c) => {
              const on = c.id === selected
              return (
                <tr key={c.id} onClick={() => setSelected(c.id)} className={`cursor-pointer border-t border-line transition ${on ? "bg-brand-soft/50" : "hover:bg-canvas"}`}>
                  <td className={`${td} w-10`}><RadioDot on={on} /></td>
                  <td className={td}>{c.date}</td>
                  <td className={td}>{c.event}</td>
                  <td className={`${td} font-700 text-brand`}>{c.farmer}</td>
                  <td className={`${td} tabular-nums`}>{money(c.credit)}</td>
                  <td className={`${td} tabular-nums`}>{c.ownDebt ? money(c.ownDebt) : "-"}</td>
                  <td className={`${td} tabular-nums ${c.recovered ? "font-700 text-[#c23b3b]" : ""}`}>{c.recovered ? money(c.recovered) : c.reversed ? <span className="text-muted">Reversed</span> : "-"}</td>
                  <td className={`${td} ${c.takenFrom !== "-" && !c.reversed ? "text-[#c23b3b]" : ""}`}>{c.takenFrom}</td>
                  <td className={`${td} tabular-nums ${c.debtAfter ? "text-[#c23b3b]" : "text-[#1a7a45]"}`}>{money(c.debtAfter)}</td>
                  <td className={td}>{c.analysis}</td>
                </tr>
              )
            })}
            {b.credits.length === 0 && <tr className="border-t border-line"><td colSpan={10} className="px-3 py-8 text-center text-muted">No credits analysed while this binding was applied.</td></tr>}
          </tbody>
        </TableCard>

        {sel && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-canvas/60 p-4">
            <div className="min-w-0 max-w-[640px] text-[13px]">
              <p><span className="font-700 text-ink">Selected</span> <span className="font-600 text-ink">{sel.analysis}, {sel.date}</span></p>
              <p className="mt-0.5 text-ink-soft">
                {sel.recovered > 0
                  ? `${money(sel.recovered)} of ${sel.takenFrom} debt was transferred to ${sel.farmer} and settled there. Reversing it returns that debt to ${sel.takenFrom} and releases the credit.`
                  : sel.reversed ? "The recovery on this line has already been reversed." : "Nothing was recovered for the binding on this line, so there is nothing to reverse."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="outline" onClick={() => onFarmer(sel.farmer)}><ExternalLink size={15} /> Open farmer account</Button>
              <Button variant="outline" onClick={() => onAnalysis?.()}><ExternalLink size={15} /> Open analysis</Button>
              {!readOnly && <Button disabled={sel.recovered <= 0} onClick={() => { setJustification(""); setAskReverse(true) }}><RotateCcw size={15} /> Reverse recovery</Button>}
            </div>
          </div>
        )}
      </div>
      {sel && (
        <Modal open={askReverse} onClose={() => setAskReverse(false)} title="Reverse recovery?" width="max-w-md">
          <p className="text-[14px] text-ink"><b>{money(sel.recovered)}</b> is returned to <b>{sel.takenFrom}</b> and the credit is released to <b>{sel.farmer}</b>. The binding debt rises by the same amount.</p>
          <Comment label="Justification" value={justification} onChange={setJustification} required />
          <div className="mt-5 flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setAskReverse(false)}>Cancel</Button>
            <Button variant="danger" disabled={!justification.trim()} onClick={() => { setAskReverse(false); reverse() }} className="!border-[#c23b3b] !bg-[#c23b3b] !text-white hover:!bg-[#a83232]">Reverse recovery</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* New binding                                                          */
/* ------------------------------------------------------------------ */

const CONTRACTS: Record<string, string[]> = {
  "Farmer 00041288": ["CTR-118402", "CTR-118403"],
  "Farmer 00041290": ["CTR-118405"],
  "Farmer 00047733": ["CTR-118411", "CTR-118412"],
  "Farmer 00047901": ["CTR-118420"],
  "Farmer 00048115": ["CTR-118431"], "Farmer 00050206": ["CTR-118432"],
  "Farmer 00050201": ["CTR-118402"], "Farmer 00050202": ["CTR-118403"], "Farmer 00050203": ["CTR-118405"],
  "Farmer 00050204": ["CTR-118411"], "Farmer 00050205": ["CTR-118412"],
  "Farmer 00050210": ["CTR-120101"], "Farmer 00050211": ["CTR-120102"], "Farmer 00050212": ["CTR-120103"], "Farmer 00050207": ["CTR-120104"], "Farmer 00050213": ["CTR-120105"],
  "Farmer 00050220": ["CTR-120201"], "Farmer 00050221": ["CTR-120202"], "Farmer 00050222": ["CTR-120203"],
  "Farmer 00050223": ["CTR-120204"], "Farmer 00050224": ["CTR-120205"], "Farmer 00050225": ["CTR-120206"],
  "Farmer 00050230": ["CTR-120301"], "Farmer 00050231": ["CTR-120302"], "Farmer 00050232": ["CTR-120303"],
  "Farmer 00050214": ["CTR-120106"], "Farmer 00050215": ["CTR-120107"], "Farmer 00050226": ["CTR-120207"], "Farmer 00050233": ["CTR-120304"], "Farmer 00050234": ["CTR-120305"], "Farmer 00050235": ["CTR-120306"],
}
const contractsOf = (f: string) => CONTRACTS[f] ?? [`CTR-${f.slice(-6)}`]
/* Display name for a contract, e.g. "Virginia Supply 402". */
const contractName = (id: string) => `${CONTRACT_INFO[id]?.tobacco ?? "Tobacco"} Supply ${id.slice(-3)}`
/* Cluster and tobacco type come from the contract itself. */
const CONTRACT_INFO: Record<string, { cluster: string; tobacco: string }> = {
  "CTR-118402": { cluster: "Cluster 0882", tobacco: "Virginia" }, "CTR-118403": { cluster: "Cluster 0882", tobacco: "Burley" },
  "CTR-118405": { cluster: "Cluster 0882", tobacco: "Virginia" },
  "CTR-118411": { cluster: "Cluster 0715", tobacco: "Virginia" }, "CTR-118412": { cluster: "Cluster 0715", tobacco: "Virginia" },
  "CTR-118420": { cluster: "Cluster 0931", tobacco: "Burley" },
  "CTR-118431": { cluster: "Cluster 0882", tobacco: "Burley" }, "CTR-118432": { cluster: "Cluster 0882", tobacco: "Burley" },
  "CTR-120101": { cluster: "Cluster 0882", tobacco: "Virginia" }, "CTR-120102": { cluster: "Cluster 0882", tobacco: "Virginia" },
  "CTR-120103": { cluster: "Cluster 0882", tobacco: "Burley" }, "CTR-120104": { cluster: "Cluster 0882", tobacco: "Burley" }, "CTR-120105": { cluster: "Cluster 0882", tobacco: "Burley" },
  "CTR-120201": { cluster: "Cluster 0715", tobacco: "Virginia" }, "CTR-120202": { cluster: "Cluster 0715", tobacco: "Virginia" }, "CTR-120203": { cluster: "Cluster 0715", tobacco: "Virginia" },
  "CTR-120204": { cluster: "Cluster 0715", tobacco: "Burley" }, "CTR-120205": { cluster: "Cluster 0715", tobacco: "Burley" }, "CTR-120206": { cluster: "Cluster 0715", tobacco: "Burley" },
  "CTR-120301": { cluster: "Cluster 0931", tobacco: "Burley" }, "CTR-120302": { cluster: "Cluster 0931", tobacco: "Burley" }, "CTR-120303": { cluster: "Cluster 0931", tobacco: "Burley" },
  "CTR-120106": { cluster: "Cluster 0882", tobacco: "Virginia" }, "CTR-120107": { cluster: "Cluster 0882", tobacco: "Burley" }, "CTR-120207": { cluster: "Cluster 0715", tobacco: "Virginia" }, "CTR-120304": { cluster: "Cluster 0931", tobacco: "Virginia" }, "CTR-120305": { cluster: "Cluster 0931", tobacco: "Virginia" }, "CTR-120306": { cluster: "Cluster 0931", tobacco: "Virginia" },
}
const CURRENT_CROP = String(new Date().getFullYear())
const ALL_CLUSTERS = [...new Set(Object.values(CONTRACT_INFO).map((c) => c.cluster))].sort()
/* Validation example on the last cluster (Cluster 0931): contracts already bound cannot be selected again. */
const BOUND_CONTRACTS: Record<string, string> = {
  "CTR-118420": "BND-2026-0023",
  "CTR-120301": "BND-2026-0023",
  "CTR-120304": "BND-2026-0027",
}
const clusterOf = (f: string) => (CONTRACTS[f] ? infoOf(CONTRACTS[f], "cluster") : "Cluster 0882")
const infoOf = (ids: string[], k: "cluster" | "tobacco") => [...new Set(ids.map((id) => CONTRACT_INFO[id]?.[k] ?? "-"))].join(", ")

function NewBinding({ nextId, bindings, onBack, onCreate }: { nextId: string; bindings: BindingRec[]; onBack: () => void; onCreate: (b: BindingRec) => void }) {
  const toast = useToast()
  const crop = CURRENT_CROP
  const [clusters, setClusters] = useState<string[]>([])
  const cluster = clusters.join(", ")
  const [scopeContracts, setScopeContracts] = useState<string[]>([])
  const [tobacco, setTobacco] = useState("")
  const [reason, setReason] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [contracts, setContracts] = useState<Record<string, string[]>>({})
  const [extra, setExtra] = useState<Member[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [adding, setAdding] = useState<string[]>([])
  const pool = extra
  /* Scope cascade: crop year -> cluster -> contract -> tobacco type. Cluster and tobacco type are required before farmers can be added. */
  const allClusterContracts = Object.keys(CONTRACT_INFO).filter((id) => clusters.includes(CONTRACT_INFO[id].cluster))
  const boundContracts = allClusterContracts.filter((id) => BOUND_CONTRACTS[id])
  const clusterContracts = allClusterContracts.filter((id) => !boundContracts.includes(id))
  const contractOptions = allClusterContracts.map((id) => ({ value: id, label: id, disabled: boundContracts.includes(id), hint: BOUND_CONTRACTS[id] && `Bound in ${BOUND_CONTRACTS[id]}` }))
  const contractScope = scopeContracts.length ? scopeContracts : clusterContracts
  const tobaccoOptions = [...new Set(contractScope.map((id) => CONTRACT_INFO[id].tobacco))]
  const inScope = (id: string) => contractScope.includes(id) && (scopeContracts.length > 0 || !tobacco || CONTRACT_INFO[id]?.tobacco === tobacco)
  const scopeReady = !!crop && clusters.length > 0 && (!!tobacco || scopeContracts.length >= 2)
  const resetFarmers = () => { setExtra([]); setPicked([]); setContracts({}) }
  const pickCluster = (v: string[]) => {
    const avail = Object.keys(CONTRACT_INFO).filter((id) => v.includes(CONTRACT_INFO[id].cluster) && !BOUND_CONTRACTS[id])
    const ts = [...new Set(avail.map((id) => CONTRACT_INFO[id].tobacco))]
    setClusters(v); setScopeContracts([]); setTobacco(ts[0] ?? ""); resetFarmers()
  }
  const pickContracts = (v: string[]) => {
    const next = v.length ? v : clusterContracts
    const ts = [...new Set(next.map((id) => CONTRACT_INFO[id].tobacco))]
    setScopeContracts(v); setTobacco((cur) => (ts.includes(cur) ? cur : (ts[0] ?? ""))); resetFarmers()
  }
  const pickTobacco = (v: string) => { setTobacco(v); resetFarmers() }
  const farmerContracts = (f: string) => contractsOf(f).filter(inScope)
  const inScopePool = scopeReady ? CANDIDATES.filter((c) => !pool.some((p) => p.farmer === c.farmer) && farmerContracts(c.farmer).length > 0) : []
  /* Farmers already in another live binding cannot be bound again. */
  const available = inScopePool.filter((c) => !boundIn(bindings, c.farmer))
  const selectable = available.map((c) => c.farmer)
  const [created, setCreated] = useState(false)
  const [checking, setChecking] = useState(false)
  const [conflict, setConflict] = useState<string | null>(null)
  const spouse = (x: Member) => x.relationship.startsWith("Spouse")
  const headPicked = picked.some((f) => pool.find((x) => x.farmer === f)?.relationship.startsWith("Head"))
  /* The spouse is bound automatically with the head of household and cannot be unticked. */
  const locked = (x: Member) => spouse(x) && headPicked
  const isOn = (x: Member) => picked.includes(x.farmer) || locked(x)
  const chosen = (f: string) => contracts[f] ?? farmerContracts(f)
  const selectedMembers = pool.filter(isOn)
  const contractCount = selectedMembers.reduce((n, x) => n + chosen(x.farmer).length, 0)
  const valid = scopeReady && contractCount >= 2 && reason.trim().length > 0
  const [askCreate, setAskCreate] = useState(false)

  const create = (draft: boolean) => {
    const members = selectedMembers.map((x) => ({ ...x, signature: locked(x) ? "Not required" : "Pending", inForce: false }))
    const worst = members.reduce((a, x) => (x.indebtedness > a.indebtedness ? x : a), members[0])
    const b: BindingRec = {
      id: nextId, crop: `${crop}/${Number(crop) + 1}`, tobaccoType: tobacco, origin: "Requested - Finance",
      document: draft ? "Not issued" : `v1 sent ${today()}`,
      state: draft ? "Draft" : "Pending", applied: "No",
      trigger: worst.indebtedness >= 40 ? `Indebtedness ${worst.indebtedness.toFixed(1)}%` : "None",
      appliedOn: "-", created: today(), members,
      versions: draft ? [] : [{ version: "v1", document: `2026-${nextId}-1`, members: members.length, issued: today(), signedBy: [], outstanding: members.filter((x) => !locked(x)).map((x) => x.farmer), status: "Awaiting signature" }],
      log: [{ when: now(), event: "Binding requested", ver: "v1", farmer: "-", by: "Finance analyst - User 4471", detail: `${members.length} members, ${contractCount} contracts, tobacco type ${tobacco}. ${draft ? "Saved as draft." : "Document issued for signature."} Reason: ${reason}` }],
      credits: [],
    }
    onCreate(b)
    if (draft) toast({ tone: "success", title: "Draft saved", body: `${nextId} saved as draft.` })
  }

  const addFarmer = () => {
    const cs = CANDIDATES.filter((x) => adding.includes(x.farmer))
    if (!cs.length) return
    setExtra((e) => [...e, ...cs]); setPicked((p) => [...p, ...cs.map((c) => c.farmer)]); setAdding([]); setAddOpen(false)
  }


  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" onClick={onBack}><X size={16} /> Cancel</Button>
        <Button disabled={pool.length === 0} onClick={() => { setConflict(null); setAskCreate(true) }}><Check size={16} /> Save</Button>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-[150px_170px_220px_150px_minmax(0,1fr)_150px_120px]">
          <Field label="Crop year"><Input disabled value={crop} /></Field>
          <Field label="Cluster *"><MultiSelect values={clusters} onChange={pickCluster} options={opts(ALL_CLUSTERS)} allLabel={`All clusters (${ALL_CLUSTERS.length})`} placeholder="" /></Field>
          <Field label="Contract"><MultiSelect disabled={!clusters.length} values={scopeContracts} onChange={pickContracts} options={contractOptions} allLabel={`All available (${clusterContracts.length})`} placeholder={cluster ? `All available (${clusterContracts.length})` : ""} /></Field>
          <Field label="Tobacco type *"><Select disabled={!clusters.length} value={tobacco} onChange={pickTobacco} options={opts(tobaccoOptions)} placeholder="" /></Field>
          <Field label="Reason *"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <Field label="Created by"><Input disabled value="Finance analyst" /></Field>
          <Field label="User"><Input disabled value="User 4471" /></Field>
        </div>
        {boundContracts.length > 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#f2ddb3] bg-[#fdf6e7] px-4 py-3 text-[13px] text-[#7a5410]">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#9a6a12]" />
            <p><b className="text-ink">Binding already exists for {boundContracts.length === 1 ? "this contract" : "these contracts"}:</b> {boundContracts.map((id) => `${id} (${BOUND_CONTRACTS[id]})`).join(", ")}. {boundContracts.length === 1 ? "It is" : "They are"} disabled and excluded from this binding.</p>
          </div>
        )}
      </Card>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2.5">{<Button variant="outline" size="sm" disabled={available.length === 0} onClick={() => { setAdding([]); setAddOpen(true) }}><Plus size={15} /> Add farmer</Button>}</div>
        {pool.length === 0 ? (
          <Card className="grid place-items-center px-6 py-14 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand"><Plus size={18} /></span>
            <p className="mt-3 text-[14px] font-700 text-ink">{scopeReady ? "No farmers added yet" : "Complete the scope first"}</p>
            <p className="mt-1 text-[13px] text-muted">{scopeReady
              ? available.length ? `Add the farmers to bind. Only farmers with ${tobacco} contracts in ${cluster} are offered.` : `No farmer has a ${tobacco} contract in ${cluster} for the selected contracts.`
              : "Select the cluster and tobacco type. Farmers are offered from that cluster and tobacco type."}</p>
          </Card>
        ) : (<>
        <TableCard minWidth={1300}>
          <Head cols={["", "Farmer", "Relationship", "Contract IDs", "Cluster", "Tobacco type", "Indebtedness", "% of Estimate Completed", "Deviator", "Signature needed"]} />
          <tbody>
            {pool.map((x) => {
              const on = isOn(x)
              const lock = locked(x)
              const all = farmerContracts(x.farmer)
              const sel = chosen(x.farmer)
              const toggle = () => !lock && setPicked((p) => (p.includes(x.farmer) ? p.filter((f) => f !== x.farmer) : [...p, x.farmer]))
              return (
                <tr key={x.farmer} onClick={toggle} className={`border-t border-line transition ${lock ? "" : "cursor-pointer hover:bg-canvas"} ${on ? "text-ink" : "text-muted"}`}>
                  <td className={`${td} w-10`} onClick={(e) => e.stopPropagation()}>
                    {lock ? <span className="grid h-[18px] w-[18px] place-items-center text-muted" title="Bound automatically"><Lock size={15} /></span> : <Checkbox checked={on} onChange={toggle} />}
                  </td>
                  <td className={`${td} ${on ? "font-600 text-ink" : ""}`}>{x.farmer}</td>
                  <td className={td}>{x.relationship}</td>
                  <td className={`${td} w-[220px]`} onClick={(e) => e.stopPropagation()}>
                    {all.length > 1 && on && !lock ? (
                      <MultiSelect values={sel} onChange={(v) => setContracts((c) => ({ ...c, [x.farmer]: v.length ? v : all }))} options={opts(all)} allLabel={`All contracts (${all.length})`} />
                    ) : (
                      <span className="text-ink-soft">All contracts ({all.length})</span>
                    )}
                  </td>
                  <td className={td}>{infoOf(sel, "cluster")}</td>
                  <td className={td}>{infoOf(sel, "tobacco")}</td>
                  <td className={`${td} tabular-nums ${x.indebtedness >= 40 && on ? "font-600 text-[#c23b3b]" : ""}`}>{x.indebtedness.toFixed(1)}%</td>
                  <td className={`${td} tabular-nums`}>{x.ofEstimate}%</td>
                  <td className={td}>{x.deviator ? "Yes" : "No"}</td>
                  <td className={`${td} ${lock ? "text-muted" : ""}`}>{lock ? "Not required - bound automatically" : "Yes"}</td>
                </tr>
              )
            })}
          </tbody>
        </TableCard>
        <div className="mt-4">
          <p className={`text-[13px] ${contractCount >= 2 ? "text-muted" : "font-600 text-[#c23b3b]"}`}>
            {selectedMembers.length} farmers, {contractCount} contracts selected - minimum to create is 2 contracts
          </p>
        </div>
        </>)}
      </div>


      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add farmers to the binding" width="max-w-3xl">
        <TableCard minWidth={640}>
          <thead className="bg-brand-soft text-left text-[11px] font-700 uppercase tracking-wide text-brand">
            <tr>
              <th className={`${th} w-10`}><Checkbox checked={available.length > 0 && adding.length === available.length} onChange={() => setAdding(adding.length === available.length ? [] : available.map((c) => c.farmer))} /></th>
              {["Farmer", "Relationship", "Contracts", "Indebtedness", "% of Estimate Completed"].map((h) => <th key={h} className={th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {available.map((c) => {
              const on = adding.includes(c.farmer)
              const toggle = () => setAdding((a) => toggleLinked(a, c.farmer, selectable))
              return (
                <tr key={c.farmer} onClick={toggle} className={`cursor-pointer border-t border-line transition ${on ? "bg-brand-soft/50" : "hover:bg-canvas"}`}>
                  <td className={`${td} w-10`} onClick={(e) => e.stopPropagation()}><Checkbox checked={on} onChange={toggle} /></td>
                  <td className={`${td} font-700 text-brand`}>{c.farmer}</td>
                  <td className={td}><LinkedRel c={c} /></td>
                  <td className={td}>{farmerContracts(c.farmer).map(contractName).join(", ")}</td>
                  <td className={`${td} tabular-nums ${c.indebtedness >= 40 ? "font-700 text-[#c23b3b]" : ""}`}>{c.indebtedness.toFixed(1)}%</td>
                  <td className={`${td} tabular-nums`}>{c.ofEstimate}%</td>
                </tr>
              )
            })}
          </tbody>
        </TableCard>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button disabled={!adding.length} onClick={addFarmer}><Plus size={16} /> {adding.length > 1 ? `Add ${adding.length} farmers` : "Add farmer"}</Button>
        </div>
      </Modal>
      <Modal open={askCreate} onClose={() => !checking && setAskCreate(false)} title="Save binding?" width="max-w-md">
        <p className="text-[14px] text-ink">
          {!valid && <span className="mb-2 block font-600 text-[#c23b3b]">{!scopeReady ? "Complete the scope: cluster and tobacco type." : contractCount < 2 ? "At least 2 contracts are needed." : "Add a reason in the scope."} </span>}<b>{nextId}</b> is created with {selectedMembers.length} farmers and {contractCount} contracts. The authorisation document is issued and sent for signature.
        </p>
        {conflict && <ConflictNote text={conflict} />}
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" disabled={checking} onClick={() => setAskCreate(false)}>Cancel</Button>
          <Button disabled={!valid || checking || !!conflict} onClick={async () => {
            setChecking(true)
            const err = await checkBinding(bindings, selectedMembers.map((x) => x.farmer))
            setChecking(false)
            if (err) { setConflict(err); return }
            setAskCreate(false); setCreated(true)
          }}>{checking ? "Checking existing bindings..." : "Save"}</Button>
        </div>
      </Modal>
      <Modal open={created} onClose={() => { setCreated(false); create(false) }} title="Binding created" width="max-w-lg">
        <p className="text-[14px] leading-relaxed text-ink">
          Binding <b>{nextId}</b> has been created successfully.<br />
          The authorization document has been issued to <b>{selectedMembers.filter((x) => !locked(x)).map((x) => x.farmer).join(", ")}</b> and sent for signature.
        </p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => { setCreated(false); create(false) }}>OK</Button>
        </div>
      </Modal>
    </div>
  )
}
