import { useEffect, useState, type ReactNode } from "react"
import { Badge, Button, Card, Checkbox, DatePicker, Field, Input, Modal, Select, useToast } from "../components/ui"
import { Calculator, Check, ChevronLeft, Copy, FileText, Pencil, Plus, Send, X } from "../components/icons"

export type ContractualFineCrumb = { label: string; onClick?: () => void }

type FineTab = "fines" | "refunds" | "dashboard" | "parameters"
type DashLevel = "Crop" | "Region" | "Territory manager" | "Field technician" | "Farmer"

type FineStatus = "Applied by Policy" | "Awaiting decision" | "Applied by FT" | "No contractual fine" | "Applied by Finance"

type FineRow = {
  id: string
  farmer: string
  contract: string
  crop: string
  region: string
  gt: string
  ft: string
  tobaccoType: string
  referenceClass: string
  classPrice: number
  finePercent: number
  policyMinPct: number
  policyMaxPct: number
  contracted: number
  delivered: number
  returned: number
  bought: number
  disagreement: number
  missing: number
  fine: number
  charged: number
  notCharged: number
  refunded: number
  status: FineStatus
}

const INITIAL_FINES: FineRow[] = [
  {
    id: "f1",
    farmer: "Farmer 00041",
    contract: "CT-104120",
    crop: "Sf 2026",
    region: "South",
    gt: "GT 04",
    ft: "User 5102",
    tobaccoType: "Virginia",
    referenceClass: "TO2",
    classPrice: 14.8,
    finePercent: 10,
    policyMinPct: 80,
    policyMaxPct: 95,
    contracted: 10000,
    delivered: 8000,
    returned: 600,
    bought: 7400,
    disagreement: 0,
    missing: 2000,
    fine: 2960.0,
    charged: 1200.0,
    notCharged: 1760.0,
    refunded: 0.0,
    status: "Applied by Policy",
  },
  {
    id: "f2",
    farmer: "Farmer 00052",
    contract: "CT-104127",
    crop: "Sf 2026",
    region: "South",
    gt: "GT 04",
    ft: "User 5102",
    tobaccoType: "Virginia",
    referenceClass: "TO2",
    classPrice: 14.8,
    finePercent: 10,
    policyMinPct: 80,
    policyMaxPct: 95,
    contracted: 8000,
    delivered: 6720,
    returned: 0,
    bought: 6720,
    disagreement: 0,
    missing: 1280,
    fine: 1894.4,
    charged: 0.0,
    notCharged: 0.0,
    refunded: 0.0,
    status: "Awaiting decision",
  },
  {
    id: "f3",
    farmer: "Farmer 00085",
    contract: "CT-104144",
    crop: "Sf 2026",
    region: "South",
    gt: "GT 04",
    ft: "User 5118",
    tobaccoType: "Burley",
    referenceClass: "TO2",
    classPrice: 14.8,
    finePercent: 10,
    policyMinPct: 80,
    policyMaxPct: 95,
    contracted: 9500,
    delivered: 8170,
    returned: 0,
    bought: 8170,
    disagreement: 0,
    missing: 1330,
    fine: 1968.4,
    charged: 1968.4,
    notCharged: 0.0,
    refunded: 0.0,
    status: "Applied by FT",
  },
  {
    id: "f4",
    farmer: "Farmer 00063",
    contract: "CT-104132",
    crop: "Sf 2026",
    region: "South",
    gt: "GT 04",
    ft: "User 5118",
    tobaccoType: "Virginia",
    referenceClass: "TO2",
    classPrice: 14.8,
    finePercent: 10,
    policyMinPct: 80,
    policyMaxPct: 95,
    contracted: 12000,
    delivered: 12000,
    returned: 12000,
    bought: 0,
    disagreement: 0,
    missing: 0,
    fine: 0.0,
    charged: 0.0,
    notCharged: 0.0,
    refunded: 0.0,
    status: "No contractual fine",
  },
  {
    id: "f5",
    farmer: "Farmer 00074",
    contract: "CT-104138",
    crop: "Sf 2026",
    region: "South",
    gt: "GT 04",
    ft: "User 5140",
    tobaccoType: "Virginia",
    referenceClass: "C2",
    classPrice: 11.6,
    finePercent: 10,
    policyMinPct: 80,
    policyMaxPct: 95,
    contracted: 6000,
    delivered: 3900,
    returned: 0,
    bought: 3900,
    disagreement: 900,
    missing: 1200,
    fine: 1392.0,
    charged: 0.0,
    notCharged: 1392.0,
    refunded: 0.0,
    status: "Applied by Policy",
  },
  {
    id: "f6",
    farmer: "Farmer 00096",
    contract: "CT-104153",
    crop: "Sf 2026",
    region: "South",
    gt: "GT 04",
    ft: "User 5140",
    tobaccoType: "Burley",
    referenceClass: "C2",
    classPrice: 11.6,
    finePercent: 10,
    policyMinPct: 80,
    policyMaxPct: 95,
    contracted: 7200,
    delivered: 5976,
    returned: 0,
    bought: 5976,
    disagreement: 0,
    missing: 1224,
    fine: 1419.84,
    charged: 500.0,
    notCharged: 919.84,
    refunded: 0.0,
    status: "Applied by Finance",
  },
]

type RefundLogEntry = {
  date: string
  event: string
  by: string
  amount: string
  note: string
}

type RefundStatus = "Sent" | "Approved" | "Refunded" | "Rejected"

type RefundRequest = {
  id: string
  crop: string
  raisedBy: string
  raisedRole: "Field technician" | "Finance"
  gt: string
  farmer: string
  fine: number
  charged: number
  alreadyRefunded: number
  requested: number
  justification: string
  approver: string
  status: RefundStatus
  log: RefundLogEntry[]
}

const INITIAL_REFUNDS: RefundRequest[] = [
  {
    id: "RF-2026-0088",
    crop: "Sf 2026",
    raisedBy: "User 5102, FT",
    raisedRole: "Field technician",
    gt: "04",
    farmer: "Farmer 00041",
    fine: 2960.0,
    charged: 1200.0,
    alreadyRefunded: 0.0,
    requested: 2960.0,
    justification: "Estimate met later against Sf 2027",
    approver: "GT 04",
    status: "Sent",
    log: [
      { date: "05/10/2026", event: "Request raised from the candidate list", by: "User 5102, FT", amount: "2,960.00", note: "Estimate met later against Sf 2027" },
      { date: "05/10/2026", event: "Sent to the territorial manager", by: "System", amount: "-", note: "Awaiting the GT" },
    ],
  },
  {
    id: "RF-2026-0089",
    crop: "Sf 2026",
    raisedBy: "User 5140, FT",
    raisedRole: "Field technician",
    gt: "04",
    farmer: "Farmer 00096",
    fine: 1419.84,
    charged: 500.0,
    alreadyRefunded: 0.0,
    requested: 500.0,
    justification: "Partial, disagreement settled after closing",
    approver: "GT 04",
    status: "Sent",
    log: [
      { date: "06/10/2026", event: "Request raised from the candidate list", by: "User 5140, FT", amount: "500.00", note: "Partial, disagreement settled after closing" },
      { date: "06/10/2026", event: "Sent to the territorial manager", by: "System", amount: "-", note: "Awaiting the GT" },
    ],
  },
  {
    id: "RF-2026-0084",
    crop: "Sf 2026",
    raisedBy: "Finance",
    raisedRole: "Finance",
    gt: "07",
    farmer: "Farmer 00218",
    fine: 5120.0,
    charged: 0.0,
    alreadyRefunded: 0.0,
    requested: 5120.0,
    justification: "Applied on a contract that was cancelled",
    approver: "GT 07",
    status: "Approved",
    log: [
      { date: "02/10/2026", event: "Request raised by Finance", by: "Finance", amount: "5,120.00", note: "Applied on a contract that was cancelled" },
      { date: "03/10/2026", event: "Approved by territorial manager", by: "GT 07", amount: "5,120.00", note: "Approved for cancellation" },
    ],
  },
  {
    id: "RF-2026-0071",
    crop: "Sf 2026",
    raisedBy: "User 5118, FT",
    raisedRole: "Field technician",
    gt: "04",
    farmer: "Farmer 00202",
    fine: 2368.0,
    charged: 2368.0,
    alreadyRefunded: 2368.0,
    requested: 2368.0,
    justification: "Estimate met later, credit raised",
    approver: "GT 04",
    status: "Refunded",
    log: [
      { date: "28/09/2026", event: "Request raised from the candidate list", by: "User 5118, FT", amount: "2,368.00", note: "Estimate met later, credit raised" },
      { date: "29/09/2026", event: "Approved and credit raised", by: "GT 04", amount: "2,368.00", note: "Refunded to farmer statement" },
    ],
  },
  {
    id: "RF-2026-0066",
    crop: "Sf 2026",
    raisedBy: "User 5102, FT",
    raisedRole: "Field technician",
    gt: "04",
    farmer: "Farmer 00177",
    fine: 1776.0,
    charged: 0.0,
    alreadyRefunded: 0.0,
    requested: 1776.0,
    justification: "No reason recorded",
    approver: "GT 04",
    status: "Rejected",
    log: [
      { date: "25/09/2026", event: "Request raised from the candidate list", by: "User 5102, FT", amount: "1,776.00", note: "No reason recorded" },
      { date: "26/09/2026", event: "Rejected by territorial manager", by: "GT 04", amount: "-", note: "Insufficient justification" },
    ],
  },
]

