import { useEffect, useState, type ReactNode } from "react"
import { Badge, Button, Card, Checkbox, DatePicker, Field, Input, Modal, MultiSelect, Select, useToast } from "../components/ui"
import { AlertTriangle, Check, ChevronLeft, Eye, FileText, Play, Plus, Printer, RotateCcw, Send, ShieldCheck, X } from "../components/icons"

export type RebuyCrumb = { label: string; onClick?: () => void }

type RebuyStatus = "IN EXECUTION" | "COMPLETED" | "IN PREPARATION"
type RebuyTab = "parameters" | "simulation" | "execution"

type AuditEntry = {
  when: string
  who: string
  action: string
  simulation: string
  comment: string
}

type RebuyRow = {
  id: string
  crop: string
  period: string
  periodFrom: string
  periodTo: string
  status: RebuyStatus
  farmers: number | null
  invoices: number | null
  netRebuy: number | null
  processed: number | null
  debtCollection: number | null
  selfFunding: number | null
  farmerPayment: number | null
  scheduledFor: string
  audit: AuditEntry[]
}

const INITIAL_REBUYS: RebuyRow[] = [
  {
    id: "REB-2026-002",
    crop: "2026",
    period: "01/10/2026 - 01/02/2027",
    periodFrom: "2026-10-01",
    periodTo: "2027-02-01",
    status: "IN EXECUTION",
    farmers: 1842,
    invoices: 5791,
    netRebuy: 1740670.0,
    processed: 1725610.0,
    debtCollection: 606980.0,
    selfFunding: 482430.0,
    farmerPayment: 610315.85,
    scheduledFor: "13/02/2027 22:00",
    audit: [
      { when: "09/02/2027 10:12", who: "Supply manager", action: "Submitted for approval", simulation: "Version 3", comment: "Second table revision of the crop" },
      { when: "10/02/2027 16:05", who: "Purchasing and finance managers", action: "Approved", simulation: "Version 3", comment: "-" },
      { when: "10/02/2027 16:20", who: "Supply manager", action: "Scheduled for 13/02/2027 22:00", simulation: "Version 3", comment: "Weekend window, no normal buying" },
    ],
  },
  {
    id: "REB-2026-001",
    crop: "2026",
    period: "01/10/2026 - 15/11/2026",
    periodFrom: "2026-10-01",
    periodTo: "2026-11-15",
    status: "COMPLETED",
    farmers: 1206,
    invoices: 3954,
    netRebuy: 2318440.0,
    processed: 2318440.0,
    debtCollection: 804210.0,
    selfFunding: 201350.0,
    farmerPayment: 1278103.4,
    scheduledFor: "21/11/2026 23:00",
    audit: [
      { when: "18/11/2026 09:40", who: "Supply manager", action: "Submitted for approval", simulation: "Version 2", comment: "First table revision of the crop" },
      { when: "19/11/2026 14:15", who: "Purchasing and finance managers", action: "Approved", simulation: "Version 2", comment: "Approved as simulated" },
      { when: "21/11/2026 23:00", who: "System", action: "Completed execution", simulation: "Version 2", comment: "All 3,954 invoices processed" },
    ],
  },
  {
    id: "REB-2026-003",
    crop: "2026",
    period: "01/10/2026 - 15/02/2027",
    periodFrom: "2026-10-01",
    periodTo: "2027-02-15",
    status: "IN PREPARATION",
    farmers: null,
    invoices: null,
    netRebuy: null,
    processed: null,
    debtCollection: null,
    selfFunding: null,
    farmerPayment: null,
    scheduledFor: "-",
    audit: [
      { when: "15/02/2027 08:30", who: "Finance Analyst", action: "Created in preparation", simulation: "Draft", comment: "Parameters configured for third table revision" },
    ],
  },
]

type BreakdownRow = {
  label: string
  farmers: number
  kilos: number
  tobaccoValue: number
  creditToGenerate: number
  debtBalance: number
  debtPaid: number
  selfFunding: number
  rpOpportunity: number
}

const BY_UNIT_ROWS: BreakdownRow[] = [
  { label: "Unit 03", farmers: 742, kilos: 6021300, tobaccoValue: 107912400.0, creditToGenerate: 690721.4, debtBalance: 2104560.0, debtPaid: 248610.0, selfFunding: 196250.0, rpOpportunity: 245861.4 },
  { label: "Unit 07", farmers: 615, kilos: 5013950, tobaccoValue: 89950210.0, creditToGenerate: 575151.35, debtBalance: 1688930.0, debtPaid: 205340.0, selfFunding: 162800.0, rpOpportunity: 207011.35 },
  { label: "Unit 12", farmers: 485, kilos: 3945200, tobaccoValue: 70558740.0, creditToGenerate: 448687.2, debtBalance: 1372415.0, debtPaid: 158480.0, selfFunding: 127700.0, rpOpportunity: 162507.2 },
]

const BY_TOBACCO_ROWS: BreakdownRow[] = [
  { label: "Virginia", farmers: 1290, kilos: 10640120, tobaccoValue: 191820400.0, creditToGenerate: 1228410.5, debtBalance: 3680120.0, debtPaid: 438900.0, selfFunding: 348200.0, rpOpportunity: 441310.5 },
  { label: "Burley", farmers: 432, kilos: 3420180, tobaccoValue: 60410550.0, creditToGenerate: 384209.45, debtBalance: 1145785.0, debtPaid: 134530.0, selfFunding: 108550.0, rpOpportunity: 141129.45 },
  { label: "Oriental", farmers: 120, kilos: 920150, tobaccoValue: 16190400.0, creditToGenerate: 101940.0, debtBalance: 340000.0, debtPaid: 39000.0, selfFunding: 30000.0, rpOpportunity: 32940.0 },
]

type ValidationErrorRow = {
  id: string
  farmer: string
  invoice: string
  error: "Registration" | "Bank account" | "Register" | "Value"
  description: string
  checkedAgainst: string
  action: string
  status: "Excluded" | "Seen"
}

