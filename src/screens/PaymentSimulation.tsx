import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { FileText, Play, Plus, RotateCcw, Trash2, X } from "../components/icons"
import { Badge, Button, Card, useToast } from "../components/ui"

/* ------------------------------------------------------------------ */
/* Types + seed data                                                   */
/* ------------------------------------------------------------------ */

type PaymentPolicy = "PL4" | "PL5" | "PL7"
type RetentionBasis = "Estimate" | "PSA"
type AmortOrder = "debt-third-rp" | "debt-rp-third"

type Assumptions = {
  paymentPolicy: PaymentPolicy
  estimate: number
  avgPrice: number
  openingDebt: number
  policyPct: number
  retentionBasis: RetentionBasis
  retentionBlock: boolean
  // Sheet J6 — "Indebtedness > 40%" general-analysis indicator (manual Yes/No).
  indebtednessFlag: boolean
  retentionStart: number
  retentionAmount: number
  // PSA RP basis — retention derived from PSA + freight value × retention %.
  retentionPct: number
  psaFreightValue: number
  amortOrder: AmortOrder
  linkedChain: boolean
  rehandling: boolean
  deviation: boolean
  includeForecast: boolean
}

type Delivery = {
  id: number
  deliveredKg: number
  avgPrice: number
  afubraFcst: number
  // PL7 free amount is a user-entered column in the source model (blank = 0).
  pl7Free?: number
  // Afubra credit actually received on this delivery (sheet column I).
  afubraCredit?: number
}

/* The four farmer flags that re-route the whole run (spec §3.2). */
type FarmerFlags = {
  deviator: boolean
  risk: boolean
  recheio: boolean
  commercial: boolean
}

/* Which claim stages the profile enables, with their configured values. */
type ClaimConfig = {
  policy: boolean
  policyCode: string
  debts: boolean
  maxDebtValue: number
  selfFunding: boolean
  funrural: boolean
}

/* One analysis = one credit raised for a farmer (spec §2, step 1 identity). */
type AnalysisRecord = {
  id: string
  creditId?: string
  triggerEvent: string
  triggerAmount: number
  farmer: string
  farmerCode: string
  cropYear: string
  tobaccoType: string
  contract: string
  region: string
  segment: "Gold" | "Silver" | "Bronze"
  date: string
  status: "Completed" | "Failed" | "Pending"
  cluster: string[]
  flags: FarmerFlags
  claim: ClaimConfig
  assumptions: Assumptions
  deliveries: Delivery[]
}

const NO_FLAGS: FarmerFlags = { deviator: false, risk: false, recheio: false, commercial: false }

const INITIAL_ASSUMPTIONS: Assumptions = {
  paymentPolicy: "PL5",
  estimate: 9000,
  avgPrice: 18,
  openingDebt: 50000,
  policyPct: 30,
  retentionBasis: "Estimate",
  retentionBlock: true,
  indebtednessFlag: false,
  retentionStart: 40,
  retentionAmount: 25000,
  retentionPct: 100,
  psaFreightValue: 35000,
  amortOrder: "debt-third-rp",
  linkedChain: false,
  rehandling: false,
  deviation: false,
  includeForecast: true,
}

const INITIAL_DELIVERIES: Delivery[] = [
  { id: 1, deliveredKg: 1800, avgPrice: 14, afubraFcst: 0, pl7Free: 10000 },
  { id: 2, deliveredKg: 7200, avgPrice: 4, afubraFcst: 0 },
]

/* dd/mm/yyyy hh:mm — seed records carry a date only, so derive a stable time from the id. */
function formatCreated(date: string, id: string) {
  const [y, m, d] = date.split("-")
  const n = Number(id.replace(/\D/g, "")) || 0
  const hh = String(8 + (n % 10)).padStart(2, "0")
  const mm = String((n * 7) % 60).padStart(2, "0")
  return `${d}/${m}/${y} ${hh}:${mm}`
}

/* Analysis queue — reuses the farmer roster seen elsewhere in the app. */
const RECORDS: AnalysisRecord[] = [
  {
    id: "512004",
    triggerEvent: "Tobacco Sale",
    triggerAmount: 100000,
    farmer: "Helena Kunz",
    farmerCode: "512004",
    cropYear: "2026",
    tobaccoType: "Virginia",
    contract: "4-1",
    region: "Santa Cruz do Sul",
    segment: "Gold",
    date: "2026-09-20",
    status: "Completed",
    cluster: ["517333", "520117"],
    flags: { ...NO_FLAGS },
    claim: { policy: true, policyCode: "Policy 4", debts: true, maxDebtValue: 2000, selfFunding: false, funrural: true },
    assumptions: { ...INITIAL_ASSUMPTIONS },
    deliveries: INITIAL_DELIVERIES.map((d) => ({ ...d })),
  },
  {
    id: "517333",
    triggerEvent: "Rebuy — price recalculation",
    triggerAmount: 42000,
    farmer: "Rafael Bortolini",
    farmerCode: "517333",
    cropYear: "2026",
    tobaccoType: "Virginia",
    contract: "4-1",
    region: "Rio Pardo",
    segment: "Silver",
    date: "2026-09-18",
    status: "Completed",
    cluster: [],
    flags: { ...NO_FLAGS, risk: true },
    claim: { policy: false, policyCode: "None", debts: true, maxDebtValue: 1500, selfFunding: false, funrural: true },
    assumptions: {
      ...INITIAL_ASSUMPTIONS,
      paymentPolicy: "PL5",
      estimate: 6415,
      avgPrice: 12,
      openingDebt: 8000,
      retentionBlock: false,
      retentionAmount: 0,
      linkedChain: false,
    },
    deliveries: [{ id: 1, deliveredKg: 3114, avgPrice: 12, afubraFcst: 0 }],
  },
  {
    id: "520117",
    triggerEvent: "Complementary payment invoice",
    triggerAmount: 15000,
    farmer: "Camila Reis",
    farmerCode: "520117",
    cropYear: "2026",
    tobaccoType: "Burley",
    contract: "3-1",
    region: "Vera Cruz",
    segment: "Bronze",
    date: "2026-09-15",
    status: "Failed",
    cluster: [],
    flags: { ...NO_FLAGS, deviator: true, commercial: true },
    claim: { policy: false, policyCode: "None", debts: true, maxDebtValue: 5000, selfFunding: true, funrural: true },
    assumptions: {
      ...INITIAL_ASSUMPTIONS,
      estimate: 1236,
      avgPrice: 20,
      openingDebt: 24000,
      retentionAmount: 8000,
      linkedChain: false,
    },
    deliveries: [{ id: 1, deliveredKg: 1236, avgPrice: 20, afubraFcst: 0 }],
  },
  {
    id: "524880",
    triggerEvent: "Tobacco Sale",
    triggerAmount: 60000,
    farmer: "Nina Sachs",
    farmerCode: "524880",
    cropYear: "2026",
    tobaccoType: "Virginia",
    contract: "2-1",
    region: "Santa Cruz do Sul",
    segment: "Gold",
    date: "2026-09-22",
    status: "Pending",
    cluster: ["529344"],
    flags: { ...NO_FLAGS },
    claim: { policy: true, policyCode: "Policy 2", debts: true, maxDebtValue: 3000, selfFunding: true, funrural: true },
    assumptions: {
      ...INITIAL_ASSUMPTIONS,
      estimate: 4905,
      avgPrice: 16,
      openingDebt: 6412,
      retentionAmount: 5000,
    },
    deliveries: [
      { id: 1, deliveredKg: 1540, avgPrice: 16, afubraFcst: 0 },
      { id: 2, deliveredKg: 1600, avgPrice: 15, afubraFcst: 200 },
    ],
  },
  {
    id: "529344",
    triggerEvent: "Bank deposit",
    triggerAmount: 20000,
    farmer: "Lucas Meireles",
    farmerCode: "529344",
    cropYear: "2026",
    tobaccoType: "Burley",
    contract: "1-2",
    region: "Santa Cruz do Sul",
    segment: "Silver",
    date: "2026-09-12",
    status: "Completed",
    cluster: [],
    flags: { ...NO_FLAGS },
    claim: { policy: false, policyCode: "None", debts: true, maxDebtValue: 2000, selfFunding: false, funrural: false },
    assumptions: {
      ...INITIAL_ASSUMPTIONS,
      estimate: 3760,
      avgPrice: 14,
      openingDebt: 4185,
      retentionBlock: false,
      retentionAmount: 0,
      linkedChain: false,
    },
    deliveries: [{ id: 1, deliveredKg: 820, avgPrice: 14, afubraFcst: 0 }],
  },
]