type DashRow = {
  key: string
  subtitle?: string
  farmers: number
  contracted: number
  delivered: number
  bought: number
  fines: number
  applied: number
  awaiting: number
  noFine: number
  valueApplied: number
  charged: number
  notCharged: number
}

const DASH_DATA_BY_LEVEL: Record<DashLevel, DashRow[]> = {
  Crop: [
    { key: "Sf 2026", subtitle: "Current active season", farmers: 562, contracted: 5455000, delivered: 4476700, bought: 4422150, fines: 51, applied: 37, awaiting: 10, noFine: 4, valueApplied: 160330.24, charged: 32098.4, notCharged: 128231.84 },
    { key: "Sf 2025", subtitle: "Previous closed season", farmers: 548, contracted: 5280000, delivered: 4699200, bought: 4652000, fines: 39, applied: 34, awaiting: 0, noFine: 5, valueApplied: 118420.0, charged: 94736.0, notCharged: 23684.0 },
  ],
  Region: [
    { key: "South", subtitle: "RS / SC / PR · 3 GTs", farmers: 562, contracted: 5455000, delivered: 4476700, bought: 4422150, fines: 51, applied: 37, awaiting: 10, noFine: 4, valueApplied: 160330.24, charged: 32098.4, notCharged: 128231.84 },
    { key: "North", subtitle: "BA / AL · 2 GTs", farmers: 194, contracted: 1620000, delivered: 1474200, bought: 1458000, fines: 11, applied: 9, awaiting: 1, noFine: 1, valueApplied: 28940.0, charged: 19450.0, notCharged: 9490.0 },
  ],
  "Territory manager": [
    { key: "GT 04", subtitle: "Santa Cruz & Venâncio Aires", farmers: 184, contracted: 1842000, delivered: 1604220, bought: 1585800, fines: 6, applied: 4, awaiting: 1, noFine: 1, valueApplied: 7740.24, charged: 3668.4, notCharged: 4071.84 },
    { key: "GT 07", subtitle: "Camaquã & São Lourenço", farmers: 211, contracted: 2110000, delivered: 1730200, bought: 1709100, fines: 14, applied: 9, awaiting: 4, noFine: 1, valueApplied: 48210.0, charged: 9640.0, notCharged: 38570.0 },
    { key: "GT 11", subtitle: "Araranguá & Tubarão", farmers: 167, contracted: 1503000, delivered: 1142280, bought: 1127250, fines: 31, applied: 24, awaiting: 5, noFine: 2, valueApplied: 104380.0, charged: 18790.0, notCharged: 85590.0 },
  ],
  "Field technician": [
    { key: "User 5102", subtitle: "GT 04 · 64 farmers", farmers: 64, contracted: 640000, delivered: 562400, bought: 556000, fines: 2, applied: 1, awaiting: 1, noFine: 0, valueApplied: 2960.0, charged: 1200.0, notCharged: 1760.0 },
    { key: "User 5118", subtitle: "GT 04 · 62 farmers", farmers: 62, contracted: 612000, delivered: 534820, bought: 522820, fines: 2, applied: 1, awaiting: 0, noFine: 1, valueApplied: 1968.4, charged: 1968.4, notCharged: 0.0 },
    { key: "User 5140", subtitle: "GT 04 · 58 farmers", farmers: 58, contracted: 590000, delivered: 507000, bought: 506980, fines: 2, applied: 2, awaiting: 0, noFine: 0, valueApplied: 2811.84, charged: 500.0, notCharged: 2311.84 },
    { key: "User 5204", subtitle: "GT 07 · 108 farmers", farmers: 108, contracted: 1090000, delivered: 892000, bought: 881100, fines: 8, applied: 5, awaiting: 2, noFine: 1, valueApplied: 27450.0, charged: 5840.0, notCharged: 21610.0 },
    { key: "User 5319", subtitle: "GT 11 · 167 farmers", farmers: 167, contracted: 1503000, delivered: 1142280, bought: 1127250, fines: 31, applied: 24, awaiting: 5, noFine: 2, valueApplied: 104380.0, charged: 18790.0, notCharged: 85590.0 },
  ],
  Farmer: [
    { key: "Farmer 00041", subtitle: "CT-104120 · GT 04 · Virginia", farmers: 1, contracted: 10000, delivered: 8000, bought: 7400, fines: 1, applied: 1, awaiting: 0, noFine: 0, valueApplied: 2960.0, charged: 1200.0, notCharged: 1760.0 },
    { key: "Farmer 00052", subtitle: "CT-104127 · GT 04 · Virginia", farmers: 1, contracted: 8000, delivered: 6720, bought: 6720, fines: 1, applied: 0, awaiting: 1, noFine: 0, valueApplied: 0.0, charged: 0.0, notCharged: 0.0 },
    { key: "Farmer 00085", subtitle: "CT-104144 · GT 04 · Burley", farmers: 1, contracted: 9500, delivered: 8170, bought: 8170, fines: 1, applied: 1, awaiting: 0, noFine: 0, valueApplied: 1968.4, charged: 1968.4, notCharged: 0.0 },
    { key: "Farmer 00074", subtitle: "CT-104138 · GT 04 · Virginia", farmers: 1, contracted: 6000, delivered: 3900, bought: 3900, fines: 1, applied: 1, awaiting: 0, noFine: 0, valueApplied: 1392.0, charged: 0.0, notCharged: 1392.0 },
    { key: "Farmer 00096", subtitle: "CT-104153 · GT 04 · Burley", farmers: 1, contracted: 7200, delivered: 5976, bought: 5976, fines: 1, applied: 1, awaiting: 0, noFine: 0, valueApplied: 1419.84, charged: 500.0, notCharged: 919.84 },
  ],
}

type FinePolicy = {
  id: string
  crop: string
  tobaccoType: string
  gt: string
  minimum: string
  upperLimit: string
  finePercent: string
  referenceClass: string
  classPrice: string
  status: "Active" | "Inactive"
}

const INITIAL_POLICIES: FinePolicy[] = [
  { id: "pol1", crop: "2026/2027", tobaccoType: "Virginia", gt: "All", minimum: "80%", upperLimit: "95%", finePercent: "10%", referenceClass: "TO2", classPrice: "14.80", status: "Active" },
  { id: "pol2", crop: "2026/2027", tobaccoType: "Burley", gt: "All", minimum: "80%", upperLimit: "95%", finePercent: "10%", referenceClass: "C2", classPrice: "11.60", status: "Active" },
  { id: "pol3", crop: "2026/2027", tobaccoType: "Virginia", gt: "GT 11", minimum: "75%", upperLimit: "95%", finePercent: "10%", referenceClass: "TO2", classPrice: "14.80", status: "Active" },
  { id: "pol4", crop: "2026/2027", tobaccoType: "Comum", gt: "All", minimum: "Not set", upperLimit: "Not set", finePercent: "Not set", referenceClass: "Not set", classPrice: "-", status: "Inactive" },
  { id: "pol5", crop: "2025/2026", tobaccoType: "Virginia", gt: "All", minimum: "75%", upperLimit: "95%", finePercent: "10%", referenceClass: "TO2", classPrice: "13.40", status: "Inactive" },
]

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }))
const th = "px-3 py-3 whitespace-nowrap"
const td = "px-3 py-2.5"
const fmtMoney = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (n: number) => n.toLocaleString("en-US")