const VALIDATION_ERRORS: ValidationErrorRow[] = [
  { id: "ve1", farmer: "Farmer 00052211", invoice: "771530", error: "Registration", description: "No state registration", checkedAgainst: "Farmer register", action: "Register in Growing", status: "Excluded" },
  { id: "ve2", farmer: "Farmer 00052240", invoice: "771602", error: "Bank account", description: "No account for the credit", checkedAgainst: "Farmer register", action: "Add the account", status: "Excluded" },
  { id: "ve3", farmer: "Farmer 00052263", invoice: "771655", error: "Register", description: "State registration suspended on the register", checkedAgainst: "Farmer register", action: "Update the register", status: "Excluded" },
  { id: "ve4", farmer: "Farmer 00052279", invoice: "771702", error: "Register", description: "Municipality differs from the plot", checkedAgainst: "Plot of the contract", action: "Update the register", status: "Excluded" },
  { id: "ve5", farmer: "Farmer 00052187", invoice: "770845", error: "Value", description: "B01 already above the new table", checkedAgainst: "Calculation", action: "-", status: "Seen" },
  { id: "ve6", farmer: "Farmer 00052305", invoice: "771811", error: "Value", description: "Rebuy above 100,000.00", checkedAgainst: "Calculation", action: "-", status: "Seen" },
]

type ExecExceptionRow = {
  id: string
  invoice: string
  farmer: string
  stage: string
  code: string
  description: string
  attempts: string
  status: "Rejected" | "Waiting its turn" | "Pending" | "Resubmitted"
  action: string
}

const EXEC_EXCEPTIONS: ExecExceptionRow[] = [
  { id: "ex1", invoice: "774902", farmer: "Farmer 00052118", stage: "2 Return", code: "233", description: "Rejected - registration not found", attempts: "1 of 3", status: "Rejected", action: "Correct, resubmit" },
  { id: "ex2", invoice: "774915", farmer: "Farmer 00052166", stage: "2 Return", code: "539", description: "Rejected - access key already used", attempts: "2 of 3", status: "Rejected", action: "Resubmit" },
  { id: "ex3", invoice: "775120", farmer: "Farmer 00052201", stage: "3 Analysis", code: "PA-07", description: "Purchase credit of 13/02 not analysed yet", attempts: "1 of 3", status: "Waiting its turn", action: "None, runs after it" },
  { id: "ex4", invoice: "775133", farmer: "Farmer 00052248", stage: "3 Analysis", code: "PA-02", description: "Bank account blocked", attempts: "1 of 3", status: "Pending", action: "Correct, resubmit" },
  { id: "ex5", invoice: "775144", farmer: "Farmer 00052261", stage: "2 Return", code: "233", description: "Rejected - state registration inactive", attempts: "1 of 3", status: "Rejected", action: "Correct, resubmit" },
  { id: "ex6", invoice: "775198", farmer: "Farmer 00052289", stage: "3 Analysis", code: "PA-02", description: "Bank branch verification pending", attempts: "1 of 3", status: "Pending", action: "Correct, resubmit" },
]