const RECORD_BY_ID = Object.fromEntries(RECORDS.map((r) => [r.id, r])) as Record<string, AnalysisRecord>

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const money = (n: number | undefined) =>
  (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const kg = (n: number | undefined) => (n ?? 0).toLocaleString("en-US")
const pct = (n: number | undefined) => `${(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`
const anyFlag = (f: FarmerFlags) => f.deviator || f.risk || f.recheio || f.commercial

/* ------------------------------------------------------------------ */
/* Calculation engine                                                  */
/* ------------------------------------------------------------------ */

type DeliveryResult = {
  id: number
  pl7Free: number
  deliveryPct: number
  deliveredKg: number
  avgPrice: number
  revenue: number
  afubraFcst: number
  afubraCredit: number
  debtPayment: number
  rpRetention: number
  freePayment: number
  debtBalance: number
  cumFree: number
  appliedRule: string
  autoRule: string
  cumKg: number
  cumPct: number
  prevDebtBalance: number
  available: number
  policyReserve: number
  afubraProtection: number
  cumProtection: number
  cumEligibleRp: number
  cumForecast: number
  prevRp: number
  held: number
  // Row not calculated yet — the sheet leaves a delivery blank until volume and price are both set.
  pending: boolean
}


/* Mirrors the "Payment Analysis" sheet of the PL/RP simulator workbook:
   free-payment reserve + Afubra protection first, then debt, then RP up to
   the eligible amount, and the remainder as free payment. */
function runEngine(a: Assumptions, deliveries: Delivery[], overrides: Record<number, string> = {}) {
  const netRevenue = a.estimate * a.avgPrice
  const indebtedness = netRevenue > 0 ? a.openingDebt / netRevenue : 0
  const indebtednessOver40 = indebtedness >= 0.4
  const freeLimit = indebtednessOver40 ? 0 : Math.max(0, (netRevenue - a.openingDebt) * (a.policyPct / 100))
  const startFrac = a.retentionStart / 100
  const triggerKg = startFrac * a.estimate
  const psaRetentionAmount = (a.retentionPct / 100) * a.psaFreightValue
  const retentionCap = a.retentionBasis === "PSA" ? psaRetentionAmount : a.retentionAmount
  // Any general-analysis indicator marked Yes blocks free payment (sheet C34).
  const blockReasons = [
    a.indebtednessFlag && "Indebtedness > 40%",
    a.linkedChain && "Linked farmer chain",
    a.rehandling && "Rehandling",
    a.deviation && "Deviation",
  ].filter(Boolean) as string[]
  const blocked = blockReasons.length > 0
  const isPL7 = a.paymentPolicy === "PL7"

  let debtBalance = a.openingDebt
  let cumFree = 0
  let cumKg = 0
  let cumPct = 0
  let cumForecast = 0
  let cumProtection = 0
  let cumEligibleRp = 0
  let cumRp = 0

  const rows: DeliveryResult[] = deliveries.map((d) => {
    const deliveryFrac = a.estimate > 0 ? d.deliveredKg / a.estimate : 0
    const revenue = d.deliveredKg * d.avgPrice
    const afubraCredit = d.afubraCredit ?? 0
    const available = revenue + afubraCredit
    const prevDebtBalance = debtBalance
    const prevRp = cumRp

    if (d.deliveredKg <= 0 || d.avgPrice <= 0) {
      return {
        id: d.id, pl7Free: d.pl7Free ?? 0, deliveryPct: deliveryFrac * 100, deliveredKg: d.deliveredKg, avgPrice: d.avgPrice,
        revenue: 0, afubraFcst: d.afubraFcst, afubraCredit: 0, debtPayment: 0, rpRetention: 0, freePayment: 0,
        debtBalance, cumFree, appliedRule: d.deliveredKg > 0 ? "Enter average price" : "Enter delivery volume", autoRule: "",
        cumKg, cumPct: cumPct * 100, prevDebtBalance, available: 0, policyReserve: 0, afubraProtection: 0,
        cumProtection, cumEligibleRp, cumForecast, prevRp, held: 0, pending: true,
      }
    }

    cumKg += d.deliveredKg
    cumPct += deliveryFrac
    cumForecast += a.includeForecast ? d.afubraFcst : 0

    // Policy reserve — remaining free limit, capped by PL7 Free Amount under PL7.
    const remainingLimit = Math.max(0, freeLimit - cumFree)
    const pl7Entered = d.pl7Free ?? 0
    const policyReserve = isPL7 ? Math.min(Math.max(0, pl7Entered), remainingLimit, available) : Math.min(remainingLimit, available)
    // Afubra protection — forecast through this row not yet protected.
    const protectionRoom = isPL7 ? available : Math.max(0, available - policyReserve)
    const afubraProtection = Math.min(Math.max(0, cumForecast - cumProtection), protectionRoom)
    cumProtection += afubraProtection
    // PL7 free amount already covers Afubra — take the larger, never both.
    const initialFree = Math.min(available, isPL7 ? Math.max(policyReserve, afubraProtection) : policyReserve + afubraProtection)

    // Eligible RP — Estimate: grows with volume past the start %, at the row price. PSA: flat.
    cumEligibleRp = a.retentionBasis === "PSA"
      ? psaRetentionAmount
      : cumEligibleRp + Math.max(0, Math.min(deliveryFrac, cumPct - startFrac)) * a.estimate * d.avgPrice
    const rpRoom = Math.max(0, Math.min(retentionCap, cumEligibleRp) - prevRp)

    const forced = overrides[d.id]
    const rowBlocked = forced ? forced === "Blocked by flag" : blocked

    let debtPayment = 0
    let rpRetention = 0
    let freePayment = 0
    if (forced === "Free payment") {
      freePayment = available
    } else if (forced === "Debt settlement") {
      debtPayment = Math.min(available, debtBalance)
      freePayment = available - debtPayment
    } else if (forced === "Retention (RP)") {
      rpRetention = Math.min(available, Math.max(0, retentionCap - prevRp))
      debtPayment = Math.min(available - rpRetention, debtBalance)
      freePayment = available - rpRetention - debtPayment
    } else if (rowBlocked) {
      // Blocked: nothing is released — cash settles debt, then RP; any rest is held.
      debtPayment = Math.min(available, debtBalance)
      rpRetention = Math.min(available - debtPayment, rpRoom)
    } else {
      debtPayment = Math.min(debtBalance, Math.max(0, available - initialFree))
      rpRetention = Math.min(Math.max(0, available - debtPayment - initialFree), rpRoom)
      freePayment = Math.max(0, available - debtPayment - rpRetention)
    }
    const held = Math.max(0, available - debtPayment - rpRetention - freePayment)

    debtBalance -= debtPayment
    cumFree += freePayment
    cumRp += rpRetention

    // Applied Rule — same precedence as sheet column O.
    const autoRule = afubraCredit > 0
      ? debtPayment > 0 ? "Afubra Credit applied to debt" : rpRetention > 0 ? "Afubra Credit applied to RP" : "Afubra Credit paid as free payment"
      : afubraProtection > 0 && !blocked
        ? isPL7
          ? pl7Entered > 0 ? "PL7 Free Payment also covers Afubra" : "Afubra forecast paid as free"
          : debtPayment > 0 ? "Automatic free payment + Afubra protection + debt" : "Automatic free payment + Afubra protection"
        : blocked
          ? "Free payment blocked by general analysis"
          : debtPayment > 0
            ? debtBalance === 0 ? "Final debt payment" : "Partial debt payment"
            : rpRetention > 0 ? "RP retained" : "Free payment to farmer"

    return {
      id: d.id,
      pl7Free: pl7Entered,
      deliveryPct: deliveryFrac * 100,
      deliveredKg: d.deliveredKg,
      avgPrice: d.avgPrice,
      revenue,
      afubraFcst: d.afubraFcst,
      afubraCredit,
      debtPayment,
      rpRetention,
      freePayment,
      debtBalance,
      cumFree,
      appliedRule: forced ?? autoRule,
      autoRule,
      cumKg,
      cumPct: cumPct * 100,
      prevDebtBalance,
      available,
      policyReserve,
      afubraProtection,
      cumProtection,
      cumEligibleRp,
      cumForecast,
      prevRp,
      held,
      pending: false,
    }
  })

  const totals = rows.reduce(
    (acc, r) => ({
      pl7Free: acc.pl7Free + r.pl7Free,
      deliveredKg: acc.deliveredKg + r.deliveredKg,
      revenue: acc.revenue + r.revenue,
      afubraFcst: acc.afubraFcst + r.afubraFcst,
      afubraCredit: acc.afubraCredit + r.afubraCredit,
      debtPayment: acc.debtPayment + r.debtPayment,
      rpRetention: acc.rpRetention + r.rpRetention,
      freePayment: acc.freePayment + r.freePayment,
    }),
    { pl7Free: 0, deliveredKg: 0, revenue: 0, afubraFcst: 0, afubraCredit: 0, debtPayment: 0, rpRetention: 0, freePayment: 0 },
  )
  const last = rows.at(-1)

  return {
    netRevenue,
    freeLimit,
    indebtedness,
    indebtednessOver40,
    psaRetentionAmount,
    retentionCap,
    triggerKg,
    blocked,
    blockReasons,
    rows,
    totals: {
      ...totals,
      deliveryPct: a.estimate > 0 ? (totals.deliveredKg / a.estimate) * 100 : 0,
      avgPrice: totals.deliveredKg > 0 ? totals.revenue / totals.deliveredKg : 0,
      debtBalance: last ? last.debtBalance : a.openingDebt,
      cumFree: last ? last.cumFree : 0,
      cumProtection: last ? last.cumProtection : 0,
      cumEligibleRp: last ? last.cumEligibleRp : 0,
    },
  }
}

/* ------------------------------------------------------------------ */
/* Audit narrative                                                     */
/* ------------------------------------------------------------------ */

type AuditRow = { label: string; text: string }
type AuditSection = { id: string; title: string; tab: string; rows: AuditRow[] }

function buildAudit(a: Assumptions, result: ReturnType<typeof runEngine>): AuditSection[] {
  const R = (n: number) => `R$ ${money(n)}`
  const order = a.amortOrder === "debt-rp-third" ? "BAT Debt → RP → Third Parties" : "BAT Debt → Third Parties → RP"
  const yn = (b: boolean) => (b ? "Yes" : "No")

  const simulation: AuditSection = {
    id: "simulation",
    title: "Dynamic Simulation Audit",
    tab: "Simulation Audit",
    rows: [
      { label: "Estimate", text: `The total estimate considered is ${kg(a.estimate)} kg of tobacco.` },
      { label: "Estimated Revenue", text: `Using the system average price of ${R(a.avgPrice)} per kg, estimated gross revenue is ${R(result.netRevenue)}.` },
      { label: "Debt and Indebtedness", text: `The opening debt is ${R(a.openingDebt)}, equivalent to ${pct(result.indebtedness * 100)} of estimated revenue.` },
      {
        label: "40% Rule",
        text: result.blocked
          ? `Free payment is blocked because at least one general-analysis indicator is Yes: ${result.blockReasons.join(", ")}.`
          : "All blocking indicators are No and indebtedness is below 40%; therefore free payment is available under the selected policy.",
      },
      { label: "Payment Policy", text: `The selected Payment Policy is ${a.paymentPolicy}.` },
      {
        label: "Free Payment by Delivery",
        text: a.paymentPolicy === "PL7"
          ? `PL7 uses the PL7 Free Amount column for each delivery. Each request is capped by the revenue available on the row and the cumulative remaining Free Payment Limit of ${R(result.freeLimit)}. Free payments also cover the Afubra Forecast, without duplication.`
          : `The selected policy uses the automatic Free Payment Limit of ${R(result.freeLimit)}.`,
      },
      { label: "Cash Allocation Priority", text: `The stated Amortization Order is: ${order}. The engine prioritizes initial free payment when allowed, followed by debt, RP and the remaining free balance.` },
      {
        label: "RP Retention",
        text: `${a.retentionBasis === "PSA"
          ? `Retention Rule: PSA. The maximum retention amount is ${R(result.psaRetentionAmount)}, calculated on PSA and freight.`
          : `Retention Rule: Estimate. Retention starts after ${pct(a.retentionStart)} of the estimate and is capped at ${R(a.retentionAmount)}.`}`,
      },
      { label: "Price by Delivery", text: "Each delivery has its own manually entered average price; revenue is calculated using that delivery volume and price." },
    ],
  }

  const deliveries: AuditSection[] = result.rows.filter((r) => !r.pending).map((r) => {
    const cap = Math.min(result.retentionCap, r.cumEligibleRp)
    return {
      id: `delivery-${r.id}`,
      title: `Delivery ${r.id} — Step-by-Step Analysis`,
      tab: `Delivery ${r.id}`,
      rows: [
        { label: "Volume", text: `Received ${kg(r.deliveredKg)} kg, equivalent to ${pct(r.deliveryPct)} of the estimate. The cumulative volume reached ${kg(r.cumKg)} kg, or ${pct(r.cumPct)} of the total estimate.` },
        { label: "Revenue / Analyzed Credit", text: `The average price for this delivery was ${R(r.avgPrice)} per kg. Calculated revenue was ${R(r.revenue)}. The same amount is treated as the delivery Analyzed Credit.` },
        { label: "Advisor Retention", text: `The selected Retention Rule is ${a.retentionBasis}. The Advisor Retention Amount considered in this analysis is ${R(result.retentionCap)}.` },
        r.afubraCredit > 0
          ? { label: "Afubra Credit Receipt", text: `Afubra Credit received: ${R(r.afubraCredit)}. Available revenue: ${R(r.available)}. Allocation: debt ${R(r.debtPayment)}, RP ${R(r.rpRetention)} and free payment ${R(r.freePayment)}.` }
          : r.afubraProtection > 0
            ? { label: "Afubra Protection", text: `Cumulative Afubra Forecast through this delivery: ${R(r.cumForecast)}. Protection released on this row: ${R(r.afubraProtection)}.` }
            : { label: "Planned Future Retention", text: `No Afubra Forecast was available for this delivery. The planned future retention was ${R(result.retentionCap)}.` },
        { label: "Renegotiation", text: "Renegotiation: No. The delivery proceeds to analysis without credit renegotiation." },
        { label: "Linked Farmer Chain", text: `Linked Farmer Chain status: ${yn(a.linkedChain)}. This information is considered in the general free-payment analysis.` },
        { label: "Free Payment Adjustment", text: `Payment Policy: ${a.paymentPolicy}. Available revenue: ${R(r.available)}. Policy reserve: ${R(r.policyReserve)}. Cumulative Afubra Forecast: ${R(r.cumForecast)}; protection on this row: ${R(r.afubraProtection)}.` },
        {
          label: "Debt Payment",
          text: r.debtPayment > 0
            ? `Previous debt: ${R(r.prevDebtBalance)}. Debt Payment: ${R(r.debtPayment)}. Balance after payment: ${R(r.debtBalance)}. Amortization Order: ${order}.`
            : `Debt Payment: 0.00. The balance remained at ${R(r.debtBalance)}. Amortization Order: ${order}.`,
        },
        {
          label: "RP Retention",
          text: a.retentionBasis === "PSA"
            ? `PSA Rule: ${pct(a.retentionPct)} of ${R(a.psaFreightValue)} generates a limit of ${R(result.psaRetentionAmount)}. Previously retained RP: ${R(r.prevRp)}. RP Retention for this delivery: ${R(r.rpRetention)}.`
            : `Estimate Rule: trigger of ${kg(Math.round(result.triggerKg))} kg; cumulative volume of ${kg(r.cumKg)} kg. Cumulative eligible RP: ${R(r.cumEligibleRp)} (limit ${R(cap)}). Previously retained RP: ${R(r.prevRp)}. RP Retention for this delivery: ${R(r.rpRetention)}.`,
        },
        { label: "Balance Payment", text: `Balance Payment: ${R(r.freePayment)}. This amount corresponds to the Free Payment calculated for the delivery.` },
        { label: "Amount to Allocate", text: `Amount to Allocate: ${R(r.rpRetention)}. This amount corresponds to the RP Retention for the delivery.` },
        { label: "Free Payment", text: `Effective Free Payment: ${R(r.freePayment)}. Policy reserve: ${R(r.policyReserve)}; Afubra protection on this row: ${R(r.afubraProtection)}.` },
        { label: "Rule and Retention", text: `Amortization Order: ${order}. Rule applied by the engine for this delivery: ${r.appliedRule}.` },
        { label: "Closing", text: `Closing: available revenue ${R(r.available)} = debt ${R(r.debtPayment)} + RP ${R(r.rpRetention)} + free payment ${R(r.freePayment)}${r.held > 0 ? ` + held ${R(r.held)}` : ""}. Forecast considered only through this delivery: ${R(r.cumForecast)}; debt balance: ${R(r.debtBalance)}.` },
      ],
    }
  })

  return [simulation, ...deliveries]
}

/* Shared audit trace — run-identity meta grid + anchored TOP tabs with
   scroll-spy sections. Used by the full Logs screen and the simulator popup
   so both read identically. */
function AuditTrace({ sections, record, traceClassName, initialSectionId, hideMeta }: { sections: AuditSection[]; record: AnalysisRecord; traceClassName?: string; initialSectionId?: string; hideMeta?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const [active, setActive] = useState(sections[0]?.id ?? "")

  const jumpTo = (id: string) => {
    setActive(id)
    const container = scrollRef.current
    const el = sectionRefs.current[id]
    if (container && el) container.scrollTo({ top: el.offsetTop, behavior: "smooth" })
  }

  // Focus a requested section (e.g. a delivery drilled into from the table), else the first.
  useEffect(() => {
    const target = initialSectionId && sections.some((s) => s.id === initialSectionId) ? initialSectionId : sections[0]?.id ?? ""
    setActive(target)
    if (target) requestAnimationFrame(() => jumpTo(target))
  }, [sections, initialSectionId])

  const onScroll = () => {
    const container = scrollRef.current
    if (!container) return
    const top = container.scrollTop
    let current = sections[0]?.id ?? ""
    for (const s of sections) {
      const el = sectionRefs.current[s.id]
      if (el && el.offsetTop - 24 <= top) current = s.id
    }
    setActive(current)
  }

  const meta: { label: string; value: string }[] = [
    { label: "Farmer", value: `${record.farmer} · ${record.farmerCode}` },
    { label: "Contract", value: record.contract },
    { label: "Tobacco", value: record.tobaccoType },
    { label: "Trigger", value: record.triggerEvent },
    { label: "Crop Season", value: record.cropYear },
  ]

  const tabClass = (on: boolean) =>
    `relative shrink-0 px-4 py-3 text-[13.5px] font-600 transition after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:content-[''] ${
      on ? "text-brand after:bg-brand" : "text-muted after:bg-transparent hover:text-ink"
    }`

  return (
    <div className="space-y-5">
      {/* Run identity — clean label/value meta grid, matches the Logs screen. */}
      {!hideMeta && <Card className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
        {meta.map((m) => (
          <div key={m.label} className="min-w-0">
            <dt className="text-[10.5px] font-800 uppercase tracking-wide text-muted">{m.label}</dt>
            <dd className="mt-0.5 truncate text-[13.5px] font-700 text-ink">{m.value}</dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className="text-[10.5px] font-800 uppercase tracking-wide text-muted">Segment</dt>
          <dd className="mt-0.5"><Badge tone={SEGMENT_TONE[record.segment]}>{record.segment}</Badge></dd>
        </div>
      </Card>}

      {/* Trace — anchored top tabs: click to jump, or scroll and the active tab tracks. */}
      <Card className={`flex flex-col overflow-hidden p-0 ${traceClassName ?? "h-[calc(100vh-360px)] min-h-[460px]"}`}>
        {sections.length > 1 && <div className="flex flex-nowrap items-center gap-x-1 overflow-x-auto border-b border-line px-3 pt-2">
          {sections.map((s) => (
            <button key={s.id} onClick={() => jumpTo(s.id)} className={tabClass(active === s.id)}>
              {s.tab}
            </button>
          ))}
        </div>}

        <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto scroll-smooth">
          {sections.map((s) => (
            <section key={s.id} ref={(el) => { sectionRefs.current[s.id] = el }} className="border-b border-line last:border-b-0">
              <div className="flex items-center gap-2 px-5 pb-1 pt-4">
                <h2 className="text-[14.5px] font-800 text-ink">{s.title}</h2>
                <span className="tabular-nums text-[12px] text-muted">{s.rows.length} steps</span>
              </div>
              <dl className="divide-y divide-line">
                {s.rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-1 gap-x-6 gap-y-1 px-5 py-4 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
                    <dt className="flex items-start gap-2.5 text-[13px] font-700 text-ink">
                      <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[11.5px] font-800 text-brand">{i + 1}</span>
                      <span className="pt-0.5">{row.label}</span>
                    </dt>
                    <dd className="text-[13px] leading-relaxed text-ink-soft">{row.text}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* Simulator audit popup — same layout as the Logs screen, in a dialog. */
function AuditDialog({ open, onClose, sections, record, initialSectionId }: { open: boolean; onClose: () => void; sections: AuditSection[]; record: AnalysisRecord; initialSectionId?: string }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="animate-overlay absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-pop relative z-10 flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_64px_-24px_rgba(15,30,61,0.5)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-800 text-ink">Simulation Audit Log</h2>
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted">Full engine trace — simulation assumptions and per-delivery step-by-step analysis.</p>
          </div>
          <button onClick={onClose} aria-label="Close audit" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink">
            <X size={19} />
          </button>
        </div>

        {/* Body — reuses the Logs-screen trace, filling the dialog. */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas/30 p-5">
          <AuditTrace sections={sections} record={record} initialSectionId={initialSectionId} hideMeta traceClassName="h-[calc(92vh-260px)] min-h-[360px]" />
        </div>
      </div>
    </div>
  )
}

/* Full-page logs screen — reached from a runs-list row. */
export function SimulationLogPage({ recordId }: { creditType: string; recordId: string }) {
  const record = RECORD_BY_ID[recordId] ?? RECORDS[0]
  const flagged = anyFlag(record.flags)
  const effectiveA = useMemo<Assumptions>(() => ({ ...record.assumptions, deviation: record.assumptions.deviation || flagged }), [record, flagged])
  // A credit log is one transaction, and one transaction carries exactly one delivery.
  const delivery = useMemo(() => record.deliveries.slice(0, 1), [record.deliveries])
  const result = useMemo(() => runEngine(effectiveA, delivery), [effectiveA, delivery])
  const sections = useMemo(
    () =>
      {
        // One transaction = one delivery, so the summary and delivery steps read as a single trace.
        const all = buildAudit(effectiveA, result)
        return [{ id: "trace", title: "Step-by-Step Analysis", tab: "", rows: all.flatMap((s) => s.rows) }]
      },
    [effectiveA, result],
  )

  return (
    <div className="space-y-5">
      {/* Page header — matches the runs list / simulator screens. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[19px] font-800 text-ink">Simulation Audit Log</h1>
          </div>
        </div>
      </div>

      <AuditTrace sections={sections} record={record} hideMeta traceClassName="h-[calc(100vh-240px)] min-h-[460px]" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Small shared controls                                               */
/* ------------------------------------------------------------------ */

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-[44px] shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-brand" : "bg-[#c4cfe4]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-all duration-200 ${checked ? "left-[21px]" : "left-0.5"}`} />
    </button>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-canvas p-0.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-[6px] px-3.5 py-1.5 text-[13px] font-600 transition ${
              active ? "bg-white text-brand shadow-[0_1px_2px_rgba(15,30,61,0.12)]" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

type StageStatus = "Received" | "Available" | "Applied" | "Skipped" | "Held" | "Blocked" | "Clear" | "Open" | "Restricted"

const STATUS_STYLE: Record<StageStatus, string> = {
  Received: "bg-brand-soft text-brand",
  Available: "bg-brand-soft text-brand",
  Applied: "bg-[#edf8f0] text-[#1f7a46]",
  Open: "bg-[#edf8f0] text-[#1f7a46]",
  Clear: "bg-[#edf8f0] text-[#1f7a46]",
  Skipped: "bg-canvas text-ink-soft",
  Held: "bg-[#fdf3e0] text-[#9a6a12]",
  Restricted: "bg-[#fdf3e0] text-[#9a6a12]",
  Blocked: "bg-[#fbe6e6] text-[#b23b3b]",
}

function StatusBadge({ status }: { status: StageStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-700 ${STATUS_STYLE[status]}`}>{status}</span>
  )
}

/* A numbered engine-stage card in the vertical run read-out. */
function StageCard({
  n,
  title,
  subtitle,
  status,
  children,
}: {
  n: number
  title: string
  subtitle?: string
  status?: StageStatus
  children: ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-800 text-brand">{n}</span>
          <div>
            <h3 className="text-[14.5px] font-800 text-ink">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p> : null}
          </div>
        </div>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      {children}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Analysis list                                                       */
/* ------------------------------------------------------------------ */

const LIST_STATUS_STYLE: Record<AnalysisRecord["status"], string> = {
  Completed: "border-[#ccebd8] bg-[#edf8f1] text-[#187247]",
  Failed: "border-[#f5c9c9] bg-[#fdeeee] text-[#b42318]",
  Pending: "border-[#f3dfb0] bg-[#fff6e3] text-[#a86a06]",
}
const STATUS_ORDER: Record<AnalysisRecord["status"], number> = { Failed: 0, Pending: 1, Completed: 2 }

/* Segment tone mirrors the Debt Transfer table's segment label colors. */
const SEGMENT_TONE: Record<AnalysisRecord["segment"], "amber" | "neutral" | "red"> = {
  Gold: "amber",
  Silver: "neutral",
  Bronze: "red",
}

export function AnalysisListPage({ onOpenLog }: { creditType?: string; onOpenLog: (id: string) => void; onSimulate?: () => void }) {
  const toast = useToast()
  const [statusById, setStatusById] = useState<Record<string, AnalysisRecord["status"]>>(
    () => Object.fromEntries(RECORDS.map((r) => [r.id, r.status])),
  )
  // Failed runs surface first so they can be re-run manually.
  const rows = useMemo(
    () => [...RECORDS].sort((x, y) => STATUS_ORDER[statusById[x.id]] - STATUS_ORDER[statusById[y.id]]),
    [statusById],
  )
  const runManually = (r: AnalysisRecord) => {
    setStatusById((cur) => ({ ...cur, [r.id]: "Completed" }))
    toast({ tone: "success", title: "Analysis re-run", body: `${r.triggerEvent} for ${r.farmer} completed.` })
  }
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-800 text-ink">Credit List & Logs</h1>
          <p className="mt-0.5 text-[13px] text-muted">One analysis per credit raised — open a run to read its full audit log.</p>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-[13px]">
          <thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand">
            <tr>
              <th className="px-5 py-3.5">Credit ID</th>
              <th className="px-4 py-3.5">Trigger</th>
              <th className="px-4 py-3.5">Farmer</th>
              <th className="px-4 py-3.5">Crop Season</th>
              <th className="px-4 py-3.5">Contract</th>
              <th className="px-4 py-3.5">Tobacco Type</th>
              <th className="px-4 py-3.5">Hierarchical Node</th>
              <th className="px-4 py-3.5">Segment</th>
              <th className="px-4 py-3.5">Created</th>
              <th className="px-4 py-3.5">Analysis Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = statusById[r.id]
              return (
              <tr key={r.id} className="border-t border-line transition hover:bg-canvas/50">
                <td className="px-5 py-3.5 font-700 text-ink tabular-nums whitespace-nowrap">{r.creditId ?? `CR-${r.id}`}</td>
                <td className="px-4 py-3.5">
                  <span className="block font-700 text-ink">{r.triggerEvent}</span>
                  <span className="text-[12px] text-muted tabular-nums">R$ {money(r.triggerAmount)}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="block font-600 text-ink">{r.farmer}</span>
                  <span className="text-[12px] text-muted tabular-nums">{r.farmerCode}</span>
                </td>
                <td className="px-4 py-3.5 text-ink-soft">{r.cropYear}</td>
                <td className="px-4 py-3.5 text-ink-soft tabular-nums">{r.contract}</td>
                <td className="px-4 py-3.5 text-ink-soft">{r.tobaccoType}</td>
                <td className="px-4 py-3.5 text-ink-soft">{r.region}</td>
                <td className="px-4 py-3.5 text-ink-soft">{r.segment}</td>
                <td className="px-4 py-3.5 text-ink-soft tabular-nums whitespace-nowrap">{formatCreated(r.date, r.id)}</td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[12px] font-600 ${LIST_STATUS_STYLE[status]}`}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                    {status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                  {status === "Failed" && (
                    <button
                      type="button"
                      onClick={() => runManually(r)}
                      title="Run manually"
                      aria-label={`Run analysis manually for ${r.farmer}`}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand"
                    >
                      <Play size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenLog(r.id)}
                    aria-label={`View logs for ${r.farmer}`}
                    title="View logs"
                    className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand"
                  >
                    <FileText size={17} />
                  </button>
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Simulation run — staged read-out                                    */
/* ------------------------------------------------------------------ */

export function SimulationPage({ recordId }: { creditType: string; recordId?: string }) {
  const toast = useToast()
  const record = (recordId && RECORD_BY_ID[recordId]) || RECORDS[0]

  const [a, setA] = useState<Assumptions>(record.assumptions)
  const [flags, setFlags] = useState<FarmerFlags>(record.flags)
  const [deliveries, setDeliveries] = useState<Delivery[]>(record.deliveries.map((d) => ({ ...d })))
  const [auditOpen, setAuditOpen] = useState(false)

  // Reload state whenever a different record is opened.
  useEffect(() => {
    setA(record.assumptions)
    setFlags(record.flags)
    setDeliveries(record.deliveries.map((d) => ({ ...d })))
  }, [record])

  const set = <K extends keyof Assumptions>(key: K, value: Assumptions[K]) => setA((cur) => ({ ...cur, [key]: value }))

  const setDelivery = (id: number, key: keyof Omit<Delivery, "id">, value: number) => {
    const row = deliveries.find((d) => d.id === id)
    setDeliveries((cur) => cur.map((d) => (d.id === id ? { ...d, [key]: value } : d)))
  }
  const removeDelivery = (id: number) => setDeliveries((cur) => cur.filter((d) => d.id !== id))
  const MAX_DELIVERIES = 8
  const addDelivery = () =>
    setDeliveries((cur) => (cur.length >= MAX_DELIVERIES ? cur : [...cur, { id: (cur.at(-1)?.id ?? 0) + 1, deliveredKg: 0, avgPrice: 0, afubraFcst: 0 }]))

  // When a farmer flag is raised, the policy route is ignored and free payment is blocked (spec §3.2).
  const flagged = anyFlag(flags)
  const effectiveA = useMemo<Assumptions>(() => ({ ...a, deviation: a.deviation || flagged }), [a, flagged])

  // Rows without their own price use the Average Price set above; editing the cell overrides it.
  const priced = useMemo(() => deliveries.map((d) => ({ ...d, avgPrice: d.avgPrice || a.avgPrice })), [deliveries, a.avgPrice])
  const result = useMemo(() => runEngine(effectiveA, priced), [effectiveA, priced])
  const auditSections = useMemo(() => buildAudit(effectiveA, result), [effectiveA, result])

  const reset = () => {
    setA(record.assumptions)
    setFlags(record.flags)
    setDeliveries(record.deliveries.map((d) => ({ ...d })))
    toast({ tone: "info", title: "Run reset", body: "Configuration restored to the recorded values." })
  }
  const run = () =>
    toast({ tone: "success", title: "Simulation run", body: `Free payment released ${money(result.totals.freePayment)} against ${money(a.openingDebt)} opening debt.` })

  const rowById = (id: number) => deliveries.find((d) => d.id === id)

  return (
    <div className="space-y-5">
      {/* Header + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-800 text-ink">Simulation Assumptions</h1>
          <p className="mt-0.5 text-[13px] text-muted">Values recalculate live as you edit.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={reset}><RotateCcw size={15} /> Reset</Button>
        </div>
      </div>

      {/* Assumptions — same blocks as the Excel "Payment Analysis" sheet */}
      <div className="grid gap-5 lg:grid-cols-3">
        <AssumptionPanel title="Debt Assumptions">
          <InputRow label="Average Price"><NumberInput value={a.avgPrice} onChange={(v) => set("avgPrice", v)} prefix="R$" /></InputRow>
          <InputRow label="Estimate"><NumberInput value={a.estimate} onChange={(v) => set("estimate", v)} suffix="kg" /></InputRow>
          <InputRow label="Opening Debt"><NumberInput value={a.openingDebt} onChange={(v) => set("openingDebt", v)} prefix="R$" /></InputRow>
          <InputRow label="Payment Policy">
            <Segmented value={a.paymentPolicy} onChange={(v) => set("paymentPolicy", v)} options={[{ value: "PL4", label: "PL4" }, { value: "PL5", label: "PL5" }, { value: "PL7", label: "PL7" }]} />
          </InputRow>
          <InputRow label="Payment Policy %"><NumberInput value={a.policyPct} onChange={(v) => set("policyPct", v)} suffix="%" /></InputRow>
          <TileGrid>
            <StatTile tone="blue" label="Gross Revenue" value={money(result.netRevenue)} />
            <StatTile tone={result.indebtednessOver40 ? "red" : "amber"} label="Indebtedness" value={pct(result.indebtedness * 100)} />
            <StatTile tone="green" label="Free Limit" value={money(result.freeLimit)} />
          </TileGrid>
        </AssumptionPanel>

        <AssumptionPanel title={a.retentionBasis === "Estimate" ? "Estimate RP Assumptions" : "PSA RP Assumptions"}>
          <StackRow label="Retention Rule">
            <Segmented value={a.retentionBasis} onChange={(v) => set("retentionBasis", v)} options={[{ value: "Estimate", label: "Estimate" }, { value: "PSA", label: "PSA" }]} />
          </StackRow>
          {a.retentionBasis === "Estimate" ? (
            <>
              <InputRow label="Retention Start"><NumberInput value={a.retentionStart} onChange={(v) => set("retentionStart", v)} suffix="%" /></InputRow>
              <InputRow label="Retention Amount"><NumberInput value={a.retentionAmount} onChange={(v) => set("retentionAmount", v)} prefix="R$" /></InputRow>
            </>
          ) : (
            <>
              <InputRow label="Retention %"><NumberInput value={a.retentionPct} onChange={(v) => set("retentionPct", v)} suffix="%" /></InputRow>
              <InputRow label="PSA + Freight Value"><NumberInput value={a.psaFreightValue} onChange={(v) => set("psaFreightValue", v)} prefix="R$" /></InputRow>
            </>
          )}
          <TileGrid cols={2}>
            {a.retentionBasis === "Estimate"
              ? <StatTile tone="amber" label="Starts at" value={`${kg(Math.round(result.triggerKg))} kg`} />
              : <StatTile tone="amber" label="PSA Basis" value={money(a.psaFreightValue)} />}
            <StatTile tone="green" label="Retention Limit" value={money(result.retentionCap)} />
          </TileGrid>
        </AssumptionPanel>

        <AssumptionPanel title="General Analysis Assumptions">
          <StackRow label="Amortization Order">
            <Segmented value={a.amortOrder} onChange={(v) => set("amortOrder", v)} options={[{ value: "debt-rp-third", label: "BAT Debt › RP › Third Parties" }, { value: "debt-third-rp", label: "BAT Debt › Third Parties › RP" }]} />
          </StackRow>
          <SwitchRow label="Indebtedness > 40%" checked={a.indebtednessFlag} onChange={() => set("indebtednessFlag", !a.indebtednessFlag)} />
          <SwitchRow label="Linked Farmer Chain?" checked={a.linkedChain} onChange={() => set("linkedChain", !a.linkedChain)} />
          <SwitchRow label="Filler?" checked={a.rehandling} onChange={() => set("rehandling", !a.rehandling)} />
          <SwitchRow label="Deviator?" checked={a.deviation} onChange={() => set("deviation", !a.deviation)} />
        </AssumptionPanel>
      </div>

      {/* Delivery Analysis */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h3 className="text-[14.5px] font-800 text-ink">Delivery Schedule</h3>
            <p className="mt-0.5 text-[12.5px] text-muted">Per-delivery free payment, debt settlement and RP retention.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAuditOpen(true)}><FileText size={15} /> View full audit</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1600px] text-right text-[13px]">
            <thead className="bg-brand-soft/60 text-[11px] font-700 uppercase tracking-wide text-brand">
              <tr>
                <th className="px-3 py-2.5 text-left">#</th>
                <th className="px-3 py-2.5">PL7 Free</th>
                <th className="px-3 py-2.5">Delivery %</th>
                <th className="px-3 py-2.5">Delivered kg</th>
                <th className="px-3 py-2.5">Avg Price</th>
                <th className="px-3 py-2.5">Revenue</th>
                <th className="px-3 py-2.5">Afubra Fcst</th>
                <th className="px-3 py-2.5">Afubra Credit</th>
                <th className="px-3 py-2.5 text-[#b06a1a]">Debt Payment</th>
                <th className="px-3 py-2.5 text-[#1f7a46]">RP Retention</th>
                <th className="px-3 py-2.5 text-brand">Free Payment</th>
                <th className="px-3 py-2.5">Debt Balance</th>
                <th className="px-3 py-2.5">Cum. Free</th>
                <th className="px-3 py-2.5 text-left">Applied Rule</th>
                <th className="w-12 px-3 py-2.5"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {result.rows.map((r) => {
                const d = rowById(r.id)
                return (
                  <tr key={r.id} className="border-t border-line">
                    <td className="px-3 py-2.5 text-left font-700 text-ink">{r.id}</td>
                    <td className="px-2 py-2">
                      <CellInput
                        value={d?.pl7Free ?? 0}
                        onChange={(v) => setDelivery(r.id, "pl7Free", v)}
                        disabled={a.paymentPolicy !== "PL7"}
                        title={a.paymentPolicy !== "PL7" ? "PL7 Free amount is only available for PL7" : "Requested free amount — capped by row revenue and the remaining Free Payment Limit"}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CellInput value={Number(r.deliveryPct.toFixed(1))} onChange={(v) => setDelivery(r.id, "deliveredKg", (v / 100) * a.estimate)} />
                    </td>
                    <td className="px-2 py-2">
                      <CellInput value={d?.deliveredKg ?? 0} onChange={(v) => setDelivery(r.id, "deliveredKg", v)} />
                    </td>
                    <td className="px-2 py-2">
                      <CellInput value={d?.avgPrice || a.avgPrice} onChange={(v) => setDelivery(r.id, "avgPrice", v)} />
                    </td>
                    <td className="px-3 py-2.5 font-600 text-ink">{money(r.revenue)}</td>
                    <td className="px-2 py-2">
                      <CellInput value={d?.afubraFcst ?? 0} onChange={(v) => setDelivery(r.id, "afubraFcst", v)} />
                    </td>
                    <td className="px-2 py-2">
                      <CellInput value={d?.afubraCredit ?? 0} onChange={(v) => setDelivery(r.id, "afubraCredit", v)} />
                    </td>
                    <td className="px-3 py-2.5 font-700 text-[#b06a1a]">{r.debtPayment > 0 ? money(r.debtPayment) : "—"}</td>
                    <td className="px-3 py-2.5 font-700 text-[#1f7a46]">{r.rpRetention > 0 ? money(r.rpRetention) : "—"}</td>
                    <td className="px-3 py-2.5 font-700 text-brand">{money(r.freePayment)}</td>
                    <td className="px-3 py-2.5 text-ink">{money(r.debtBalance)}</td>
                    <td className="px-3 py-2.5 text-ink">{money(r.cumFree)}</td>
                    <td className="px-3 py-2.5 text-left">
                      {r.pending ? (
                        <span className="inline-block whitespace-nowrap rounded-full border border-dashed border-line px-2.5 py-1 text-[12px] font-700 text-muted">{r.appliedRule}</span>
                      ) : (
                        <RuleChip rule={r.appliedRule} />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        title="Remove delivery"
                        aria-label={`Remove delivery ${r.id}`}
                        onClick={() => removeDelivery(r.id)}
                        className="mx-auto grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[#fdeeec] hover:text-[#b3261e]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="tabular-nums">
              <tr className="border-t border-line">
                <td colSpan={17} className="px-3 py-2 text-left">
                  <button
                    type="button"
                    onClick={addDelivery}
                    disabled={deliveries.length >= MAX_DELIVERIES}
                    className="sticky left-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-700 text-brand transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:text-muted disabled:hover:bg-transparent"
                  >
                    <Plus size={15} /> {deliveries.length >= MAX_DELIVERIES ? `Maximum of ${MAX_DELIVERIES} deliveries` : "Add delivery"}
                  </button>
                </td>
              </tr>
              <tr className="border-t-2 border-line bg-canvas/60 font-800 text-ink">
                <td className="px-3 py-2.5 text-left">Totals</td>
                <td className="px-3 py-2.5">{money(result.totals.pl7Free)}</td>
                <td className="px-3 py-2.5">{pct(result.totals.deliveryPct)}</td>
                <td className="px-3 py-2.5">{kg(result.totals.deliveredKg)}</td>
                <td className="px-3 py-2.5">{money(result.totals.avgPrice)}</td>
                <td className="px-3 py-2.5">{money(result.totals.revenue)}</td>
                <td className="px-3 py-2.5">{money(result.totals.afubraFcst)}</td>
                <td className="px-3 py-2.5">{money(result.totals.afubraCredit)}</td>
                <td className="px-3 py-2.5 text-[#b06a1a]">{money(result.totals.debtPayment)}</td>
                <td className="px-3 py-2.5 text-[#1f7a46]">{money(result.totals.rpRetention)}</td>
                <td className="px-3 py-2.5 text-brand">{money(result.totals.freePayment)}</td>
                <td className="px-3 py-2.5">{money(result.totals.debtBalance)}</td>
                <td className="px-3 py-2.5">{money(result.totals.cumFree)}</td>
                <td className="px-3 py-2.5 text-left font-700 text-[#b06a1a]">Outstanding debt</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="border-t border-line px-5 py-3 text-[12.5px] text-muted">
          Showing {deliveries.length} of {MAX_DELIVERIES} deliveries
        </div>
      </Card>

      {/* Audit log — near-fullscreen dialog with anchored tabs (live audit) */}
      <AuditDialog open={auditOpen} onClose={() => setAuditOpen(false)} sections={auditSections} record={record} />
    </div>
  )
}

/* Assumption block — title-only header; stretches so all three align. */
function AssumptionPanel({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h3 className="text-[14px] font-800 text-ink">{title}</h3>
        {badge}
      </div>
      <div className="flex flex-1 flex-col divide-y divide-line px-5">{children}</div>
    </Card>
  )
}

/* Editable line: label left, control right. */
function InputRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[54px] items-center justify-between gap-4 py-2">
      <span className="text-[13px] font-600 text-ink-soft">{label}</span>
      <div className="w-[170px] shrink-0 [&>div]:flex [&>div]:w-full [&_button]:flex-1">{children}</div>
    </div>
  )
}

/* Full-width switcher line (label above). */
function StackRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3">
      <span className="mb-2 block text-[12px] font-700 uppercase tracking-wide text-muted">{label}</span>
      <div className="[&>div]:flex [&>div]:w-full [&_button]:flex-1 [&_button]:px-2 [&_button]:text-[12.5px] [&_button]:leading-tight">{children}</div>
    </div>
  )
}

/* Pastel headline tiles, pinned to the bottom of a panel. */
function TileGrid({ cols = 3, children }: { cols?: 2 | 3; children: ReactNode }) {
  return (
    <div className={`mt-auto grid gap-2 !border-t-0 pb-5 pt-3 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>{children}</div>
  )
}

const TILE_TONES = {
  blue: "bg-[#eef3fc] text-[#2a4d8f]",
  amber: "bg-[#fdf5e6] text-[#8a5a14]",
  green: "bg-[#edf8f0] text-[#1f7a46]",
  red: "bg-[#fdeeec] text-[#b3261e]",
} as const

function StatTile({ label, value, tone }: { label: string; value: string; tone: keyof typeof TILE_TONES }) {
  return (
    <div className={`min-w-0 rounded-xl px-3 py-2.5 ${TILE_TONES[tone]}`}>
      <p className="truncate text-[10.5px] font-700 uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-0.5 truncate text-[14.5px] font-800 tabular-nums">{value}</p>
    </div>
  )
}

/* Calculated line — read-only, visually distinct from inputs. */
function CalcRow({ label, value, tone, strong }: { label: string; value: string; tone?: "green" | "red"; strong?: boolean }) {
  const color = tone === "green" ? "text-[#1f7a46]" : tone === "red" ? "text-[#b3261e]" : "text-ink"
  return (
    <div className="flex min-h-[46px] items-center justify-between gap-4 py-2">
      <span className="flex items-center gap-2 text-[13px] font-600 text-ink-soft">
        {label}
        <span className="rounded bg-canvas px-1.5 py-px text-[9.5px] font-800 uppercase tracking-wider text-muted">calc</span>
      </span>
      <span className={`tabular-nums ${strong ? "text-[16px] font-800" : "text-[14px] font-700"} ${color}`}>{value}</span>
    </div>
  )
}

/* Yes/No line. */
function SwitchRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex min-h-[46px] cursor-pointer items-center justify-between gap-4 py-2">
      <span className="text-[13px] font-600 text-ink-soft">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </label>
  )
}

/* Applied Rule — read-only, colour-coded like the allocation columns. */
function RuleChip({ rule }: { rule: string }) {
  const tone = /blocked/i.test(rule)
    ? "bg-[#fdeeec] text-[#b3261e]"
    : /debt/i.test(rule)
      ? "bg-[#fdf5e6] text-[#8a5a14]"
      : /RP/.test(rule)
        ? "bg-[#edf8f0] text-[#1f7a46]"
        : "bg-brand-soft text-brand"
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-700 ${tone}`}>{rule}</span>
}

/* Small label above a form input. */
function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-[12.5px] font-700 text-ink-soft">{children}</label>
}

/* Number input with optional currency prefix / unit suffix, right-aligned. */
function NumberInput({ value, onChange, prefix, suffix }: { value: number; onChange: (v: number) => void; prefix?: string; suffix?: string }) {
  return (
    <div className="flex items-center rounded-lg border border-line bg-white px-3 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-soft">
      {prefix ? <span className="text-[13px] text-muted">{prefix}</span> : null}
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
        className="min-w-0 flex-1 bg-transparent px-1.5 py-2.5 text-right text-[14px] font-600 text-ink outline-none"
      />
      {suffix ? <span className="text-[13px] text-muted">{suffix}</span> : null}
    </div>
  )
}

/* Compact in-table numeric cell input. */
function CellInput({ value, onChange, disabled, invalid, title }: { value: number; onChange: (v: number) => void; disabled?: boolean; invalid?: boolean; title?: string }) {
  const tone = disabled
    ? "cursor-not-allowed border-line bg-canvas text-muted"
    : invalid
      ? "border-[#e8a39b] bg-[#fdeeec] text-ink placeholder:text-[#b3261e] focus:border-[#b3261e] focus:ring-[#fbd9d4]"
      : "border-line bg-white text-ink focus:border-brand focus:ring-brand-soft"
  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      title={title}
      aria-invalid={invalid || undefined}
      placeholder={invalid ? "Required" : undefined}
      value={disabled ? "" : invalid && !value ? "" : value}
      onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
      className={`ml-auto block h-9 w-24 rounded-lg border px-2.5 text-right text-[13px] font-600 tabular-nums outline-none transition focus:ring-4 ${tone}`}
    />
  )
}

/* A derived, read-only result box (gray by default, green for headline stats). */
function DerivedBox({ label, value, note, tone = "gray" }: { label: string; value: string; note?: string; tone?: "gray" | "green" }) {
  const styles = tone === "green" ? "border-[#cde9d5] bg-[#edf8f0]" : "border-line bg-canvas/60"
  const valueTone = tone === "green" ? "text-[#1f7a46]" : "text-ink"
  return (
    <div className={`rounded-lg border px-4 py-3 ${styles}`}>
      <p className="text-[10.5px] font-800 uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-0.5 text-[20px] font-800 tabular-nums ${valueTone}`}>{value}</p>
      {note ? <p className="mt-0.5 text-[12px] text-ink-soft">{note}</p> : null}
    </div>
  )
}

/* A labelled toggle row used in the Analysis Rules card. */
function RuleToggle({ label, note, checked, onChange }: { label: string; note: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-3">
      <div>
        <span className="block text-[13.5px] font-700 text-ink">{label}</span>
        <span className="block text-[12px] text-muted">{note}</span>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </label>
  )
}

export default SimulationPage