/* Shared Binding-style primitives */

function TabStrip<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-6 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`border-b-2 px-1 pb-3 text-[14px] font-700 transition ${
            value === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-[36px] flex-wrap items-center justify-between gap-4">
      <h3 className="text-[13px] font-700 uppercase tracking-[0.08em] text-brand">{children}</h3>
      {action}
    </div>
  )
}

function TableCard({ children, minWidth = 1100 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]" style={{ minWidth }}>
          {children}
        </table>
      </div>
    </div>
  )
}

const Head = ({ cols }: { cols: string[] }) => (
  <thead className="bg-brand-soft text-[11px] font-700 uppercase tracking-wide text-brand">
    <tr>
      {cols.map((c, i) => (
        <th key={i} className={th}>
          {c}
        </th>
      ))}
    </tr>
  </thead>
)

function StatStrip({ items }: { items: { label: string; value: ReactNode; tone?: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-y-4 rounded-xl border border-line bg-white py-4 sm:grid-cols-3 xl:flex xl:divide-x xl:divide-line">
      {items.map((it) => (
        <div key={it.label} className="min-w-0 px-5 xl:flex-1">
          <dt className="text-[11px] font-700 uppercase tracking-[0.06em] text-muted">{it.label}</dt>
          <dd className={`mt-1.5 truncate text-[20px] font-800 leading-tight tabular-nums ${it.tone ?? "text-ink"}`}>{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function FineStatusBadge({ status }: { status: FineStatus }) {
  if (status === "Applied by Policy" || status === "Applied by FT" || status === "Applied by Finance") {
    return <Badge tone="green">{status}</Badge>
  }
  if (status === "Awaiting decision") {
    return <Badge tone="amber">{status}</Badge>
  }
  return <Badge tone="neutral">{status}</Badge>
}

function RefundStatusBadge({ status }: { status: RefundStatus }) {
  if (status === "Sent") return <Badge tone="amber">Sent</Badge>
  if (status === "Approved") return <Badge tone="green">Approved</Badge>
  if (status === "Refunded") return <Badge tone="blue">Refunded</Badge>
  return <Badge tone="red">Rejected</Badge>
}

export default function ContractualFine({ onCrumbs }: { onCrumbs?: (c: ContractualFineCrumb[]) => void }) {
  const toast = useToast()
  const [tab, setTab] = useState<FineTab>("fines")
  const [fines, setFines] = useState<FineRow[]>(INITIAL_FINES)
  const [refunds, setRefunds] = useState<RefundRequest[]>(INITIAL_REFUNDS)
  const [policies, setPolicies] = useState<FinePolicy[]>(INITIAL_POLICIES)

  // Fines tab state
  const [ff, setFf] = useState({
    crop: "Sf 2026",
    region: "South",
    gt: "GT 04",
    ft: "All",
    tobaccoType: "All",
    status: "All",
  })
  const [pickedFines, setPickedFines] = useState<string[]>([])
  const [calculationRowId, setCalculationRowId] = useState<string | null>(null)
  const [refundModalRow, setRefundModalRow] = useState<FineRow | null>(null)
  const [refundAmount, setRefundAmount] = useState("2960.00")
  const [refundJustification, setRefundJustification] = useState("Farmer delivered the balance against the Sf 2027 contract")

  // Refunds tab state
  const [rf, setRf] = useState({
    crop: "Sf 2026",
    raisedBy: "All",
    gt: "All",
    farmer: "All",
    status: "All",
    period: "01/10 to 31/10",
  })
  const [selectedRefundId, setSelectedRefundId] = useState<string>("")

  // Dashboard tab state
  const [dashLevel, setDashLevel] = useState<DashLevel>("Territory manager")
  const [dashCrop, setDashCrop] = useState("Sf 2026")
  const [dashRegion, setDashRegion] = useState("South")
  const [dashTobaccoType, setDashTobaccoType] = useState("All")
  const [dashFrom, setDashFrom] = useState("2026-09-01")
  const [dashTo, setDashTo] = useState("2026-10-31")

  // Parameters tab state
  const [pf, setPf] = useState({
    crop: "2026/2027",
    tobaccoType: "All",
    gt: "All",
    status: "All",
  })
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("")
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null)
  const [policyDraft, setPolicyDraft] = useState<FinePolicy | null>(null)

  const calculationRow = calculationRowId ? fines.find((r) => r.id === calculationRowId) ?? null : null

  useEffect(() => {
    if (!onCrumbs) return
    const label = tab === "fines" ? "Fines" : tab === "refunds" ? "Refunds" : tab === "dashboard" ? "Dashboard" : "Parameters"
    if (tab === "fines" && calculationRow) {
      onCrumbs([
        {
          label: "Contractual fine",
          onClick: () => {
            setCalculationRowId(null)
            setTab("fines")
          },
        },
        { label: "Fines", onClick: () => setCalculationRowId(null) },
        { label: `Calculation · ${calculationRow.farmer}` },
      ])
    } else {
      onCrumbs([
        {
          label: "Contractual fine",
          onClick: () => {
            setCalculationRowId(null)
            setTab("fines")
          },
        },
        { label },
      ])
    }
  }, [tab, calculationRow, onCrumbs])

  useEffect(() => () => onCrumbs?.([]), [onCrumbs])

  /* Filtered Fines */
  const filteredFines = fines.filter((r) => {
    return (
      (ff.crop === "All" || r.crop === ff.crop) &&
      (ff.region === "All" || r.region === ff.region) &&
      (ff.gt === "All" || r.gt === ff.gt) &&
      (ff.ft === "All" || r.ft === ff.ft) &&
      (ff.tobaccoType === "All" || r.tobaccoType === ff.tobaccoType) &&
      (ff.status === "All" || r.status === ff.status)
    )
  })

  const appliedCount = filteredFines.filter((r) => r.status.startsWith("Applied")).length
  const awaitingCount = filteredFines.filter((r) => r.status === "Awaiting decision").length
  const totalCalculated = filteredFines.reduce((s, r) => s + r.fine, 0)
  const totalApplied = filteredFines.filter((r) => r.status.startsWith("Applied")).reduce((s, r) => s + r.fine, 0)
  const totalCharged = filteredFines.reduce((s, r) => s + r.charged, 0)
  const totalNotCharged = filteredFines.reduce((s, r) => s + r.notCharged, 0)
  const totalRefunded = filteredFines.reduce((s, r) => s + r.refunded, 0)

  const openRefundModalFor = (row: FineRow) => {
    setRefundModalRow(row)
    setRefundAmount(row.fine.toFixed(2))
    setRefundJustification("Farmer delivered the balance against the Sf 2027 contract")
  }

  /* Filtered Refunds */
  const filteredRefunds = refunds.filter(
    (r) =>
      (rf.crop === "All" || r.crop === rf.crop) &&
      (rf.raisedBy === "All" || r.raisedRole === rf.raisedBy) &&
      (rf.gt === "All" || r.gt === rf.gt) &&
      (rf.farmer === "All" || r.farmer === rf.farmer) &&
      (rf.status === "All" || r.status === rf.status),
  )
  const activeRefund = filteredRefunds.find((r) => r.id === selectedRefundId) ?? null

  /* Filtered Policies */
  const filteredPolicies = policies.filter(
    (p) =>
      (pf.crop === "All" || p.crop === pf.crop) &&
      (pf.tobaccoType === "All" || p.tobaccoType === pf.tobaccoType) &&
      (pf.gt === "All" || p.gt === pf.gt) &&
      (pf.status === "All" || p.status === pf.status),
  )

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TabStrip<FineTab>
          value={tab}
          onChange={(nextTab) => {
            setCalculationRowId(null)
            setTab(nextTab)
          }}
          tabs={[
            { key: "fines", label: "Fines" },
            { key: "refunds", label: "Refunds" },
            { key: "dashboard", label: "Dashboard" },
            { key: "parameters", label: "Parameters" },
          ]}
        />
        <div className="flex items-center gap-2">
          {tab === "parameters" && (
            <Badge tone="blue">Finance only</Badge>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* TAB 1: FINES                                                     */}
      {/* ================================================================ */}
      {tab === "fines" && !calculationRow && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3 lg:grid-cols-7">
              <Field label="Crop">
                <Select value={ff.crop} onChange={(v) => setFf({ ...ff, crop: v })} options={opts(["Sf 2026", "Sf 2025"])} />
              </Field>
              <Field label="Region">
                <Select value={ff.region} onChange={(v) => setFf({ ...ff, region: v })} options={opts(["All", "South", "North"])} />
              </Field>
              <Field label="Territory manager">
                <Select value={ff.gt} onChange={(v) => setFf({ ...ff, gt: v })} options={opts(["All", "GT 04", "GT 07", "GT 11"])} />
              </Field>
              <Field label="Field technician">
                <Select value={ff.ft} onChange={(v) => setFf({ ...ff, ft: v })} options={opts(["All", "User 5102", "User 5118", "User 5140"])} />
              </Field>
              <Field label="Tobacco type">
                <Select value={ff.tobaccoType} onChange={(v) => setFf({ ...ff, tobaccoType: v })} options={opts(["All", "Virginia", "Burley", "Comum"])} />
              </Field>
              <Field label="Status">
                <Select
                  value={ff.status}
                  onChange={(v) => setFf({ ...ff, status: v })}
                  options={opts(["All", "Applied by Policy", "Awaiting decision", "Applied by FT", "Applied by Finance", "No contractual fine"])}
                />
              </Field>
              <Button
                variant="outline"
                onClick={() => toast({ tone: "success", title: "Export started", body: "Fines table exported to Excel." })}
              >
                <FileText size={15} /> Export
              </Button>
            </div>
          </Card>

          <StatStrip
            items={[
              { label: "Fines", value: filteredFines.length },
              { label: "Applied", value: appliedCount, tone: "text-[#1a7a45]" },
              { label: "Awaiting decision", value: awaitingCount, tone: "text-[#9a6a12]" },
              { label: "Calculated", value: fmtMoney(totalCalculated) },
              { label: "Applied amount", value: fmtMoney(totalApplied) },
              { label: "Charged", value: fmtMoney(totalCharged), tone: "text-[#1a7a45]" },
            ]}
          />

          <div>
            <SectionTitle
              action={
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    disabled={pickedFines.length === 0}
                    onClick={() => {
                      setFines((all) =>
                        all.map((r) =>
                          pickedFines.includes(r.id) && r.status === "Awaiting decision"
                            ? { ...r, status: "Applied by Finance", notCharged: r.fine - r.charged }
                            : r,
                        ),
                      )
                      toast({
                        tone: "success",
                        title: "Fines applied",
                        body: `Contractual fine applied to ${pickedFines.length} selected farmer${pickedFines.length === 1 ? "" : "s"}.`,
                      })
                    }}
                  >
                    <Check size={15} /> Apply to selected
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pickedFines.length === 0}
                    onClick={() => {
                      const target = fines.find((r) => pickedFines.includes(r.id) && r.fine > 0) ?? fines[0]
                      openRefundModalFor(target)
                    }}
                  >
                    Apply to refund
                  </Button>
                </div>
              }
            >
              Fines · {ff.gt === "All" ? "All GTs" : ff.gt}, Crop {ff.crop}
            </SectionTitle>

            <TableCard minWidth={1280}>
              <thead className="bg-brand-soft text-[11px] font-700 uppercase tracking-wide text-brand">
                <tr>
                  <th className={`${th} w-10`}>
                    <Checkbox
                      checked={pickedFines.length === filteredFines.length && filteredFines.length > 0}
                      onChange={(v) => setPickedFines(v ? filteredFines.map((r) => r.id) : [])}
                    />
                  </th>
                  <th className={th}>Farmer</th>
                  <th className={th}>Contract</th>
                  <th className={`${th} text-right`}>Contracted</th>
                  <th className={`${th} text-right`}>Delivered</th>
                  <th className={`${th} text-right`}>Returned</th>
                  <th className={`${th} text-right`}>Bought</th>
                  <th className={`${th} text-center`}>% bought</th>
                  <th className={`${th} text-right`}>Disagreement</th>
                  <th className={`${th} text-right`}>Missing</th>
                  <th className={`${th} text-right`}>Contractual fine</th>
                  <th className={`${th} text-right`}>Charged</th>
                  <th className={`${th} text-right`}>Not charged</th>
                  <th className={`${th} text-right`}>Refunded</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFines.map((r) => {
                  const checked = pickedFines.includes(r.id)
                  const pct = r.contracted > 0 ? (r.bought / r.contracted) * 100 : 0
                  const pctTone = pct < 80 ? "bg-[#fdecec] text-[#c23b3b]" : "bg-[#fff6e0] text-[#9a6a12]"
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setPickedFines((all) => (checked ? all.filter((x) => x !== r.id) : [...all, r.id]))}
                      className={`cursor-pointer border-t border-line transition ${checked ? "bg-brand-soft/35" : "hover:bg-canvas/60"}`}
                    >
                      <td className={td} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onChange={() => setPickedFines((all) => (checked ? all.filter((x) => x !== r.id) : [...all, r.id]))}
                        />
                      </td>
                      <td className={`${td} font-700 text-ink`}>{r.farmer}</td>
                      <td className={`${td} tabular-nums text-ink-soft`}>{r.contract}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtInt(r.contracted)}</td>
                      <td className={`${td} text-right font-700 tabular-nums text-ink`}>{fmtInt(r.delivered)}</td>
                      <td className={`${td} text-right tabular-nums ${r.returned > 0 ? "font-700 text-[#9a6a12]" : "text-muted"}`}>
                        {fmtInt(r.returned)}
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{fmtInt(r.bought)}</td>
                      <td className={`${td} text-center`}>
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[12px] font-700 tabular-nums ${pctTone}`}>
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className={`${td} text-right tabular-nums ${r.disagreement > 0 ? "font-700 text-[#5b3fa8]" : "text-muted"}`}>
                        {fmtInt(r.disagreement)}
                      </td>
                      <td className={`${td} text-right font-700 tabular-nums text-ink`}>{fmtInt(r.missing)}</td>
                      <td className={`${td} text-right font-700 tabular-nums text-ink`}>{fmtMoney(r.fine)}</td>
                      <td className={`${td} text-right tabular-nums ${r.charged > 0 ? "font-700 text-[#1a7a45]" : "text-muted"}`}>
                        {fmtMoney(r.charged)}
                      </td>
                      <td className={`${td} text-right tabular-nums ${r.notCharged > 0 ? "font-700 text-[#9a6a12]" : "text-muted"}`}>
                        {fmtMoney(r.notCharged)}
                      </td>
                      <td className={`${td} text-right tabular-nums text-muted`}>{fmtMoney(r.refunded)}</td>
                      <td className={`${td} whitespace-nowrap`}>
                        <FineStatusBadge status={r.status} />
                      </td>
                      <td className={`${td} whitespace-nowrap text-right`} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setCalculationRowId(r.id)}
                          title="Calculation"
                          aria-label={`View calculation for ${r.farmer}`}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-brand transition hover:border-brand-ring hover:bg-brand-soft"
                        >
                          <Calculator size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-line bg-canvas font-800 text-ink">
                <tr>
                  <td className={td} />
                  <td className={td}>TOTAL</td>
                  <td className={td}>{filteredFines.length} farmers</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtInt(filteredFines.reduce((s, r) => s + r.contracted, 0))}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtInt(filteredFines.reduce((s, r) => s + r.delivered, 0))}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtInt(filteredFines.reduce((s, r) => s + r.returned, 0))}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtInt(filteredFines.reduce((s, r) => s + r.bought, 0))}</td>
                  <td className={td} />
                  <td className={`${td} text-right tabular-nums`}>{fmtInt(filteredFines.reduce((s, r) => s + r.disagreement, 0))}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtInt(filteredFines.reduce((s, r) => s + r.missing, 0))}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtMoney(totalCalculated)}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtMoney(totalCharged)}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtMoney(totalNotCharged)}</td>
                  <td className={`${td} text-right tabular-nums`}>{fmtMoney(totalRefunded)}</td>
                  <td className={td} />
                  <td className={td} />
                </tr>
              </tfoot>
            </TableCard>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 1 DRILL-DOWN: CALCULATION SCREEN                             */}
      {/* ================================================================ */}
      {tab === "fines" && calculationRow && (() => {
        const r = calculationRow
        const pctBought = r.contracted > 0 ? (r.bought / r.contracted) * 100 : 0
        const unitFineRate = (r.classPrice * r.finePercent) / 100

        return (
          <div className="space-y-5">
            {/* Top Action Bar — Back button on the right */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[15px] font-800 text-ink">{r.farmer}</span>
                <span className="text-muted">·</span>
                <span className="text-[14px] font-700 text-brand">{r.contract}</span>
                <Badge tone="neutral">{r.tobaccoType}</Badge>
                <Badge tone="neutral">{r.gt}</Badge>
                <FineStatusBadge status={r.status} />
              </div>
              <Button variant="outline" onClick={() => setCalculationRowId(null)}>
                <ChevronLeft size={15} /> Back
              </Button>
            </div>

            {/* Section 1 (Vertical): Volume Calculation */}
            <Card className="p-5">
              <h3 className="mb-4 text-[13px] font-700 uppercase tracking-[0.08em] text-brand">
                1 · Volume calculation
              </h3>
              <div className="divide-y divide-line text-[13.5px]">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-ink-soft">Contracted</span>
                  <span className="font-700 tabular-nums text-ink">{fmtInt(r.contracted)} kg</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-ink-soft">Delivered</span>
                  <span className="font-700 tabular-nums text-ink">{fmtInt(r.delivered)} kg</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-ink-soft">Returned</span>
                  <span className={`tabular-nums ${r.returned > 0 ? "font-700 text-[#9a6a12]" : "text-muted"}`}>
                    {fmtInt(r.returned)} kg
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-ink-soft">Bought</span>
                  <span className="font-700 tabular-nums text-ink">
                    {fmtInt(r.bought)} kg ({pctBought.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-ink-soft">Disagreement</span>
                  <span className={`tabular-nums ${r.disagreement > 0 ? "font-700 text-[#5b3fa8]" : "text-muted"}`}>
                    {fmtInt(r.disagreement)} kg
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between rounded-xl bg-brand-soft/45 px-4 py-3 font-800 text-ink">
                  <div>
                    <span>Missing volume</span>
                    <span className="ml-2 text-[12px] font-500 text-muted">(Contracted − Delivered − Disagreement)</span>
                  </div>
                  <span className="text-[16px] tabular-nums text-brand">{fmtInt(r.missing)} kg</span>
                </div>
              </div>
            </Card>

            {/* Section 2 (Vertical): Fine Calculation */}
            <Card className="p-5">
              <h3 className="mb-4 text-[13px] font-700 uppercase tracking-[0.08em] text-brand">
                2 · Fine calculation
              </h3>
              <div className="divide-y divide-line text-[13.5px]">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-ink-soft">Policy thresholds</span>
                  <span className="font-700 tabular-nums text-ink">
                    Minimum {r.policyMinPct}% · Upper limit {r.policyMaxPct}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-ink-soft">Reference class &amp; price</span>
                  <span className="font-700 tabular-nums text-ink">
                    {r.referenceClass} · R$ {fmtMoney(r.classPrice)} / kg
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-ink-soft">Fine per cent</span>
                  <span className="font-700 tabular-nums text-ink">
                    {r.finePercent}% (R$ {fmtMoney(unitFineRate)} / kg)
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between rounded-xl bg-brand-soft/45 px-4 py-3 font-800 text-ink">
                  <div>
                    <span>Contractual fine</span>
                    <span className="ml-2 text-[12px] font-500 text-muted">
                      ({fmtInt(r.missing)} kg × R$ {fmtMoney(r.classPrice)} × {r.finePercent}%)
                    </span>
                  </div>
                  <span className="text-[16px] tabular-nums text-brand">R$ {fmtMoney(r.fine)}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-xl border border-line bg-canvas/40 px-4 py-3">
                  <span className="text-[12.5px] font-600 text-muted">Charged</span>
                  <span className="text-[15px] font-800 tabular-nums text-[#1a7a45]">R$ {fmtMoney(r.charged)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-canvas/40 px-4 py-3">
                  <span className="text-[12.5px] font-600 text-muted">Not charged</span>
                  <span className="text-[15px] font-800 tabular-nums text-[#9a6a12]">R$ {fmtMoney(r.notCharged)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-canvas/40 px-4 py-3">
                  <span className="text-[12.5px] font-600 text-muted">Refunded</span>
                  <span className="text-[15px] font-800 tabular-nums text-ink">R$ {fmtMoney(r.refunded)}</span>
                </div>
              </div>
            </Card>
          </div>
        )
      })()}

      {/* ================================================================ */}
      {/* TAB 2: REFUNDS                                                   */}
      {/* ================================================================ */}
      {tab === "refunds" && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3 lg:grid-cols-7">
              <Field label="Crop">
                <Select value={rf.crop} onChange={(v) => setRf({ ...rf, crop: v })} options={opts(["Sf 2026", "Sf 2025"])} />
              </Field>
              <Field label="Raised by">
                <Select value={rf.raisedBy} onChange={(v) => setRf({ ...rf, raisedBy: v })} options={opts(["All", "Field technician", "Finance"])} />
              </Field>
              <Field label="Territory manager">
                <Select value={rf.gt} onChange={(v) => setRf({ ...rf, gt: v })} options={opts(["All", "04", "07", "11"])} />
              </Field>
              <Field label="Farmer">
                <Select
                  value={rf.farmer}
                  onChange={(v) => setRf({ ...rf, farmer: v })}
                  options={opts(["All", ...new Set(refunds.map((r) => r.farmer))])}
                />
              </Field>
              <Field label="Status">
                <Select value={rf.status} onChange={(v) => setRf({ ...rf, status: v })} options={opts(["All", "Sent", "Approved", "Refunded", "Rejected"])} />
              </Field>
              <Field label="Requested between">
                <Select value={rf.period} onChange={(v) => setRf({ ...rf, period: v })} options={opts(["01/10 to 31/10", "01/09 to 30/09", "All dates"])} />
              </Field>
              <Button
                variant="outline"
                onClick={() => toast({ tone: "success", title: "Export started", body: "Refund requests exported to Excel." })}
              >
                <FileText size={15} /> Export
              </Button>
            </div>
          </Card>

          <div>
            <TableCard minWidth={1220}>
              <thead className="bg-brand-soft text-[11px] font-700 uppercase tracking-wide text-brand">
                <tr>
                  <th className={`${th} w-10`} />
                  <th className={th}>Request</th>
                  <th className={th}>Raised by</th>
                  <th className={th}>Territory manager</th>
                  <th className={th}>Farmer</th>
                  <th className={`${th} text-right`}>Contractual fine</th>
                  <th className={`${th} text-right`}>Charged</th>
                  <th className={`${th} text-right`}>Already refunded</th>
                  <th className={`${th} text-right`}>Refund requested</th>
                  <th className={th}>Justification</th>
                  <th className={th}>Approver</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.map((r) => {
                  const on = r.id === activeRefund?.id
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRefundId(on ? "" : r.id)}
                      className={`cursor-pointer border-t border-line transition ${on ? "bg-brand-soft/35" : "hover:bg-canvas/60"}`}
                    >
                      <td className={td}>
                        <span
                          role="radio"
                          aria-checked={on}
                          aria-label={r.id}
                          className={`grid h-4 w-4 place-items-center rounded-full border-2 ${on ? "border-brand" : "border-line"}`}
                        >
                          {on && <span className="h-2 w-2 rounded-full bg-brand" />}
                        </span>
                      </td>
                      <td className={`${td} font-700 text-brand`}>{r.id}</td>
                      <td className={td}>{r.raisedBy}</td>
                      <td className={`${td} tabular-nums`}>{r.gt}</td>
                      <td className={`${td} font-700 text-ink`}>{r.farmer}</td>
                      <td className={`${td} text-right font-700 tabular-nums text-ink`}>{fmtMoney(r.fine)}</td>
                      <td className={`${td} text-right tabular-nums ${r.charged > 0 ? "font-700 text-[#1a7a45]" : "text-muted"}`}>
                        {fmtMoney(r.charged)}
                      </td>
                      <td className={`${td} text-right tabular-nums ${r.alreadyRefunded > 0 ? "font-700 text-brand" : "text-muted"}`}>
                        {fmtMoney(r.alreadyRefunded)}
                      </td>
                      <td className={`${td} text-right font-700 tabular-nums text-[#5b3fa8]`}>{fmtMoney(r.requested)}</td>
                      <td className={td}>{r.justification}</td>
                      <td className={td}>{r.approver}</td>
                      <td className={td}>
                        <RefundStatusBadge status={r.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TableCard>
          </div>

          {activeRefund && (
            <div>
              <SectionTitle>Log · {activeRefund.id}</SectionTitle>
              <TableCard minWidth={820}>
                <Head cols={["Date", "Event", "By", "Amount", "Note"]} />
                <tbody>
                  {activeRefund.log.map((l, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className={`${td} whitespace-nowrap tabular-nums text-muted`}>{l.date}</td>
                      <td className={`${td} font-700 text-ink`}>{l.event}</td>
                      <td className={td}>{l.by}</td>
                      <td className={`${td} font-700 tabular-nums text-ink`}>{l.amount}</td>
                      <td className={`${td} ${l.note === "Awaiting the GT" ? "font-700 text-[#9a6a12]" : "text-ink-soft"}`}>{l.note}</td>
                    </tr>
                  ))}
                </tbody>
              </TableCard>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 3: DASHBOARD                                                 */}
      {/* ================================================================ */}
      {tab === "dashboard" && (() => {
        const dashRows = DASH_DATA_BY_LEVEL[dashLevel]
        const sumFarmers = dashRows.reduce((s, r) => s + r.farmers, 0)
        const sumContracted = dashRows.reduce((s, r) => s + r.contracted, 0)
        const sumDelivered = dashRows.reduce((s, r) => s + r.delivered, 0)
        const sumBought = dashRows.reduce((s, r) => s + r.bought, 0)
        const sumPctBought = sumContracted > 0 ? (sumBought / sumContracted) * 100 : 0
        const sumFines = dashRows.reduce((s, r) => s + r.fines, 0)
        const sumApplied = dashRows.reduce((s, r) => s + r.applied, 0)
        const sumAwaiting = dashRows.reduce((s, r) => s + r.awaiting, 0)
        const sumNoFine = dashRows.reduce((s, r) => s + r.noFine, 0)
        const sumValueApplied = dashRows.reduce((s, r) => s + r.valueApplied, 0)
        const sumCharged = dashRows.reduce((s, r) => s + r.charged, 0)
        const sumNotCharged = dashRows.reduce((s, r) => s + r.notCharged, 0)

        return (
          <div className="space-y-6">
            {/* Level & Filter Bar */}
            <Card className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="mb-1.5 text-[12px] font-600 text-muted">Level</p>
                  <div className="inline-flex flex-wrap rounded-xl border border-line bg-canvas/60 p-1">
                    {(["Crop", "Region", "Territory manager", "Field technician", "Farmer"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDashLevel(lvl)}
                        className={`rounded-lg px-3.5 py-1.5 text-[13px] font-700 transition ${
                          dashLevel === lvl ? "bg-brand text-white shadow-xs" : "text-ink-soft hover:bg-white hover:text-ink"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Crop season">
                    <Select value={dashCrop} onChange={setDashCrop} options={opts(["Sf 2026", "Sf 2025"])} />
                  </Field>
                  <Field label="Region">
                    <Select value={dashRegion} onChange={setDashRegion} options={opts(["All", "South", "North"])} />
                  </Field>
                  <Field label="From">
                    <DatePicker value={dashFrom} onChange={setDashFrom} />
                  </Field>
                  <Field label="To">
                    <DatePicker value={dashTo} onChange={setDashTo} />
                  </Field>
                </div>
              </div>
            </Card>

            {/* Clean KPI Strip */}
            <StatStrip
              items={[
                { label: "Calculated fine", value: "R$ 200,330.24" },
                { label: "Applied", value: `R$ ${fmtMoney(sumValueApplied)}`, tone: "text-brand" },
                { label: "Charged", value: `R$ ${fmtMoney(sumCharged)}`, tone: "text-[#1a7a45]" },
                { label: "Not charged", value: `R$ ${fmtMoney(sumNotCharged)}`, tone: "text-[#9a6a12]" },
                { label: "Refunded", value: "R$ 9,632.00" },
              ]}
            />

            {/* Clean Visual Charts (Minimal Text) */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Left: Charged vs Not Charged by Level */}
              <Card className="p-5 lg:col-span-7">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[13px] font-700 uppercase tracking-[0.08em] text-brand">
                    Charged vs Not charged · By {dashLevel}
                  </h3>
                  <div className="flex items-center gap-4 text-[12px] font-600">
                    <span className="inline-flex items-center gap-1.5 text-ink-soft">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#1a7a45]" /> Charged
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-ink-soft">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#e3b34c]" /> Not charged
                    </span>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {dashRows.map((row) => {
                    const chargedPct = row.valueApplied > 0 ? Math.round((row.charged / row.valueApplied) * 100) : 0
                    return (
                      <div key={row.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-700 text-ink">{row.key}</span>
                          <span className="tabular-nums text-muted">
                            <b className="text-[#1a7a45]">R$ {fmtMoney(row.charged)}</b> / R$ {fmtMoney(row.valueApplied)} ({chargedPct}%)
                          </span>
                        </div>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-canvas">
                          <div style={{ width: `${chargedPct}%` }} className="bg-[#1a7a45]" />
                          <div style={{ width: `${row.valueApplied > 0 ? 100 - chargedPct : 0}%` }} className="bg-[#f0d084]" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Right: Status Breakdown */}
              <Card className="p-5 lg:col-span-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[13px] font-700 uppercase tracking-[0.08em] text-brand">Fines status</h3>
                  <Badge tone="neutral">{sumFines} contracts</Badge>
                </div>

                <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full bg-canvas">
                  <div style={{ width: `${sumFines > 0 ? (sumApplied / sumFines) * 100 : 0}%` }} className="bg-[#1a7a45]" />
                  <div style={{ width: `${sumFines > 0 ? (sumAwaiting / sumFines) * 100 : 0}%` }} className="bg-[#d99b26]" />
                  <div style={{ width: `${sumFines > 0 ? (sumNoFine / sumFines) * 100 : 0}%` }} className="bg-[#8c72d6]" />
                </div>

                <div className="divide-y divide-line text-[13px]">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="inline-flex items-center gap-2 font-600 text-ink">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#1a7a45]" /> Applied
                    </span>
                    <span className="font-700 tabular-nums text-ink">{sumApplied} · R$ {fmtMoney(sumValueApplied)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="inline-flex items-center gap-2 font-600 text-ink">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#d99b26]" /> Awaiting decision
                    </span>
                    <span className="font-700 tabular-nums text-[#9a6a12]">{sumAwaiting} · R$ 40,000.00</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="inline-flex items-center gap-2 font-600 text-ink">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#8c72d6]" /> No fine
                    </span>
                    <span className="font-700 tabular-nums text-muted">{sumNoFine} · R$ 0.00</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <span className="inline-flex items-center gap-2 font-600 text-ink">
                      <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Refunded
                    </span>
                    <span className="font-700 tabular-nums text-brand">4 · R$ 9,632.00</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Breakdown Table with Export CTA on the Table Header */}
            <div>
              <SectionTitle
                action={
                  <Button
                    variant="outline"
                    onClick={() => toast({ tone: "success", title: "Export started", body: `Dashboard by ${dashLevel} exported.` })}
                  >
                    <FileText size={15} /> Export
                  </Button>
                }
              >
                By {dashLevel} · {dashRegion === "All" ? "All regions" : dashRegion}, Crop {dashCrop}
              </SectionTitle>
              <TableCard minWidth={1200}>
                <thead className="bg-brand-soft text-[11px] font-700 uppercase tracking-wide text-brand">
                  <tr>
                    <th className={th}>{dashLevel}</th>
                    <th className={`${th} text-right`}>Farmers</th>
                    <th className={`${th} text-right`}>Contracted</th>
                    <th className={`${th} text-right`}>Delivered</th>
                    <th className={`${th} text-right`}>Bought</th>
                    <th className={`${th} text-center`}>% bought</th>
                    <th className={`${th} text-right`}>Fines</th>
                    <th className={`${th} text-right`}>Applied</th>
                    <th className={`${th} text-right`}>Awaiting</th>
                    <th className={`${th} text-right`}>No fine</th>
                    <th className={`${th} text-right`}>Value applied</th>
                    <th className={`${th} text-right`}>Charged</th>
                    <th className={`${th} text-right`}>Not charged</th>
                  </tr>
                </thead>
                <tbody>
                  {dashRows.map((r) => {
                    const pct = r.contracted > 0 ? (r.bought / r.contracted) * 100 : 0
                    const pctTone = pct < 80 ? "bg-[#fdecec] text-[#c23b3b]" : "bg-[#fff6e0] text-[#9a6a12]"
                    return (
                      <tr key={r.key} className="border-t border-line hover:bg-canvas/60">
                        <td className={`${td} font-700 text-ink`}>{r.key}</td>
                        <td className={`${td} text-right tabular-nums`}>{fmtInt(r.farmers)}</td>
                        <td className={`${td} text-right tabular-nums`}>{fmtInt(r.contracted)} kg</td>
                        <td className={`${td} text-right tabular-nums`}>{fmtInt(r.delivered)} kg</td>
                        <td className={`${td} text-right font-700 tabular-nums text-ink`}>{fmtInt(r.bought)} kg</td>
                        <td className={`${td} text-center`}>
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[12px] font-700 tabular-nums ${pctTone}`}>
                            {pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className={`${td} text-right font-700 tabular-nums`}>{r.fines}</td>
                        <td className={`${td} text-right font-700 tabular-nums text-[#1a7a45]`}>{r.applied}</td>
                        <td className={`${td} text-right font-700 tabular-nums text-[#9a6a12]`}>{r.awaiting}</td>
                        <td className={`${td} text-right font-700 tabular-nums text-[#5b3fa8]`}>{r.noFine}</td>
                        <td className={`${td} text-right font-700 tabular-nums text-ink`}>{fmtMoney(r.valueApplied)}</td>
                        <td className={`${td} text-right font-700 tabular-nums text-[#1a7a45]`}>{fmtMoney(r.charged)}</td>
                        <td className={`${td} text-right font-700 tabular-nums text-[#9a6a12]`}>{fmtMoney(r.notCharged)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t border-line bg-canvas font-800 text-ink">
                  <tr>
                    <td className={td}>TOTAL</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtInt(sumFarmers)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtInt(sumContracted)} kg</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtInt(sumDelivered)} kg</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtInt(sumBought)} kg</td>
                    <td className={`${td} text-center tabular-nums`}>{sumPctBought.toFixed(1)}%</td>
                    <td className={`${td} text-right tabular-nums`}>{sumFines}</td>
                    <td className={`${td} text-right tabular-nums`}>{sumApplied}</td>
                    <td className={`${td} text-right tabular-nums`}>{sumAwaiting}</td>
                    <td className={`${td} text-right tabular-nums`}>{sumNoFine}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(sumValueApplied)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(sumCharged)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(sumNotCharged)}</td>
                  </tr>
                </tfoot>
              </TableCard>
            </div>
          </div>
        )
      })()}

      {/* ================================================================ */}
      {/* TAB 4: PARAMETERS                                                */}
      {/* ================================================================ */}
      {tab === "parameters" && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-4 lg:max-w-[740px]">
                <Field label="Crop">
                  <Select value={pf.crop} onChange={(v) => setPf({ ...pf, crop: v })} options={opts(["All", "2026/2027", "2025/2026"])} />
                </Field>
                <Field label="Tobacco type">
                  <Select value={pf.tobaccoType} onChange={(v) => setPf({ ...pf, tobaccoType: v })} options={opts(["All", "Virginia", "Burley", "Comum"])} />
                </Field>
                <Field label="Territory manager">
                  <Select value={pf.gt} onChange={(v) => setPf({ ...pf, gt: v })} options={opts(["All", "GT 04", "GT 07", "GT 11"])} />
                </Field>
                <Field label="Status">
                  <Select value={pf.status} onChange={(v) => setPf({ ...pf, status: v })} options={opts(["All", "Active", "Inactive"])} />
                </Field>
              </div>
              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  disabled={!selectedPolicyId}
                  onClick={() => {
                    const base = policies.find((p) => p.id === selectedPolicyId)
                    if (!base) return
                    const copy: FinePolicy = { ...base, id: `pol${Date.now()}`, gt: base.gt === "All" ? "GT 04" : base.gt }
                    setPolicies((all) => [copy, ...all])
                    setSelectedPolicyId(copy.id)
                    toast({ tone: "success", title: "Policy duplicated", body: `${copy.tobaccoType} (${copy.gt}) duplicated.` })
                  }}
                >
                  <Copy size={15} /> Duplicate
                </Button>
                <Button
                  onClick={() => {
                    setEditingPolicyId("__new__")
                    setPolicyDraft({
                      id: "__new__",
                      crop: "2026/2027",
                      tobaccoType: "Virginia",
                      gt: "All",
                      minimum: "80%",
                      upperLimit: "95%",
                      finePercent: "10%",
                      referenceClass: "TO2",
                      classPrice: "14.80",
                      status: "Active",
                    })
                  }}
                >
                  <Plus size={15} /> New policy
                </Button>
              </div>
            </div>
          </Card>

          <div>
            <TableCard minWidth={980}>
              <thead className="bg-brand-soft text-[11px] font-700 uppercase tracking-wide text-brand">
                <tr>
                  <th className={`${th} w-10`} />
                  <th className={th}>Crop</th>
                  <th className={th}>Tobacco type</th>
                  <th className={th}>Territory manager</th>
                  <th className={th}>Minimum</th>
                  <th className={th}>Upper limit</th>
                  <th className={th}>Fine per cent</th>
                  <th className={th}>Reference class</th>
                  <th className={`${th} text-right`}>Class price</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {editingPolicyId === "__new__" && policyDraft && (
                  <tr className="border-t border-line bg-brand-soft/30">
                    <td className={td} />
                    <td className={td}>
                      <Select
                        value={policyDraft.crop}
                        onChange={(v) => setPolicyDraft({ ...policyDraft, crop: v })}
                        options={opts(["2026/2027", "2025/2026"])}
                      />
                    </td>
                    <td className={td}>
                      <Select
                        value={policyDraft.tobaccoType}
                        onChange={(v) => setPolicyDraft({ ...policyDraft, tobaccoType: v })}
                        options={opts(["Virginia", "Burley", "Comum"])}
                      />
                    </td>
                    <td className={td}>
                      <Select
                        value={policyDraft.gt}
                        onChange={(v) => setPolicyDraft({ ...policyDraft, gt: v })}
                        options={opts(["All", "GT 04", "GT 07", "GT 11"])}
                      />
                    </td>
                    <td className={td}>
                      <Input value={policyDraft.minimum} onChange={(e) => setPolicyDraft({ ...policyDraft, minimum: e.target.value })} />
                    </td>
                    <td className={td}>
                      <Input value={policyDraft.upperLimit} onChange={(e) => setPolicyDraft({ ...policyDraft, upperLimit: e.target.value })} />
                    </td>
                    <td className={td}>
                      <Input value={policyDraft.finePercent} onChange={(e) => setPolicyDraft({ ...policyDraft, finePercent: e.target.value })} />
                    </td>
                    <td className={td}>
                      <Input value={policyDraft.referenceClass} onChange={(e) => setPolicyDraft({ ...policyDraft, referenceClass: e.target.value })} />
                    </td>
                    <td className={td}>
                      <Input value={policyDraft.classPrice} onChange={(e) => setPolicyDraft({ ...policyDraft, classPrice: e.target.value })} />
                    </td>
                    <td className={td}>
                      <Select
                        value={policyDraft.status}
                        onChange={(v) => setPolicyDraft({ ...policyDraft, status: v as "Active" | "Inactive" })}
                        options={opts(["Active", "Inactive"])}
                      />
                    </td>
                    <td className={`${td} text-right`}>
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          title="Save policy"
                          aria-label="Save policy"
                          onClick={() => {
                            const created: FinePolicy = { ...policyDraft, id: `pol${Date.now()}` }
                            setPolicies((all) => [created, ...all])
                            setEditingPolicyId(null)
                            setPolicyDraft(null)
                            toast({ tone: "success", title: "Policy created", body: `${created.tobaccoType} (${created.gt}) saved.` })
                          }}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg bg-brand text-white transition hover:bg-brand/90"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          title="Cancel"
                          aria-label="Cancel"
                          onClick={() => {
                            setEditingPolicyId(null)
                            setPolicyDraft(null)
                          }}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-muted transition hover:text-ink"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredPolicies.map((p) => {
                  const on = p.id === selectedPolicyId
                  const isEditing = editingPolicyId === p.id && policyDraft
                  if (isEditing && policyDraft) {
                    return (
                      <tr key={p.id} className="border-t border-line bg-brand-soft/30">
                        <td className={td} />
                        <td className={td}>
                          <Select
                            value={policyDraft.crop}
                            onChange={(v) => setPolicyDraft({ ...policyDraft, crop: v })}
                            options={opts(["2026/2027", "2025/2026"])}
                          />
                        </td>
                        <td className={td}>
                          <Select
                            value={policyDraft.tobaccoType}
                            onChange={(v) => setPolicyDraft({ ...policyDraft, tobaccoType: v })}
                            options={opts(["Virginia", "Burley", "Comum"])}
                          />
                        </td>
                        <td className={td}>
                          <Select
                            value={policyDraft.gt}
                            onChange={(v) => setPolicyDraft({ ...policyDraft, gt: v })}
                            options={opts(["All", "GT 04", "GT 07", "GT 11"])}
                          />
                        </td>
                        <td className={td}>
                          <Input value={policyDraft.minimum} onChange={(e) => setPolicyDraft({ ...policyDraft, minimum: e.target.value })} />
                        </td>
                        <td className={td}>
                          <Input value={policyDraft.upperLimit} onChange={(e) => setPolicyDraft({ ...policyDraft, upperLimit: e.target.value })} />
                        </td>
                        <td className={td}>
                          <Input value={policyDraft.finePercent} onChange={(e) => setPolicyDraft({ ...policyDraft, finePercent: e.target.value })} />
                        </td>
                        <td className={td}>
                          <Input value={policyDraft.referenceClass} onChange={(e) => setPolicyDraft({ ...policyDraft, referenceClass: e.target.value })} />
                        </td>
                        <td className={td}>
                          <Input value={policyDraft.classPrice} onChange={(e) => setPolicyDraft({ ...policyDraft, classPrice: e.target.value })} />
                        </td>
                        <td className={td}>
                          <Select
                            value={policyDraft.status}
                            onChange={(v) => setPolicyDraft({ ...policyDraft, status: v as "Active" | "Inactive" })}
                            options={opts(["Active", "Inactive"])}
                          />
                        </td>
                        <td className={`${td} text-right`}>
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              title="Save changes"
                              aria-label="Save changes"
                              onClick={() => {
                                setPolicies((all) => all.map((item) => (item.id === p.id ? policyDraft : item)))
                                setEditingPolicyId(null)
                                setPolicyDraft(null)
                                toast({ tone: "success", title: "Policy updated", body: `${policyDraft.tobaccoType} (${policyDraft.gt}) saved.` })
                              }}
                              className="inline-grid h-8 w-8 place-items-center rounded-lg bg-brand text-white transition hover:bg-brand/90"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              type="button"
                              title="Cancel"
                              aria-label="Cancel"
                              onClick={() => {
                                setEditingPolicyId(null)
                                setPolicyDraft(null)
                              }}
                              className="inline-grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-muted transition hover:text-ink"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPolicyId(on ? "" : p.id)}
                      className={`cursor-pointer border-t border-line transition ${on ? "bg-brand-soft/35" : "hover:bg-canvas/60"}`}
                    >
                      <td className={td}>
                        <span
                          role="radio"
                          aria-checked={on}
                          aria-label={`${p.crop} ${p.tobaccoType}`}
                          className={`grid h-4 w-4 place-items-center rounded-full border-2 ${on ? "border-brand" : "border-line"}`}
                        >
                          {on && <span className="h-2 w-2 rounded-full bg-brand" />}
                        </span>
                      </td>
                      <td className={`${td} tabular-nums`}>{p.crop}</td>
                      <td className={`${td} font-700 text-ink`}>{p.tobaccoType}</td>
                      <td className={`${td} font-600`}>{p.gt}</td>
                      <td className={`${td} font-700 tabular-nums`}>{p.minimum}</td>
                      <td className={`${td} font-700 tabular-nums`}>{p.upperLimit}</td>
                      <td className={`${td} font-700 tabular-nums`}>{p.finePercent}</td>
                      <td className={`${td} font-700 text-brand`}>{p.referenceClass}</td>
                      <td className={`${td} text-right font-700 tabular-nums`}>{p.classPrice}</td>
                      <td className={td}>
                        <Badge tone={p.status === "Active" ? "green" : "neutral"}>{p.status}</Badge>
                      </td>
                      <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="Edit policy"
                          aria-label="Edit policy"
                          onClick={() => {
                            setEditingPolicyId(p.id)
                            setPolicyDraft({ ...p })
                          }}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TableCard>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: APPLY TO REFUND                                           */}
      {/* ================================================================ */}
      <Modal
        open={!!refundModalRow}
        onClose={() => setRefundModalRow(null)}
        title={`Apply to refund · ${refundModalRow?.farmer ?? ""}`}
        width="max-w-xl"
      >
        {refundModalRow && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Contractual fine">
                <Input value={fmtMoney(refundModalRow.fine)} disabled />
              </Field>
              <Field label="Charged">
                <Input value={fmtMoney(refundModalRow.charged)} disabled />
              </Field>
              <Field label="Already refunded">
                <Input value={fmtMoney(refundModalRow.refunded)} disabled />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Refund requested">
                <Input value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </Field>
              <Field label="Justification" className="sm:col-span-2">
                <Input
                  value={refundJustification}
                  onChange={(e) => setRefundJustification(e.target.value)}
                  placeholder="Why the fine should be refunded"
                />
              </Field>
            </div>

            {(() => {
              const reqNum = Math.max(0, Number(refundAmount.replace(/,/g, "")) || 0)
              const resultingBalance = Math.max(0, refundModalRow.fine - reqNum)
              const creditToRaise = Math.min(refundModalRow.charged, reqNum)
              return (
                <div className="flex flex-wrap items-center justify-around gap-3 rounded-xl border border-brand-ring bg-brand-soft/40 px-4 py-3 text-[13px] font-700 text-ink">
                  <span>
                    Resulting balance <b className="text-brand">R$ {fmtMoney(resultingBalance)}</b>
                  </span>
                  <span>
                    Credit to raise <b className="text-[#1a7a45]">R$ {fmtMoney(creditToRaise)}</b>
                  </span>
                  <span>
                    Approver <b className="text-ink">{refundModalRow.gt}</b>
                  </span>
                </div>
              )
            })()}

            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="outline" onClick={() => setRefundModalRow(null)}>
                Cancel
              </Button>
              <Button
                disabled={!refundJustification.trim()}
                onClick={() => {
                  const reqVal = Math.max(0, Number(refundAmount.replace(/,/g, "")) || refundModalRow.fine)
                  const newId = `RF-2026-00${refunds.length + 85}`
                  const created: RefundRequest = {
                    id: newId,
                    crop: refundModalRow.crop,
                    raisedBy: "User 5102, FT",
                    raisedRole: "Field technician",
                    gt: refundModalRow.gt.replace("GT ", ""),
                    farmer: refundModalRow.farmer,
                    fine: refundModalRow.fine,
                    charged: refundModalRow.charged,
                    alreadyRefunded: refundModalRow.refunded,
                    requested: reqVal,
                    justification: refundJustification.trim(),
                    approver: refundModalRow.gt,
                    status: "Sent",
                    log: [
                      {
                        date: "07/10/2026",
                        event: "Request raised from the candidate list",
                        by: "User 5102, FT",
                        amount: fmtMoney(reqVal),
                        note: refundJustification.trim(),
                      },
                      {
                        date: "07/10/2026",
                        event: "Sent to the territorial manager",
                        by: "System",
                        amount: "-",
                        note: "Awaiting the GT",
                      },
                    ],
                  }
                  setRefunds((all) => [created, ...all])
                  setSelectedRefundId(newId)
                  setRefundModalRow(null)
                  toast({
                    tone: "success",
                    title: `${newId} sent to ${refundModalRow.gt}`,
                    body: `Refund request for ${refundModalRow.farmer} submitted for approval.`,
                  })
                }}
              >
                <Send size={15} /> Send
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