const th = "px-3.5 py-2.5 text-left text-[11.5px] font-700 uppercase tracking-[0.04em] text-muted"
const td = "px-3.5 py-3 text-[13px]"
const opts = (list: string[]) => list.map((v) => ({ value: v, label: v }))
const fmtMoney = (n: number | null) => (n === null ? "-" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const fmtInt = (n: number | null) => (n === null ? "-" : n.toLocaleString("en-US"))

function KpiCard({
  label,
  value,
  accent = "brand",
  onClick,
}: {
  label: string
  value: ReactNode
  accent?: "brand" | "green" | "red" | "amber"
  onClick?: () => void
}) {
  const borderCls = {
    brand: "border-l-4 border-l-brand",
    green: "border-l-4 border-l-[#1a7a45]",
    red: "border-l-4 border-l-[#c23b3b]",
    amber: "border-l-4 border-l-[#d99b26]",
  }[accent]
  const valueCls = {
    brand: "text-ink",
    green: "text-[#1a7a45]",
    red: "text-[#c23b3b]",
    amber: "text-[#9a6a12]",
  }[accent]
  return (
    <div onClick={onClick} className={onClick ? "cursor-pointer" : undefined}>
      <Card className={`p-4 ${borderCls} ${onClick ? "transition hover:border-brand-ring hover:shadow-sm" : ""}`}>
        <p className="text-[12px] font-600 text-muted">{label}</p>
        <p className={`mt-2 text-[22px] font-800 leading-none tabular-nums ${valueCls}`}>{value}</p>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: RebuyStatus }) {
  if (status === "IN EXECUTION") return <Badge tone="green">In execution</Badge>
  if (status === "COMPLETED") return <Badge tone="green">Completed</Badge>
  return <Badge tone="amber">In preparation</Badge>
}

export default function Rebuying({ onCrumbs }: { onCrumbs?: (c: RebuyCrumb[]) => void }) {
  const toast = useToast()
  const [cropFilter, setCropFilter] = useState("2026/2027")
  const [rebuys, setRebuys] = useState<RebuyRow[]>(INITIAL_REBUYS)
  const [selectedAuditId, setSelectedAuditId] = useState<string>("REB-2026-002")
  const [openRebuyId, setOpenRebuyId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<RebuyTab>("parameters")
  const [simView, setSimView] = useState<"results" | "errors">("results")

  const openRebuy = rebuys.find((r) => r.id === openRebuyId) ?? null

  useEffect(() => {
    if (!onCrumbs) return
    if (!openRebuy) {
      onCrumbs([{ label: "Rebuying" }])
    } else {
      const tabLabel = activeTab === "parameters" ? "Parameters" : activeTab === "simulation" ? "Simulation" : "Execution"
      onCrumbs([
        { label: "Rebuying", onClick: () => setOpenRebuyId(null) },
        { label: openRebuy.id },
        { label: tabLabel },
      ])
    }
  }, [openRebuy, activeTab, onCrumbs])

  useEffect(() => () => onCrumbs?.([]), [onCrumbs])

  const enterRebuy = (r: RebuyRow, tab?: RebuyTab) => {
    setSelectedAuditId(r.id)
    setOpenRebuyId(r.id)
    if (tab) {
      setActiveTab(tab)
    } else if (r.status === "IN PREPARATION") {
      setActiveTab("parameters")
    } else if (r.status === "IN EXECUTION") {
      setActiveTab("execution")
    } else {
      setActiveTab("simulation")
    }
  }

  const createNewRebuy = () => {
    const nextNum = rebuys.length + 1
    const id = `REB-2026-00${nextNum}`
    const created: RebuyRow = {
      id,
      crop: "2026",
      period: "01/10/2026 - 15/02/2027",
      periodFrom: "2026-10-01",
      periodTo: "2027-02-15",
      status: "IN PREPARATION",
      farmers: null,
      invoices: null,
      netRebuy: null,
      processed: null,
      debtCollection: null,
      selfFunding: null,
      farmerPayment: null,
      scheduledFor: "-",
      audit: [
        { when: "15/02/2027 09:00", who: "Finance Analyst", action: "Created in preparation", simulation: "Draft", comment: "Initial parameters draft" },
      ],
    }
    setRebuys((prev) => [created, ...prev])
    setSelectedAuditId(id)
    setOpenRebuyId(id)
    setActiveTab("parameters")
    toast({ tone: "success", title: `${id} created`, body: "Configure scope and rules to run a simulation." })
  }

  if (openRebuy) {
    return (
      <RebuyWorkspace
        rebuy={openRebuy}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        simView={simView}
        onSimViewChange={setSimView}
        onBack={() => setOpenRebuyId(null)}
        onUpdateRebuy={(updater) =>
          setRebuys((all) => all.map((item) => (item.id === openRebuy.id ? updater(item) : item)))
        }
      />
    )
  }

  const auditTarget = rebuys.find((r) => r.id === selectedAuditId) ?? rebuys[0]
  const inExecutionCount = rebuys.filter((r) => r.status === "IN EXECUTION").length
  const totalPaid = rebuys.reduce((sum, r) => sum + (r.processed ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-800 text-ink">Rebuy</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-44">
            <Select value={cropFilter} onChange={setCropFilter} options={opts(["2026/2027", "2025/2026"])} />
          </div>
          <Button
            variant="outline"
            onClick={() => toast({ tone: "success", title: "Export started", body: `Rebuys of Crop ${cropFilter} exported to Excel.` })}
          >
            <FileText size={15} /> Export to Excel
          </Button>
          <Button onClick={createNewRebuy}>
            <Plus size={16} /> New
          </Button>
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Rebuys this crop" value={rebuys.length} accent="brand" />
        <KpiCard label="In execution" value={inExecutionCount} accent="green" />
        <KpiCard label="Paid this crop" value={fmtMoney(totalPaid)} accent="brand" />
        <KpiCard
          label="Open exceptions"
          value={41}
          accent="red"
          onClick={() => {
            const execRow = rebuys.find((r) => r.status === "IN EXECUTION") ?? rebuys[0]
            enterRebuy(execRow, "execution")
          }}
        />
        <KpiCard label="Awaiting approval" value={0} accent="amber" />
      </div>

      {/* Rebuys Table */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <p className="text-[14px] font-800 text-ink">Rebuys of Crop {cropFilter}</p>
          <span className="text-[12.5px] text-muted">Select a row to inspect its approval trail, or click the Rebuy ID to open it</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1220px] text-left text-[13px]">
            <thead className="bg-canvas">
              <tr>
                <th className={`${th} w-10`} />
                <th className={th}>Crop</th>
                <th className={th}>Rebuy</th>
                <th className={th}>Period</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Farmers</th>
                <th className={`${th} text-right`}>Invoices</th>
                <th className={`${th} text-right`}>Net rebuy</th>
                <th className={`${th} text-right`}>Processed</th>
                <th className={`${th} text-right`}>Debt Collection</th>
                <th className={`${th} text-right`}>Self Funding</th>
                <th className={`${th} text-right`}>Farmer Payment</th>
                <th className={th}>Scheduled for</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rebuys.map((r) => {
                const on = r.id === auditTarget?.id
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedAuditId(r.id)}
                    className={`cursor-pointer border-t border-line transition ${on ? "bg-brand-soft/30" : "hover:bg-canvas/60"}`}
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
                    <td className={`${td} tabular-nums`}>{r.crop}</td>
                    <td className={td} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => enterRebuy(r)}
                        className="font-800 text-brand hover:underline"
                      >
                        {r.id}
                      </button>
                    </td>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>{r.period}</td>
                    <td className={td}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{fmtInt(r.farmers)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtInt(r.invoices)}</td>
                    <td className={`${td} text-right font-700 tabular-nums text-ink`}>{fmtMoney(r.netRebuy)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(r.processed)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(r.debtCollection)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(r.selfFunding)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(r.farmerPayment)}</td>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>{r.scheduledFor}</td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title={`Open ${r.id}`}
                        aria-label={`Open ${r.id}`}
                        onClick={() => enterRebuy(r)}
                        className="inline-grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Approval and Audit Trail */}
      {auditTarget && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <p className="text-[14px] font-800 text-ink">Approval and audit trail · {auditTarget.id}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead className="bg-canvas">
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>Who</th>
                  <th className={th}>Action</th>
                  <th className={th}>Simulation</th>
                  <th className={th}>Comment</th>
                </tr>
              </thead>
              <tbody>
                {auditTarget.audit.map((a, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className={`${td} whitespace-nowrap tabular-nums text-muted`}>{a.when}</td>
                    <td className={`${td} font-600 text-ink`}>{a.who}</td>
                    <td className={td}>{a.action}</td>
                    <td className={td}>{a.simulation}</td>
                    <td className={`${td} text-ink-soft`}>{a.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Rebuy Detail Workspace (Parameters / Simulation / Execution)        */
/* ------------------------------------------------------------------ */

function RebuyWorkspace({
  rebuy,
  activeTab,
  onTabChange,
  simView,
  onSimViewChange,
  onBack,
  onUpdateRebuy,
}: {
  rebuy: RebuyRow
  activeTab: RebuyTab
  onTabChange: (t: RebuyTab) => void
  simView: "results" | "errors"
  onSimViewChange: (v: "results" | "errors") => void
  onBack: () => void
  onUpdateRebuy: (fn: (r: RebuyRow) => RebuyRow) => void
}) {
  const toast = useToast()

  // Parameters state
  const [params, setParams] = useState({
    crop: "2026/2027",
    periodFrom: rebuy.periodFrom,
    periodTo: rebuy.periodTo,
    units: ["Unit 03", "Unit 07", "Unit 12"],
    states: ["RS", "SC", "PR"],
    gts: ["GT 01", "GT 02", "GT 04", "GT 07"],
    area: "All",
    tobaccoType: "All",
    valueFrom: "5.00",
    valueTo: "100,000.00",
    priority: "Highest value first",
    complementary: "Yes",
    includeOnStatement: "Yes",
    paymentAnalysis: "Yes",
    autoBlockGts: ["GT 04", "GT 07"],
    batchSize: "250 invoices",
    waitBetweenStages: "2 minutes",
    saveEvery: "1 minute",
  })

  // Simulation state
  const [breakdownMode, setBreakdownMode] = useState<"unit" | "type">("unit")
  const [errorFilter, setErrorFilter] = useState("All")
  const [errors, setErrors] = useState<ValidationErrorRow[]>(VALIDATION_ERRORS)
  const [pickedErrors, setPickedErrors] = useState<string[]>(["ve1", "ve2", "ve3", "ve4"])
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitForm, setSubmitForm] = useState({ schedule: "13/02/2027 22:00", comment: "Second table revision of the crop" })
  const [reportModal, setReportModal] = useState<"farmer" | "invoice" | null>(null)

  // Execution state
  const [paused, setPaused] = useState(false)
  const [showAllExceptions, setShowAllExceptions] = useState(false)
  const [exceptions, setExceptions] = useState<ExecExceptionRow[]>(EXEC_EXCEPTIONS)
  const [pickedEx, setPickedEx] = useState<string[]>(["ex1", "ex2", "ex4"])
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  const topBadge = () => {
    if (activeTab === "parameters") return <StatusBadge status={rebuy.status} />
    if (activeTab === "simulation") {
      return simView === "errors" ? (
        <Badge tone="red">37 Blocking</Badge>
      ) : (
        <Badge tone="green">Simulation completed</Badge>
      )
    }
    return paused ? <Badge tone="amber">Paused</Badge> : <Badge tone="green">In execution</Badge>
  }

  return (
    <div className="space-y-5">
      {/* Workspace Header & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[20px] font-800 text-ink">{rebuy.id}</p>
          {topBadge()}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl border border-line bg-white p-1">
            {(
              [
                ["parameters", "Parameters"],
                ["simulation", "Simulation"],
                ["execution", "Execution"],
              ] as [RebuyTab, string][]
            ).map(([key, label]) => {
              const on = activeTab === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onTabChange(key)}
                  className={`rounded-lg px-4 py-1.5 text-[13px] font-700 transition ${
                    on ? "bg-brand text-white shadow-xs" : "text-ink-soft hover:bg-canvas hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft size={16} /> Back
          </Button>
        </div>
      </div>

      {/* TAB 1: PARAMETERS */}
      {activeTab === "parameters" && (
        <div className="space-y-5">
          <Card className="p-5">
            <p className="mb-4 border-b border-line pb-2.5 text-[12px] font-800 uppercase tracking-[0.04em] text-ink">Scope</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <Field label="Crop">
                <Select value={params.crop} onChange={(v) => setParams({ ...params, crop: v })} options={opts(["2026/2027", "2025/2026"])} />
              </Field>
              <Field label="Period from">
                <DatePicker value={params.periodFrom} onChange={(v) => setParams({ ...params, periodFrom: v })} />
              </Field>
              <Field label="Period to">
                <DatePicker value={params.periodTo} onChange={(v) => setParams({ ...params, periodTo: v })} />
              </Field>
              <Field label="Buying units">
                <MultiSelect
                  values={params.units}
                  onChange={(v) => setParams({ ...params, units: v })}
                  options={opts(["Unit 01", "Unit 03", "Unit 05", "Unit 07", "Unit 12"])}
                />
              </Field>
              <Field label="States of origin">
                <MultiSelect
                  values={params.states}
                  onChange={(v) => setParams({ ...params, states: v })}
                  options={opts(["RS", "SC", "PR"])}
                />
              </Field>
              <Field label="GTs">
                <MultiSelect
                  values={params.gts}
                  onChange={(v) => setParams({ ...params, gts: v })}
                  options={opts(["GT 01", "GT 02", "GT 04", "GT 07"])}
                  allLabel="All"
                />
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Area">
                <Select value={params.area} onChange={(v) => setParams({ ...params, area: v })} options={opts(["All", "Area 410", "Area 430", "Area 450"])} />
              </Field>
              <Field label="Tobacco Type">
                <Select value={params.tobaccoType} onChange={(v) => setParams({ ...params, tobaccoType: v })} options={opts(["All", "Virginia", "Burley", "Oriental"])} />
              </Field>
              <Field label="Value from">
                <Input value={params.valueFrom} onChange={(e) => setParams({ ...params, valueFrom: e.target.value })} />
              </Field>
              <Field label="Value to">
                <Input value={params.valueTo} onChange={(e) => setParams({ ...params, valueTo: e.target.value })} />
              </Field>
              <Field label="Priority">
                <Select
                  value={params.priority}
                  onChange={(v) => setParams({ ...params, priority: v })}
                  options={opts(["Highest value first", "Lowest value first", "Oldest invoice first"])}
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <p className="mb-4 border-b border-line pb-2.5 text-[12px] font-800 uppercase tracking-[0.04em] text-ink">Financial rules</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Consider complementary invoice">
                <Select value={params.complementary} onChange={(v) => setParams({ ...params, complementary: v })} options={opts(["Yes", "No"])} />
              </Field>
              <Field label="Include Rebuy credit on the statement">
                <Select value={params.includeOnStatement} onChange={(v) => setParams({ ...params, includeOnStatement: v })} options={opts(["Yes", "No"])} />
              </Field>
              <Field label="Payment analysis">
                <Input value={params.paymentAnalysis} disabled />
              </Field>
              <Field label="Auto-block remaining credit">
                <MultiSelect
                  values={params.autoBlockGts}
                  onChange={(v) => setParams({ ...params, autoBlockGts: v })}
                  options={opts(["GT 01", "GT 02", "GT 04", "GT 07"])}
                />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <p className="mb-4 border-b border-line pb-2.5 text-[12px] font-800 uppercase tracking-[0.04em] text-ink">Processing</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:max-w-[760px]">
              <Field label="Batch size">
                <Select
                  value={params.batchSize}
                  onChange={(v) => setParams({ ...params, batchSize: v })}
                  options={opts(["100 invoices", "250 invoices", "500 invoices", "1,000 invoices"])}
                />
              </Field>
              <Field label="Wait between stages">
                <Select
                  value={params.waitBetweenStages}
                  onChange={(v) => setParams({ ...params, waitBetweenStages: v })}
                  options={opts(["1 minute", "2 minutes", "5 minutes", "10 minutes"])}
                />
              </Field>
              <Field label="Save every">
                <Input value={params.saveEvery} onChange={(e) => setParams({ ...params, saveEvery: e.target.value })} />
              </Field>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                onUpdateRebuy((r) => ({
                  ...r,
                  farmers: 1842,
                  invoices: 5791,
                  netRebuy: 1740670.0,
                }))
                onSimViewChange("results")
                onTabChange("simulation")
                toast({ tone: "success", title: "Simulation completed", body: `${rebuy.id} v3 calculated for 1,842 farmers.` })
              }}
            >
              <Play size={15} /> Run simulation
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onSimViewChange("results")
                onTabChange("simulation")
                toast({ tone: "success", title: "Last run loaded", body: `Loaded ${rebuy.id} v3 (09/02/2027 10:04).` })
              }}
            >
              <RotateCcw size={15} /> Load the last run
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: SIMULATION */}
      {activeTab === "simulation" && (
        <div className="space-y-5">
          {/* Simulation Metadata Strip */}
          <Card className="px-5 py-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
              <div>
                <p className="text-[11.5px] font-600 text-muted">Simulation</p>
                <p className="mt-1 text-[13.5px] font-800 text-ink">{rebuy.id} v3</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Run</p>
                <p className="mt-1 text-[13.5px] font-800 tabular-nums text-ink">09/02/2027 10:04</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">By</p>
                <p className="mt-1 text-[13.5px] font-800 text-ink">Finance Analyst</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Period</p>
                <p className="mt-1 text-[13.5px] font-800 tabular-nums text-ink">{rebuy.period}</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">
                  {simView === "errors" ? "Overprice and complementary" : "Complementary invoices"}
                </p>
                <p className="mt-1 text-[13.5px] font-800 text-[#5b3fa8]">
                  {params.complementary === "Yes" ? "Considered" : "Not considered"}
                </p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">RP credits</p>
                <p className="mt-1 text-[13.5px] font-800 text-ink">Not used</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Excluded</p>
                <p className="mt-1 text-[13.5px] font-800 text-ink">37 invoices</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Status</p>
                <p className="mt-1 text-[13.5px] font-800 text-[#1a7a45]">Completed</p>
              </div>
            </div>
          </Card>

          {/* View Switcher: Results vs Validation Errors */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[11.5px] font-700 uppercase tracking-[0.05em] text-muted">View</span>
              <div className="inline-flex rounded-xl border border-line bg-white p-1">
                <button
                  type="button"
                  onClick={() => onSimViewChange("results")}
                  className={`rounded-lg px-4 py-1.5 text-[13px] font-700 transition ${
                    simView === "results" ? "bg-[#12326b] text-white" : "text-ink-soft hover:bg-canvas hover:text-ink"
                  }`}
                >
                  Results
                </button>
                <button
                  type="button"
                  onClick={() => onSimViewChange("errors")}
                  className={`rounded-lg px-4 py-1.5 text-[13px] font-700 transition ${
                    simView === "errors" ? "bg-[#12326b] text-white" : "text-ink-soft hover:bg-canvas hover:text-ink"
                  }`}
                >
                  Validation Errors
                </button>
              </div>
            </div>
          </div>

          {simView === "results" ? (
            <>
              {/* 6 Simulation KPI Cards */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-6">
                <KpiCard label="Farmers" value="1,842" accent="brand" />
                <KpiCard label="Invoices in the period" value="6,240" accent="brand" />
                <KpiCard label="Kilos" value="14,980,450" accent="brand" />
                <KpiCard label="Invoices to generate" value="6,203" accent="green" />
                <KpiCard label="Validation errors" value="37" accent="red" onClick={() => onSimViewChange("errors")} />
                <KpiCard label="Net rebuy" value="1,740,670.00" accent="green" />
              </div>

              {/* Split: Values of the Run + Buying Units / Tobacco Type Breakdown */}
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                {/* Values of the Run */}
                <Card className="p-5 xl:col-span-4">
                  <p className="mb-4 border-b border-line pb-2.5 text-[13px] font-800 uppercase tracking-[0.04em] text-ink">
                    Values of the run
                  </p>
                  <dl className="space-y-3 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">Original value of the invoices</dt>
                      <dd className="font-700 tabular-nums text-ink">268,421,350.00</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">Returned or cancelled, not listed (58 invoices)</dt>
                      <dd className="font-700 tabular-nums text-muted">-</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">At the new table</dt>
                      <dd className="font-700 tabular-nums text-ink">276,512,880.00</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">Rebuys already paid</dt>
                      <dd className="font-700 tabular-nums text-ink">- 5,108,240.00</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">Complementary invoices, net of zero or negative (412)</dt>
                      <dd className="font-700 tabular-nums text-[#5b3fa8]">- 1,232,780.00</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">Excluded by validation errors (37 invoices)</dt>
                      <dd className="font-700 tabular-nums text-ink">- 9,840.00</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                      <dt className="font-800 text-[#12326b]">Net rebuy</dt>
                      <dd className="font-800 tabular-nums text-[#12326b]">1,740,670.00</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-ink-soft">Funrural, estimate</dt>
                      <dd className="font-700 tabular-nums text-ink">- 26,110.05</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                      <dt className="font-800 text-[#12326b]">Credit to Generate</dt>
                      <dd className="font-800 tabular-nums text-[#12326b]">1,714,559.95</dd>
                    </div>
                  </dl>
                </Card>

                {/* Breakdown by Unit / Tobacco Type */}
                <Card className="flex flex-col justify-between p-5 xl:col-span-8">
                  <div>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2.5">
                      <p className="text-[13px] font-800 uppercase tracking-[0.04em] text-ink">
                        Crop {params.crop} &gt; {breakdownMode === "unit" ? "Buying units" : "Tobacco types"}
                      </p>
                      <div className="inline-flex rounded-xl border border-line bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setBreakdownMode("unit")}
                          className={`rounded-lg px-3.5 py-1 text-[12.5px] font-700 transition ${
                            breakdownMode === "unit" ? "bg-[#12326b] text-white" : "text-ink-soft hover:bg-canvas"
                          }`}
                        >
                          By unit
                        </button>
                        <button
                          type="button"
                          onClick={() => setBreakdownMode("type")}
                          className={`rounded-lg px-3.5 py-1 text-[12.5px] font-700 transition ${
                            breakdownMode === "type" ? "bg-[#12326b] text-white" : "text-ink-soft hover:bg-canvas"
                          }`}
                        >
                          By tobacco type
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-line">
                      <table className="w-full min-w-[820px] text-left text-[13px]">
                        <thead className="bg-canvas">
                          <tr>
                            <th className={th}>{breakdownMode === "unit" ? "Unit" : "Tobacco type"}</th>
                            <th className={`${th} text-right`}>Farmers</th>
                            <th className={`${th} text-right`}>Kilos</th>
                            <th className={`${th} text-right`}>Value of the tobacco</th>
                            <th className={`${th} text-right`}>Credit to generate</th>
                            <th className={`${th} text-right`}>Debt balance</th>
                            <th className={`${th} text-right`}>Debt paid</th>
                            <th className={`${th} text-right`}>Self funding</th>
                            <th className={`${th} text-right`}>RP opportunity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(breakdownMode === "unit" ? BY_UNIT_ROWS : BY_TOBACCO_ROWS).map((row) => (
                            <tr key={row.label} className="border-t border-line">
                              <td className={`${td} font-700 text-ink`}>{row.label}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmtInt(row.farmers)}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmtInt(row.kilos)}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmtMoney(row.tobaccoValue)}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmtMoney(row.creditToGenerate)}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmtMoney(row.debtBalance)}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmtMoney(row.debtPaid)}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmtMoney(row.selfFunding)}</td>
                              <td className={`${td} text-right tabular-nums`}>{fmtMoney(row.rpOpportunity)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-canvas font-800 text-ink">
                          <tr className="border-t border-line">
                            <td className={td}>Crop</td>
                            <td className={`${td} text-right tabular-nums`}>1,842</td>
                            <td className={`${td} text-right tabular-nums`}>14,980,450</td>
                            <td className={`${td} text-right tabular-nums`}>268,421,350.00</td>
                            <td className={`${td} text-right tabular-nums`}>1,714,559.95</td>
                            <td className={`${td} text-right tabular-nums`}>5,165,905.00</td>
                            <td className={`${td} text-right tabular-nums`}>612,430.00</td>
                            <td className={`${td} text-right tabular-nums`}>486,750.00</td>
                            <td className={`${td} text-right tabular-nums`}>615,379.95</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Button
                      variant="outline"
                      onClick={() => toast({ tone: "success", title: "Export started", body: `Simulation ${rebuy.id} v3 exported to Excel.` })}
                    >
                      <FileText size={15} /> Export to Excel
                    </Button>
                    <Button variant="outline" onClick={() => setReportModal("farmer")}>
                      <FileText size={15} /> Report per farmer
                    </Button>
                    <Button variant="outline" onClick={() => setReportModal("invoice")}>
                      <FileText size={15} /> Report per invoice
                    </Button>
                    <Button onClick={() => setSubmitOpen(true)}>
                      <Send size={15} /> Submit for approval
                    </Button>
                  </div>
                </Card>
              </div>
            </>
          ) : (
            /* VALIDATION ERRORS SUBVIEW */
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="grid flex-1 grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard label="Excluded from the run" value={errors.filter((e) => e.status === "Excluded").length + 33} accent="brand" />
                  <KpiCard label="No state registration" value={12} accent="red" />
                  <KpiCard label="No bank account" value={19} accent="red" />
                  <KpiCard label="Register" value={6} accent="red" />
                </div>
                <Button
                  variant="outline"
                  onClick={() => toast({ tone: "success", title: "Validation errors exported", body: "37 validation errors exported to Excel." })}
                >
                  <FileText size={15} /> Export to Excel
                </Button>
              </div>

              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                  <p className="text-[14px] font-800 text-ink">Validation errors</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-600 text-muted">Filter</span>
                    <div className="w-44">
                      <Select
                        value={errorFilter}
                        onChange={setErrorFilter}
                        options={opts(["All", "Registration", "Bank account", "Register", "Value"])}
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-[13px]">
                    <thead className="bg-canvas">
                      <tr>
                        <th className={`${th} w-10`}>
                          <Checkbox
                            checked={pickedErrors.length === errors.length && errors.length > 0}
                            onChange={(v) => setPickedErrors(v ? errors.map((e) => e.id) : [])}
                          />
                        </th>
                        <th className={th}>Farmer</th>
                        <th className={th}>Invoice</th>
                        <th className={th}>Error</th>
                        <th className={th}>Description</th>
                        <th className={th}>Checked against</th>
                        <th className={th}>Action</th>
                        <th className={th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors
                        .filter((e) => errorFilter === "All" || e.error === errorFilter)
                        .map((e) => {
                          const checked = pickedErrors.includes(e.id)
                          return (
                            <tr
                              key={e.id}
                              onClick={() =>
                                setPickedErrors((all) => (checked ? all.filter((x) => x !== e.id) : [...all, e.id]))
                              }
                              className={`cursor-pointer border-t border-line transition ${
                                checked ? "bg-brand-soft/30" : "hover:bg-canvas/60"
                              }`}
                            >
                              <td className={td} onClick={(ev) => ev.stopPropagation()}>
                                <Checkbox
                                  checked={checked}
                                  onChange={() =>
                                    setPickedErrors((all) => (checked ? all.filter((x) => x !== e.id) : [...all, e.id]))
                                  }
                                />
                              </td>
                              <td className={`${td} font-600 text-ink`}>{e.farmer}</td>
                              <td className={`${td} tabular-nums`}>{e.invoice}</td>
                              <td className={`${td} font-700 text-ink`}>{e.error}</td>
                              <td className={td}>{e.description}</td>
                              <td className={td}>{e.checkedAgainst}</td>
                              <td className={td}>{e.action}</td>
                              <td className={td}>
                                {e.status === "Seen" ? (
                                  <span className="font-700 text-[#1a7a45]">Seen</span>
                                ) : (
                                  <span className="font-600 text-ink-soft">Excluded</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-line px-5 py-3.5">
                  <Button
                    disabled={pickedErrors.length === 0}
                    onClick={() => {
                      setErrors((all) =>
                        all.map((item) => (pickedErrors.includes(item.id) ? { ...item, status: "Seen" } : item)),
                      )
                      toast({
                        tone: "success",
                        title: "Validation re-checked",
                        body: `${pickedErrors.length} selected invoice${pickedErrors.length === 1 ? "" : "s"} verified against current registers.`,
                      })
                    }}
                  >
                    <RotateCcw size={15} /> Check again
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EXECUTION */}
      {activeTab === "execution" && (
        <div className="space-y-5">
          {/* Execution Metadata Strip */}
          <Card className="px-5 py-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-9">
              <div>
                <p className="text-[11.5px] font-600 text-muted">Rebuy</p>
                <p className="mt-1 text-[13.5px] font-800 text-ink">{rebuy.id}</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Started</p>
                <p className="mt-1 text-[13.5px] font-800 tabular-nums text-ink">13/02/2027 22:00</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Last update</p>
                <p className="mt-1 text-[13.5px] font-800 tabular-nums text-ink">14/02/2027 03:41</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Stage</p>
                <p className="mt-1 text-[13.5px] font-800 text-ink">3 of 3</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Batch</p>
                <p className="mt-1 text-[13.5px] font-800 text-ink">22 of 24</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Last save point</p>
                <p className="mt-1 text-[13.5px] font-800 text-ink">03:40, invoice 5,500</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Forecast</p>
                <p className="mt-1 text-[13.5px] font-800 tabular-nums text-ink">1,740,670.00</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Processed</p>
                <p className="mt-1 text-[13.5px] font-800 tabular-nums text-ink">1,725,610.00</p>
              </div>
              <div>
                <p className="text-[11.5px] font-600 text-muted">Status</p>
                <p className={`mt-1 text-[13.5px] font-800 ${paused ? "text-[#9a6a12]" : "text-[#1a7a45]"}`}>
                  {paused ? "Paused" : "In execution"}
                </p>
              </div>
            </div>
          </Card>

          {/* 3 Stage Progress Cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="p-4">
              <p className="text-[11.5px] font-800 uppercase tracking-[0.04em] text-[#12326b]">Stage 1 · Generate and send</p>
              <p className="mt-1.5 text-[13px] font-700 text-ink">5,791 of 5,791 generated and sent · Finished 23:52</p>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-canvas">
                <div className="h-full w-full rounded-full bg-[#1a7a45]" />
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-[11.5px] font-800 uppercase tracking-[0.04em] text-[#12326b]">Stage 2 · Return and credits</p>
              <p className="mt-1.5 text-[13px] font-700 text-ink">5,771 authorised, 20 rejected · 5,771 credits raised</p>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-canvas">
                <div className="h-full w-full rounded-full bg-[#1a7a45]" />
              </div>
            </Card>
            <Card className="p-4">
              <p className="text-[11.5px] font-800 uppercase tracking-[0.04em] text-[#12326b]">Stage 3 · Payment analysis</p>
              <p className="mt-1.5 text-[13px] font-700 text-ink">5,750 analysed, 21 pending</p>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-canvas">
                <div className="h-full w-[96%] rounded-full bg-[#b88714]" />
              </div>
            </Card>
          </div>

          {/* Invoices by Step */}
          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-3.5">
              <p className="text-[14px] font-800 text-ink">Invoices by step</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-center text-[13px]">
                <thead className="bg-canvas">
                  <tr>
                    {[
                      "Selected",
                      "Generated",
                      "Sent to the authority",
                      "Authorised",
                      "Rejected",
                      "Sent to SAP",
                      "Booked in SAP",
                      "Analysed",
                      "Pending",
                    ].map((h) => (
                      <th key={h} className={`${th} text-center`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-line font-700 tabular-nums">
                    <td className={td}>5,791</td>
                    <td className={td}>5,791</td>
                    <td className={td}>5,791</td>
                    <td className={td}>5,771</td>
                    <td className={`${td} bg-[#fdecec] font-800 text-[#c23b3b]`}>20</td>
                    <td className={td}>5,771</td>
                    <td className={`${td} bg-[#fff6e0] font-800 text-[#9a6a12]`}>4,271</td>
                    <td className={td}>5,750</td>
                    <td className={`${td} bg-[#fdecec] font-800 text-[#c23b3b]`}>41</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Exceptions Table */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
              <p className="text-[14px] font-800 text-ink">Exceptions</p>
              <button
                type="button"
                onClick={() => setShowAllExceptions((v) => !v)}
                className="text-[12.5px] font-700 text-brand hover:underline"
              >
                {showAllExceptions ? "Show fewer" : "Show all 41"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-[13px]">
                <thead className="bg-canvas">
                  <tr>
                    <th className={`${th} w-10`}>
                      <Checkbox
                        checked={pickedEx.length === exceptions.length && exceptions.length > 0}
                        onChange={(v) => setPickedEx(v ? exceptions.map((e) => e.id) : [])}
                      />
                    </th>
                    <th className={th}>Invoice</th>
                    <th className={th}>Farmer</th>
                    <th className={th}>Stage</th>
                    <th className={th}>Code</th>
                    <th className={th}>Description</th>
                    <th className={th}>Attempts</th>
                    <th className={th}>Status</th>
                    <th className={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllExceptions ? exceptions : exceptions.slice(0, 4)).map((ex) => {
                    const checked = pickedEx.includes(ex.id)
                    return (
                      <tr
                        key={ex.id}
                        onClick={() => setPickedEx((all) => (checked ? all.filter((x) => x !== ex.id) : [...all, ex.id]))}
                        className={`cursor-pointer border-t border-line transition ${
                          checked ? "bg-brand-soft/30" : "hover:bg-canvas/60"
                        }`}
                      >
                        <td className={td} onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={checked}
                            onChange={() =>
                              setPickedEx((all) => (checked ? all.filter((x) => x !== ex.id) : [...all, ex.id]))
                            }
                          />
                        </td>
                        <td className={`${td} font-700 tabular-nums text-ink`}>{ex.invoice}</td>
                        <td className={td}>{ex.farmer}</td>
                        <td className={td}>{ex.stage}</td>
                        <td className={`${td} font-700 tabular-nums text-ink`}>{ex.code}</td>
                        <td className={td}>{ex.description}</td>
                        <td className={`${td} tabular-nums`}>{ex.attempts}</td>
                        <td className={td}>
                          {ex.status === "Rejected" && <Badge tone="red">Rejected</Badge>}
                          {ex.status === "Pending" && <Badge tone="red">Pending</Badge>}
                          {ex.status === "Waiting its turn" && <Badge tone="amber">Waiting its turn</Badge>}
                          {ex.status === "Resubmitted" && <Badge tone="green">Resubmitted</Badge>}
                        </td>
                        <td className={td}>{ex.action}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Execution Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  disabled={pickedEx.length === 0}
                  onClick={() => {
                    setExceptions((all) =>
                      all.map((e) => (pickedEx.includes(e.id) ? { ...e, status: "Resubmitted", attempts: "2 of 3" } : e)),
                    )
                    toast({
                      tone: "success",
                      title: "Resubmitted",
                      body: `${pickedEx.length} exception${pickedEx.length === 1 ? "" : "s"} queued for resubmission.`,
                    })
                    setPickedEx([])
                  }}
                >
                  <RotateCcw size={15} /> Resubmit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaused((p) => !p)
                    toast({
                      tone: "success",
                      title: paused ? "Execution resumed" : "Execution paused",
                      body: `${rebuy.id} ${paused ? "resumed from batch 22 of 24." : "paused at save point 03:40."}`,
                    })
                  }}
                >
                  {paused ? "Resume" : "Pause"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast({ tone: "success", title: "Final report generated", body: `Summary report for ${rebuy.id} downloaded.` })}
                >
                  <FileText size={15} /> Final report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast({ tone: "success", title: "Sent by e-mail", body: `Execution status and statements queued for distribution.` })}
                >
                  <Send size={15} /> Send to email
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast({ tone: "success", title: "Export started", body: `Exceptions of ${rebuy.id} exported to Excel.` })}
                >
                  <FileText size={15} /> Export to Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast({ tone: "success", title: "Print job queued", body: `Rebuy invoices sent to unit printers.` })}
                >
                  <Printer size={15} /> Print invoices
                </Button>
              </div>
              <Button
                variant="outline"
                className="border-[#f4c9c9] text-[#c23b3b] hover:bg-[#fdecec]"
                onClick={() => setCancelOpen(true)}
              >
                Cancel run
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Submit for Approval Modal */}
      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title={`Submit ${rebuy.id} for approval`} width="max-w-md">
        <div className="space-y-4">
          <Field label="Scheduled execution window">
            <Input
              value={submitForm.schedule}
              onChange={(e) => setSubmitForm({ ...submitForm, schedule: e.target.value })}
              placeholder="DD/MM/YYYY HH:mm"
            />
          </Field>
          <Field label="Comment">
            <Input
              value={submitForm.comment}
              onChange={(e) => setSubmitForm({ ...submitForm, comment: e.target.value })}
              placeholder="Note for purchasing and finance managers"
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setSubmitOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!submitForm.schedule.trim()}
            onClick={() => {
              onUpdateRebuy((r) => ({
                ...r,
                scheduledFor: submitForm.schedule.trim(),
                audit: [
                  {
                    when: "09/02/2027 10:12",
                    who: "Supply manager",
                    action: "Submitted for approval",
                    simulation: "Version 3",
                    comment: submitForm.comment.trim() || "-",
                  },
                  ...r.audit,
                ],
              }))
              setSubmitOpen(false)
              toast({
                tone: "success",
                title: "Submitted for approval",
                body: `${rebuy.id} v3 sent to purchasing and finance managers.`,
              })
            }}
          >
            <Check size={16} /> Submit
          </Button>
        </div>
      </Modal>

      {/* Report per Farmer / Invoice Preview Modal */}
      <Modal
        open={!!reportModal}
        onClose={() => setReportModal(null)}
        title={reportModal === "farmer" ? `Report per farmer · ${rebuy.id}` : `Report per invoice · ${rebuy.id}`}
        width="max-w-2xl"
      >
        <div className="overflow-x-auto rounded-xl border border-line">
          {reportModal === "farmer" ? (
            <table className="w-full text-left text-[13px]">
              <thead className="bg-canvas">
                <tr>
                  <th className={th}>Farmer</th>
                  <th className={th}>Unit</th>
                  <th className={`${th} text-right`}>Invoices</th>
                  <th className={`${th} text-right`}>Kilos</th>
                  <th className={`${th} text-right`}>Net rebuy</th>
                  <th className={`${th} text-right`}>Credit generated</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { farmer: "Farmer 00052103", unit: "Unit 03", invoices: 4, kilos: 9420, net: 1120.5, credit: 1103.69 },
                  { farmer: "Farmer 00052112", unit: "Unit 07", invoices: 6, kilos: 14280, net: 1840.0, credit: 1812.4 },
                  { farmer: "Farmer 00052145", unit: "Unit 12", invoices: 3, kilos: 6810, net: 890.25, credit: 876.9 },
                ].map((r) => (
                  <tr key={r.farmer} className="border-t border-line">
                    <td className={`${td} font-700 text-ink`}>{r.farmer}</td>
                    <td className={td}>{r.unit}</td>
                    <td className={`${td} text-right tabular-nums`}>{r.invoices}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtInt(r.kilos)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(r.net)}</td>
                    <td className={`${td} text-right font-700 tabular-nums text-ink`}>{fmtMoney(r.credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead className="bg-canvas">
                <tr>
                  <th className={th}>Invoice</th>
                  <th className={th}>Farmer</th>
                  <th className={th}>Unit</th>
                  <th className={`${th} text-right`}>Original value</th>
                  <th className={`${th} text-right`}>At new table</th>
                  <th className={`${th} text-right`}>Net rebuy</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { invoice: "771204", farmer: "Farmer 00052103", unit: "Unit 03", orig: 42150.0, next: 43420.0, net: 1270.0 },
                  { invoice: "771219", farmer: "Farmer 00052112", unit: "Unit 07", orig: 51800.0, next: 53110.0, net: 1310.0 },
                  { invoice: "771248", farmer: "Farmer 00052145", unit: "Unit 12", orig: 28900.0, next: 29790.25, net: 890.25 },
                ].map((r) => (
                  <tr key={r.invoice} className="border-t border-line">
                    <td className={`${td} font-700 tabular-nums text-ink`}>{r.invoice}</td>
                    <td className={td}>{r.farmer}</td>
                    <td className={td}>{r.unit}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(r.orig)}</td>
                    <td className={`${td} text-right tabular-nums`}>{fmtMoney(r.next)}</td>
                    <td className={`${td} text-right font-700 tabular-nums text-ink`}>{fmtMoney(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setReportModal(null)}>
            Close
          </Button>
          <Button
            onClick={() => {
              toast({ tone: "success", title: "Report exported", body: `Full ${reportModal} report downloaded as Excel.` })
              setReportModal(null)
            }}
          >
            <FileText size={15} /> Export to Excel
          </Button>
        </div>
      </Modal>

      {/* Cancel Run Confirmation Modal */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title={`Cancel execution of ${rebuy.id}?`} width="max-w-md">
        <p className="text-[13.5px] text-ink-soft">
          Cancelling stops remaining batches and keeps the last save point (<b className="text-ink">03:40, invoice 5,500</b>).
        </p>
        <div className="mt-4">
          <Field label="Reason for cancellation">
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why the run is being cancelled" />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setCancelOpen(false)}>
            Keep running
          </Button>
          <Button
            className="bg-[#c23b3b] hover:bg-[#a83232]"
            disabled={!cancelReason.trim()}
            onClick={() => {
              setPaused(true)
              setCancelOpen(false)
              toast({ tone: "info", title: `${rebuy.id} cancelled`, body: cancelReason.trim() })
            }}
          >
            Confirm cancel
          </Button>
        </div>
      </Modal>
    </div>
  )
}
