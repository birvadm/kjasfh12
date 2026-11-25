import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Eye,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "../components/icons"
import { Button, Card, Field, Input, Modal, Select, useToast } from "../components/ui"
import { AnalysisListPage, SimulationLogPage, SimulationPage } from "./PaymentSimulation"

/* ------------------------------------------------------------------ */
/* Types + seed data                                                   */
/* ------------------------------------------------------------------ */

type ClaimId = string

type Origin = { kind: "here"; alert?: boolean } | { kind: "external"; source: string }

type Claim = {
  id: ClaimId
  name: string
  description: string
  origin: Origin
}

type Effect = "TAKE" | "SKIP" | "PROTECT" | "HOLD" | "JUMP" | "STOP" | "Blocked" | "CANCEL" | "FORCE" | "FLAG" | "REVERSE"

type Condition = { param: string; op: string; value: string; source: string }

type RuleRow = {
  ref: string
  when: string
  param: string
  then: string
  effect: Effect
  position?: string
  active?: boolean
  conditions?: Condition[]
  amountWay?: string
  whichParam?: string
  fixedAmount?: string
  paramDesc?: string
  reasonCode?: string
}

type Flags = {
  deviator: boolean
  recheio: boolean
  commercial: boolean
}

/* Sub-view within the Payment Analysis screen — surfaced in the app breadcrumb. */
export type PAView =
  | { name: "profile"; creditType: string }
  | { name: "compare" }
  | { name: "simulation"; creditType: string }
  | { name: "simRun"; creditType: string; recordId?: string }
  | { name: "simLog"; creditType: string; recordId: string }
  | { name: "rules"; creditType: string; focus: ClaimId | "all" }
  | { name: "editor"; creditType: string; claim: ClaimId; ref: string; readOnly?: boolean }

export type PACrumb = { label: string; onClick?: () => void }

const CLAIMS: Claim[] = [
  { id: "forecast", name: "Afubra forecast", description: "Netted off the debt in the policy net revenue, so the ceiling rises", origin: { kind: "external", source: "From the insurance interface" } },
  { id: "funrural", name: "Funrural (Farmer Tax)", description: "Gilrat, Senar and INSS on invoice credits", origin: { kind: "here" } },
  { id: "policy", name: "Policy Reserve", description: "The policy on the farmer record", origin: { kind: "external", source: "From the payment policy screen" } },
  { id: "debt", name: "Debt", description: "Farmer debt, plus the linked cluster if allowed", origin: { kind: "here", alert: true } },
  { id: "retention", name: "Retention", description: "Estimate rule, 30% trigger", origin: { kind: "external", source: "From the self funding screen" } },
  { id: "payment", name: "Free Payment", description: "Whatever survives, once it clears the minimum", origin: { kind: "here" } },
]

const CLAIM_BY_ID = Object.fromEntries(CLAIMS.map((c) => [c.id, c])) as Record<ClaimId, Claim>

const FLAG_ITEMS: { key: keyof Flags; label: string }[] = [
  { key: "deviator", label: "Deviator" },
  { key: "recheio", label: "Recheio (Filler)" },
  { key: "commercial", label: "Commercial Disagreement" },
]

const INITIAL_FLAGS: Flags = { deviator: true, recheio: true, commercial: true }

// Flags differ per credit type — they change as the credit-type tab changes.
const INITIAL_FLAGS_BY_TYPE: Record<string, Flags> = {
  Buying: { deviator: true, recheio: true, commercial: true },
  Rebuying: { deviator: true, recheio: false, commercial: true },
  "Complementary invoice": { deviator: true, recheio: false, commercial: false },
  "Insurance - Afubra": { deviator: false, recheio: false, commercial: false },
  "Other credits": { deviator: true, recheio: true, commercial: false },
}

// runs[] aligns to CLAIMS order (forecast, funrural, policy, debt, retention, payment).
const PROFILES: { type: string; pr: string; runs: boolean[] }[] = [
  { type: "Buying", pr: "PL7 / Estimate", runs: [true, true, true, true, true, true] },
  { type: "Rebuying", pr: "none / none", runs: [false, true, false, true, false, true] },
  { type: "Complementary invoice", pr: "PLS / Estimate", runs: [false, true, true, true, true, true] },
  { type: "Insurance - Afubra", pr: "none / none", runs: [false, false, false, true, false, true] },
  { type: "Other credits", pr: "none / none", runs: [false, false, false, true, false, true] },
]


const INITIAL_RUNS: Record<string, Record<ClaimId, boolean>> = Object.fromEntries(
  PROFILES.map((row) => [row.type, Object.fromEntries(CLAIMS.map((c, i) => [c.id, row.runs[i]])) as Record<ClaimId, boolean>]),
)

const INITIAL_RULES: Record<ClaimId, RuleRow[]> = {
  forecast: [
    { ref: "12", when: "The Afubra forecast file has been received", param: "Forecast source is Available", then: "Net the forecast off the debt so the ceiling rises", effect: "TAKE" },
    { ref: "13", when: "No forecast exists for the farmer", param: "Forecast source is Missing", then: "Skip — there is nothing to net off", effect: "SKIP" },
  ],
  policy: [
    { ref: "31", when: "A payment policy sits on the farmer record", param: "Payment policy is Active", then: "Reserve the policy amount before the free payment", effect: "HOLD" },
    { ref: "32", when: "No payment policy applies to the credit", param: "Payment policy is None", then: "Skip the reserve", effect: "SKIP" },
  ],
  retention: [
    { ref: "10", when: "Net revenue crosses the 30% trigger", param: "Net revenue is Above trigger", then: "Retain the estimate amount", effect: "TAKE" },
    { ref: "11", when: "Self funding already covers the retention", param: "Self funding is Sufficient", then: "Skip — there is nothing left to retain", effect: "SKIP" },
  ],
  funrural: [
    { ref: "44", when: "The credit was raised from an invoice", param: "Credit origin is Invoice", then: "Take the Funrural amount from the rate table", effect: "TAKE" },
    { ref: "45", when: "A Funrural posting already exists", param: "Funrural posted is Yes", then: "Take nothing, no second posting", effect: "SKIP" },
    { ref: "46", when: "No Funrural posting exists yet", param: "Funrural posted is No", then: "Create the Funrural receivable", effect: "TAKE" },
  ],
  debt: [
    { ref: "22", when: "The farmer belongs to a cluster", param: "Cluster linkage is Farmer and crop", then: "Take the linked crops into the debt figure", effect: "TAKE" },
    { ref: "24", when: "The cluster has anticipation titles or future debt", param: "Anticipation check is On", then: "Take them into the debt figure", effect: "TAKE" },
    { ref: "25", when: "The farmer is negative at the credit bureau", param: "Credit bureau is Negative", then: "Take anticipations and third-party debts too", effect: "TAKE" },
  ],
  payment: [
    { ref: "39", when: "The credit is marked to stay held in the account", param: "Credit held is Yes", then: "Take nothing, keep the credit open", effect: "HOLD" },
    { ref: "63", when: "The credit has been used in full", param: "Credit balance = 0.00", then: "Mark the credit as used", effect: "FLAG" },
    { ref: "64", when: "The farmer is deceased", param: "Deceased is Yes", then: "Block the payment - the amount stays as credit", effect: "Blocked" },
  ],
}

const EFFECT_PILL: Record<Effect, string> = {
  TAKE: "bg-[#edf8f0] text-[#1f7a46] border border-[#cde9d5]",
  SKIP: "bg-canvas text-muted border border-line",
  HOLD: "bg-[#f2edfc] text-[#6b4fbb] border border-[#ddd1f4]",
  FLAG: "bg-[#e9f1fb] text-[#2563a8] border border-[#cadff5]",
  Blocked: "bg-[#fdecec] text-[#c23b3b] border border-[#f4cccc]",
  PROTECT: "bg-[#e8f6f6] text-[#1d7a80] border border-[#c4e6e7]",
  JUMP: "bg-[#fdecec] text-[#c23b3b] border border-[#f4cccc]",
  STOP: "bg-[#fdecec] text-[#c23b3b] border border-[#f4cccc]",
  CANCEL: "bg-[#fdf6e3] text-[#8a5a14] border border-[#f2ddb3]",
  FORCE: "bg-[#f2edfc] text-[#6b4fbb] border border-[#ddd1f4]",
  REVERSE: "bg-canvas text-ink-soft border border-line",
}

const EFFECT_LABEL: Record<Effect, string> = {
  TAKE: "Take",
  SKIP: "Skip",
  HOLD: "Hold",
  FLAG: "Flag",
  Blocked: "Blocked",
  PROTECT: "Protect",
  JUMP: "Jump",
  STOP: "Stop",
  CANCEL: "Cancel policy",
  FORCE: "Force",
  REVERSE: "Reverse",
}

const EFFECT_OPTIONS = [
  { value: "TAKE", label: "Take a value" },
  { value: "SKIP", label: "Skip this claim" },
  { value: "PROTECT", label: "Protect an amount" },
  { value: "HOLD", label: "Hold the credit" },
  { value: "JUMP", label: "Jump to a claim" },
  { value: "STOP", label: "Stop the run" },
  { value: "Blocked", label: "Block the payment" },
  { value: "CANCEL", label: "Cancel the policy" },
  { value: "FORCE", label: "Force the payment" },
  { value: "FLAG", label: "Flag for a later claim" },
  { value: "REVERSE", label: "Reverse a posting" },
]

const OPERATOR_OPTIONS = [
  { value: "is", label: "is" },
  { value: "is not", label: "is not" },
  { value: "=", label: "=" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
]

const SOURCE_OPTIONS = [
  "Run context",
  "Posting table",
  "Farmer register",
  "Credit bureau",
  "Rate table",
  "Self funding screen",
]

const PARAM_FIELD_OPTIONS = [
  "Credit origin",
  "Funrural posted",
  "Cluster linkage",
  "Anticipation check",
  "Credit bureau",
  "Credit held",
  "Credit balance",
  "Deceased",
  "Payment policy",
  "Forecast source",
  "Net revenue",
  "Self funding",
]

const AMOUNT_WAY_OPTIONS = [
  "A share of the credit, from a parameter",
  "A fixed amount",
  "Everything that remains",
  "The lower of two amounts",
]

const WHICH_PARAM_OPTIONS = [
  "Funrural rate table - Gilrat + Senar + INSS",
  "Consolidated debt exposure",
  "Minimum payment amount",
  "Policy reserve amount",
]

// Build a Select option list that always includes the current value.
function withValue(list: string[], value: string) {
  const opts = list.map((v) => ({ value: v, label: v }))
  if (value && !list.includes(value)) opts.unshift({ value, label: value })
  return opts
}

/* iPhone-style blue toggle, shared across the screen. */
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

function EffectPill({ effect }: { effect: Effect }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-800 ${EFFECT_PILL[effect]}`}>
      {effect === "TAKE" && <Check size={13} />}
      {effect === "Blocked" && <AlertTriangle size={13} />}
      {EFFECT_LABEL[effect]}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export type PASection = "claims" | "rules" | "logs" | "simulator"

const sectionOf = (v: PAView): PASection =>
  v.name === "simulation" || v.name === "simLog"
    ? "logs"
    : v.name === "simRun"
      ? "simulator"
      : v.name === "rules" || v.name === "editor"
        ? "rules"
        : "claims"

export function PaymentAnalysis({
  onCrumbs,
  section = "claims",
  onSection,
}: { onCrumbs?: (crumbs: PACrumb[]) => void; section?: PASection; onSection?: (s: PASection) => void } = {}) {
  const HOME: PAView = { name: "profile", creditType: PROFILES[0].type }
  const toast = useToast()
  const [view, setView] = useState<PAView>(() =>
    section === "logs"
      ? { name: "simulation", creditType: HOME.creditType }
      : section === "simulator"
        ? { name: "simRun", creditType: HOME.creditType }
        : section === "rules"
          ? { name: "rules", creditType: HOME.creditType, focus: "all" }
          : HOME,
  )

  /* Sidebar sub-menu selection drives the entry view; in-screen drill-downs report back. */
  useEffect(() => {
    setView((cur) => {
      if (sectionOf(cur) === section) return cur
      const ct = "creditType" in cur ? cur.creditType : HOME.creditType
      return section === "logs"
        ? { name: "simulation", creditType: ct }
        : section === "simulator"
          ? { name: "simRun", creditType: ct }
          : section === "rules"
            ? { name: "rules", creditType: ct, focus: "all" }
            : { name: "profile", creditType: ct }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])
  useEffect(() => {
    const s = sectionOf(view)
    if (s !== section) onSection?.(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])
  const [creditTypes, setCreditTypes] = useState<string[]>(PROFILES.map((p) => p.type))
  const [runsByType, setRunsByType] = useState<Record<string, Record<ClaimId, boolean>>>(INITIAL_RUNS)
  const [claimOrder, setClaimOrder] = useState<ClaimId[]>(CLAIMS.map((c) => c.id))
  const [flagsByType, setFlagsByType] = useState<Record<string, Flags>>(INITIAL_FLAGS_BY_TYPE)
  const [rules, setRules] = useState<Record<ClaimId, RuleRow[]>>(INITIAL_RULES)
  const [claims, setClaims] = useState<Claim[]>(CLAIMS)
  const [addingClaim, setAddingClaim] = useState(false)

  const claimById = useMemo(() => Object.fromEntries(claims.map((c) => [c.id, c])) as Record<ClaimId, Claim>, [claims])

  // Last-saved snapshot of the profile — Save commits to it, Cancel restores from it.
  const [baseline, setBaseline] = useState(() => ({
    creditTypes: PROFILES.map((p) => p.type),
    runsByType: INITIAL_RUNS,
    claimOrder: CLAIMS.map((c) => c.id) as ClaimId[],
    flagsByType: INITIAL_FLAGS_BY_TYPE,
  }))
  const [confirmSave, setConfirmSave] = useState(false)

  const dirty = useMemo(
    () => JSON.stringify({ creditTypes, runsByType, claimOrder, flagsByType }) !== JSON.stringify(baseline),
    [creditTypes, runsByType, claimOrder, flagsByType, baseline],
  )

  const commitSave = () => {
    setBaseline({ creditTypes, runsByType, claimOrder, flagsByType })
    setConfirmSave(false)
    toast({ tone: "success", title: "Profile saved", body: "Your changes to this analysis profile have been applied." })
  }

  const cancelChanges = () => {
    setCreditTypes(baseline.creditTypes)
    setRunsByType(baseline.runsByType)
    setClaimOrder(baseline.claimOrder)
    setFlagsByType(baseline.flagsByType)
    // If we're viewing a credit type that only existed in the discarded changes, fall back home.
    if (view.name === "profile" && !baseline.creditTypes.includes(view.creditType)) setView(HOME)
  }

  const go = (next: PAView) => setView(next)

  /* Report the drill trail to the app shell for the top breadcrumb. */
  useEffect(() => {
    if (!onCrumbs) return
    const isProfile = view.name === "profile"
    // "Payment Analysis" returns to the profile of the active credit type (tab context preserved);
    // non-clickable while the profile itself is open.
    const backToProfile = () => setView({ name: "profile", creditType: view.creditType })
    const trail: PACrumb[] = [{ label: "Payment Analysis", onClick: isProfile ? undefined : backToProfile }]
    const claimsRoot: PACrumb = { label: "Credit Types & Claim Rules", onClick: isProfile ? undefined : backToProfile }
    const logsRoot = "Credit List & Logs"
    if (view.name === "profile") trail.push(claimsRoot)
    else if (view.name === "compare") trail.push(claimsRoot, { label: "Credit Claim Matrix" })
    else if (view.name === "simulation") {
      trail.push({ label: logsRoot })
    } else if (view.name === "simRun") {
      trail.push({ label: "Payment Analysis Simulator" })
    } else if (view.name === "simLog") {
      trail.push({ label: logsRoot, onClick: () => setView({ name: "simulation", creditType: view.creditType }) })
      trail.push({ label: "Logs" })
    } else if (view.name === "rules") {
      trail.push({ label: "Claim Rules" })
    } else if (view.name === "editor") {
      trail.push({ label: "Claim Rules", onClick: () => setView({ name: "rules", creditType: view.creditType, focus: view.claim }) })
      trail.push({ label: view.ref === "new" ? "New rule" : view.readOnly ? "View rule" : "Edit rule" })
    }
    onCrumbs(trail)
  }, [view, onCrumbs])

  useEffect(() => () => onCrumbs?.([]), [onCrumbs])

  const addType = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || creditTypes.includes(trimmed)) return
    setCreditTypes((current) => [...current, trimmed])
    setRunsByType((current) => ({ ...current, [trimmed]: Object.fromEntries(CLAIMS.map((c) => [c.id, true])) as Record<ClaimId, boolean> }))
    setFlagsByType((current) => ({ ...current, [trimmed]: INITIAL_FLAGS }))
  }

  const toggleRun = (type: string, id: ClaimId) =>
    setRunsByType((current) => {
      const row = current[type] ?? (Object.fromEntries(CLAIMS.map((c) => [c.id, true])) as Record<ClaimId, boolean>)
      return { ...current, [type]: { ...row, [id]: !row[id] } }
    })

  const saveRule = (claim: ClaimId, rule: RuleRow) =>
    setRules((current) => {
      const list = current[claim] ?? []
      const exists = list.some((r) => r.ref === rule.ref)
      return { ...current, [claim]: exists ? list.map((r) => (r.ref === rule.ref ? rule : r)) : [...list, rule] }
    })

  const reorderRule = (claim: ClaimId, from: number, to: number) =>
    setRules((current) => {
      const list = [...(current[claim] ?? [])]
      if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return current
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      return { ...current, [claim]: list }
    })

  const addClaim = (name: string, description: string) => {
    const label = name.trim()
    if (!label) return
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "claim"
    let id = base
    let n = 2
    while (claims.some((c) => c.id === id)) id = `${base}-${n++}`
    setClaims((current) => [...current, { id, name: label, description: description.trim(), origin: { kind: "here" } }])
    setClaimOrder((current) => [...current, id])
    setRunsByType((current) => Object.fromEntries(Object.entries(current).map(([type, row]) => [type, { ...row, [id]: true }])) as Record<string, Record<ClaimId, boolean>>)
    setRules((current) => ({ ...current, [id]: [] }))
    setAddingClaim(false)
    toast({ tone: "success", title: "Claim added", body: `"${label}" is now available across every credit type.` })
  }

  return (
    <div className="space-y-5">
      {view.name === "compare" && (
        <ComparePage runsByType={runsByType} claims={claims} onBack={() => go({ name: "profile", creditType: HOME.creditType })} />
      )}
      {view.name === "simulation" && (
        <AnalysisListPage
          creditType={view.creditType}
          onOpenLog={(id) => go({ name: "simLog", creditType: view.creditType, recordId: id })}
          onSimulate={() => go({ name: "simRun", creditType: view.creditType })}
        />
      )}
      {view.name === "simRun" && <SimulationPage creditType={view.creditType} recordId={view.recordId} />}
      {view.name === "simLog" && <SimulationLogPage creditType={view.creditType} recordId={view.recordId} />}
      {view.name === "profile" && (
        <ProfilePage
          creditTypes={creditTypes}
          creditType={view.creditType}
          setCreditType={(type) => go({ name: "profile", creditType: type })}
          addType={addType}
          claimById={claimById}
          onRequestAddClaim={() => setAddingClaim(true)}
          claimOrder={claimOrder}
          setClaimOrder={setClaimOrder}
          runs={runsByType[view.creditType] ?? {}}
          toggleRun={(id) => toggleRun(view.creditType, id)}
          flags={flagsByType[view.creditType] ?? INITIAL_FLAGS}
          setFlags={(action) =>
            setFlagsByType((cur) => {
              const curFlags = cur[view.creditType] ?? INITIAL_FLAGS
              const next = typeof action === "function" ? (action as (f: Flags) => Flags)(curFlags) : action
              return { ...cur, [view.creditType]: next }
            })
          }
          dirty={dirty}
          onSave={() => setConfirmSave(true)}
          onCancel={cancelChanges}
          go={go}
        />
      )}
      {view.name === "rules" && (
        <RulesPage
          creditType={view.creditType}
          focus={view.focus}
          rules={rules}
          claims={claims}
          claimById={claimById}
          reorderRule={reorderRule}
          onRequestAddClaim={() => setAddingClaim(true)}
          go={go}
        />
      )}
      {view.name === "editor" && (
        <EditorPage
          key={`${view.claim}-${view.ref}-${view.readOnly ? "view" : "edit"}`}
          readOnly={view.readOnly}
          creditType={view.creditType}
          claim={view.claim}
          ref_={view.ref}
          rules={rules}
          claimById={claimById}
          onSave={saveRule}
          go={go}
        />
      )}

      <Modal open={confirmSave} onClose={() => setConfirmSave(false)} title="Save profile changes?" width="max-w-md">
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          Apply your changes to this analysis profile? This updates which claims run, the flags, credit types and claim order.
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setConfirmSave(false)}>Cancel</Button>
          <Button onClick={commitSave}><Save size={15} /> Save changes</Button>
        </div>
      </Modal>

      <AddClaimModal open={addingClaim} onClose={() => setAddingClaim(false)} onAdd={addClaim} />
    </div>
  )
}

/* Shared Add Claim dialog — a new claim is global, "Set here", and starts with no rules. */
function AddClaimModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (name: string, description: string) => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (open) {
      setName("")
      setDescription("")
    }
  }, [open])

  const submit = () => {
    if (!name.trim()) return
    onAdd(name, description)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a claim" width="max-w-md">
      <p className="text-[13px] leading-relaxed text-ink-soft">
        A claim added here is configured in this screen, applies to every credit type, and starts with no rules. This is separate from adding a credit type.
      </p>
      <div className="mt-4 space-y-3">
        <Field label="Claim name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Insurance premium" autoFocus onKeyDown={(e) => e.key === "Enter" && submit()} />
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short note on what this claim covers" onKeyDown={(e) => e.key === "Enter" && submit()} />
        </Field>
      </div>
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!name.trim()}><Plus size={15} /> Add claim</Button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* 1 · Compare — profiles matrix (view-only)                           */
/* ------------------------------------------------------------------ */

function ComparePage({
  runsByType,
  claims,
  onBack,
}: {
  runsByType: Record<string, Record<ClaimId, boolean>>
  claims: Claim[]
  onBack: () => void
}) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[19px] font-800 text-ink">Credit Claim Matrix</h1>
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft size={16} /> Back
        </Button>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-[13px]">
          <thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand">
            <tr>
              <th className="px-5 py-3.5">Claim</th>
              {PROFILES.map((profile) => (
                <th key={profile.type} className="px-4 py-3.5 text-center">{profile.type}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {claims.map((claim, index) => {
              return (
                <tr key={claim.id} className="border-t border-line">
                  <td className="px-5 py-3.5 font-700 text-ink">{index + 1} {claim.name}</td>
                  {PROFILES.map((profile) => {
                    const runs = runsByType[profile.type]?.[claim.id]
                    return (
                      <td key={profile.type} className="px-4 py-3.5 text-center">
                        {runs ? (
                          <span className="inline-flex min-w-[58px] justify-center rounded-full bg-[#edf8f0] px-3 py-1 text-[11.5px] font-700 text-[#1f7a46]">Runs</span>
                        ) : (
                          <span className="text-muted/50">–</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </>
  )
}

/* Single-line credit-type tabs; overflow collapses into a "More" dropdown menu. */
function CreditTypeTabs({
  creditTypes,
  creditType,
  setCreditType,
  trailing,
}: {
  creditTypes: string[]
  creditType: string
  setCreditType: (type: string) => void
  trailing?: React.ReactNode
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(creditTypes.length)
  const [open, setOpen] = useState(false)

  useLayoutEffect(() => {
    const row = rowRef.current
    const measure = measureRef.current
    if (!row || !measure) return
    const compute = () => {
      const avail = row.clientWidth
      if (avail <= 0) {
        // Layout not ready yet — retry next frame rather than collapsing to one tab.
        requestAnimationFrame(compute)
        return
      }
      const nodes = Array.from(measure.children) as HTMLElement[]
      const moreW = nodes[creditTypes.length]?.offsetWidth ?? 0
      const widths = nodes.slice(0, creditTypes.length).map((n) => n.offsetWidth)
      const gap = 4 // matches gap-x-1
      const fit = (budget: number) => {
        let total = 0
        let count = 0
        for (const w of widths) {
          total += w + (count > 0 ? gap : 0)
          if (total <= budget) count++
          else break
        }
        return count
      }
      let count = fit(avail)
      if (count < creditTypes.length) count = fit(avail - moreW - gap)
      setVisibleCount(Math.max(1, count))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(row)
    return () => ro.disconnect()
  }, [creditTypes])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  let visibleList = creditTypes.slice(0, visibleCount)
  let hiddenList = creditTypes.slice(visibleCount)
  if (hiddenList.includes(creditType) && !visibleList.includes(creditType)) {
    const displaced = visibleList[visibleList.length - 1]
    visibleList = [...visibleList.slice(0, -1), creditType]
    hiddenList = [displaced, ...hiddenList.filter((t) => t !== creditType)]
  }

  const tabClass = (active: boolean) =>
    `relative shrink-0 px-4 py-3 text-[14px] font-600 transition after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:content-[''] ${
      active ? "text-brand after:bg-brand" : "text-muted after:bg-transparent hover:text-ink"
    }`

  return (
    <div ref={rowRef} className="flex min-w-0 flex-1 items-center gap-x-1 overflow-hidden">
      {visibleList.map((type) => (
        <button key={type} onClick={() => setCreditType(type)} className={tabClass(type === creditType)}>
          {type}
        </button>
      ))}

      {hiddenList.length > 0 && (
        <div ref={wrapRef} className="relative shrink-0">
          <button
            onClick={() => setOpen((v) => !v)}
            className="my-1.5 flex items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-600 text-ink-soft transition hover:bg-brand-soft hover:text-brand"
          >
            More <span className="tabular-nums text-muted">({hiddenList.length})</span>
            <ChevronDown size={14} />
          </button>
          {open && (
            <div className="animate-pop absolute left-0 top-full z-20 mt-1 max-h-72 w-52 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]">
              {hiddenList.map((type) => (
                <button
                  key={type}
                  onClick={() => { setCreditType(type); setOpen(false) }}
                  className={`block w-full truncate rounded-lg px-3 py-2 text-left text-[13px] font-600 transition ${
                    type === creditType ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-brand-soft hover:text-brand"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {trailing}

      {/* Hidden measurement copy — never visible, used to size tabs + More button. */}
      <div ref={measureRef} aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 flex items-center gap-x-1">
        {creditTypes.map((type) => (
          <button key={type} className={tabClass(false)}>{type}</button>
        ))}
        <button className="my-1.5 flex items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-600">
          More <span>(0)</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 2 · Profile detail                                                  */
/* ------------------------------------------------------------------ */

function ProfilePage({
  creditTypes,
  creditType,
  setCreditType,
  addType,
  claimById,
  onRequestAddClaim,
  claimOrder,
  setClaimOrder,
  runs,
  toggleRun,
  flags,
  setFlags,
  dirty,
  onSave,
  onCancel,
  go,
}: {
  creditTypes: string[]
  creditType: string
  setCreditType: (type: string) => void
  addType: (name: string) => void
  claimById: Record<ClaimId, Claim>
  onRequestAddClaim: () => void
  claimOrder: ClaimId[]
  setClaimOrder: React.Dispatch<React.SetStateAction<ClaimId[]>>
  runs: Partial<Record<ClaimId, boolean>>
  toggleRun: (id: ClaimId) => void
  flags: Flags
  setFlags: React.Dispatch<React.SetStateAction<Flags>>
  dirty: boolean
  onSave: () => void
  onCancel: () => void
  go: (v: PAView) => void
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [newType, setNewType] = useState("")

  const dropOn = (index: number) => {
    if (dragIndex === null || dragIndex === index) return setDragIndex(null)
    setClaimOrder((current) => {
      const copy = [...current]
      const [moved] = copy.splice(dragIndex, 1)
      copy.splice(index, 0, moved)
      return copy
    })
    setDragIndex(null)
  }

  const commitType = () => {
    if (newType.trim()) {
      addType(newType.trim())
      setCreditType(newType.trim())
    }
    setNewType("")
    setAdding(false)
  }

  const orderedClaims = claimOrder.map((id) => claimById[id]).filter(Boolean)

  return (
    <>
      {/* Page header — title + page-level navigation */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-800 text-ink">Credit Types &amp; Claim Rules</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {creditType} profile{dirty ? <span className="ml-2 text-[#c07a12] font-700">· Unsaved changes</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={() => go({ name: "compare" })}>
            <Boxes size={16} /> Credit Claim Matrix
          </Button>
          {dirty && (
            <>
              <Button variant="ghost" onClick={onCancel}>Cancel</Button>
              <Button onClick={onSave}><Save size={15} /> Save</Button>
            </>
          )}
        </div>
      </div>

      {/* Credit-type tabs + claims table */}
      <Card className="overflow-hidden">
        <div className="flex flex-nowrap items-center gap-x-2 border-b border-line px-3 pt-2">
          <CreditTypeTabs
            creditTypes={creditTypes}
            creditType={creditType}
            setCreditType={setCreditType}
            trailing={
              adding ? (
                <input
                  autoFocus
                  value={newType}
                  onChange={(event) => setNewType(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitType()
                    if (event.key === "Escape") { setAdding(false); setNewType("") }
                  }}
                  onBlur={commitType}
                  placeholder="New type…"
                  className="my-1.5 h-9 w-36 shrink-0 rounded-lg border border-brand bg-white px-3 text-[13px] text-ink outline-none ring-2 ring-brand-soft"
                />
              ) : null
            }
          />
        </div>

        {/* Flags — scoped to the active credit type */}
        <div className="border-b border-line bg-canvas/40 px-5 py-4">
          <div className="mb-3 flex items-center">
            <span className="text-[13px] font-700 text-ink">
              Flags that skip the policy and jump to debt
              <span className="ml-2 font-600 text-muted">· for {creditType}</span>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FLAG_ITEMS.map((item) => (
              <label key={item.key} className="flex cursor-pointer items-center gap-3">
                <Toggle checked={flags[item.key]} onChange={() => setFlags((current) => ({ ...current, [item.key]: !current[item.key] }))} label={item.label} />
                <span className="text-[13.5px] font-600 text-ink">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-[13px]">
            <thead className="text-[12px] font-700 text-brand">
              <tr className="border-b border-line">
                <th className="w-8" />
                <th className="w-10 py-3 pl-2">#</th>
                <th className="py-3 pr-4">Claim</th>
                <th className="py-3 pr-4">Description</th>
                <th className="py-3 pr-4 text-center">Rules</th>
                <th className="py-3 pr-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {orderedClaims.map((claim, index) => {
                const on = runs[claim.id] ?? true
                const here = claim.origin.kind === "here"
                return (
                  <tr
                    key={claim.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => dropOn(index)}
                    onDragEnd={() => setDragIndex(null)}
                    className={`border-b border-line last:border-b-0 transition ${dragIndex === index ? "bg-brand-soft/40" : ""}`}
                  >
                    <td className="cursor-grab pl-3 text-muted/40 active:cursor-grabbing"><GripVertical size={16} /></td>
                    <td className="py-4 pl-2 font-700 text-ink tabular-nums">{index + 1}</td>
                    <td className="py-4 pr-4 font-700 text-ink">{claim.name}</td>
                    <td className="py-4 pr-4 text-ink-soft">{claim.description}</td>
                    <td className="py-4 pr-4 text-center">
                      {here ? (
                        <button
                          type="button"
                          onClick={() => go({ name: "rules", creditType, focus: claim.id })}
                          title={`Open ${claim.name} rules`}
                          className="inline-flex items-center gap-1 text-[12.5px] font-700 text-brand underline-offset-2 transition hover:underline"
                        >
                          Set here <ChevronRight size={13} />
                        </button>
                      ) : (
                        <span className="text-[12.5px] italic text-muted">{(claim.origin as { source: string }).source}</span>
                      )}
                    </td>
                    <td className="py-4 pr-6 text-center">
                      <span className="inline-flex justify-center">
                        <Toggle checked={on} onChange={() => toggleRun(claim.id)} label={`Toggle ${claim.name}`} />
                      </span>
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td colSpan={6} className="border-t border-line bg-canvas/50 px-5 py-3 text-[12.5px] text-muted">
                  <span className="inline-flex items-center gap-2"><AlertTriangle size={14} className="shrink-0 text-[#b88a12]" />New claims and credit types cannot be added here. To introduce one, please submit a change request; it will be configured once the request is approved.</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PaginationBar />
      </Card>
    </>
  )
}

function PaginationBar() {
  const [page, setPage] = useState(1)
  const pages = [1, 2, 3]
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5 text-[13px]">
      <span className="text-muted">Showing 1 to 10 of 200 entries</span>
      <div className="flex items-center gap-1.5">
        <PageBtn onClick={() => setPage(1)} aria="First page"><ChevronsLeft size={15} /></PageBtn>
        <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} aria="Previous page"><ChevronLeft size={15} /></PageBtn>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[13px] font-700 transition ${page === p ? "bg-brand text-white" : "text-ink-soft hover:bg-canvas"}`}
          >
            {p}
          </button>
        ))}
        <span className="px-1 text-muted">…</span>
        <button onClick={() => setPage(23)} className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[13px] font-700 transition ${page === 23 ? "bg-brand text-white" : "text-ink-soft hover:bg-canvas"}`}>23</button>
        <PageBtn onClick={() => setPage((p) => Math.min(23, p + 1))} aria="Next page"><ChevronRight size={15} /></PageBtn>
        <PageBtn onClick={() => setPage(23)} aria="Last page"><ChevronsRight size={15} /></PageBtn>
      </div>
    </div>
  )
}

function PageBtn({ children, onClick, aria }: { children: React.ReactNode; onClick: () => void; aria: string }) {
  return (
    <button onClick={onClick} aria-label={aria} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-brand">
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* 3 · Claim Rules                                                     */
/* ------------------------------------------------------------------ */

function RulesPage({
  creditType,
  focus,
  rules,
  claims,
  claimById,
  reorderRule,
  onRequestAddClaim,
  go,
}: {
  creditType: string
  focus: ClaimId | "all"
  rules: Record<ClaimId, RuleRow[]>
  claims: Claim[]
  claimById: Record<ClaimId, Claim>
  reorderRule: (claim: ClaimId, from: number, to: number) => void
  onRequestAddClaim: () => void
  go: (v: PAView) => void
}) {
  const [selected, setSelected] = useState<ClaimId | "all">(focus)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const isAll = selected === "all"
  const claim = isAll ? null : claimById[selected]
  const selectedExternal = claim?.origin.kind === "external"
  // Rows can be dragged to reorder only when a single here-claim is in view.
  const canReorder = !isAll && !selectedExternal

  // Claims whose rules live in another screen, so they carry no rules here.
  const externalClaims = claims.filter((c) => c.origin.kind === "external")
  const screenName = (c: Claim) =>
    c.origin.kind === "external" ? c.origin.source.replace(/^From the /, "") : ""

  // In All mode, flatten only the here-claims' rules; external claims are listed separately.
  const rows: (RuleRow & { claimId: ClaimId })[] = isAll
    ? claims.filter((c) => c.origin.kind === "here").flatMap((c) => (rules[c.id] ?? []).map((r) => ({ ...r, claimId: c.id })))
    : selectedExternal
      ? []
      : (rules[selected as ClaimId] ?? []).map((r) => ({ ...r, claimId: selected as ClaimId }))

  const dropOn = (index: number) => {
    if (!canReorder || dragIndex === null || dragIndex === index) return setDragIndex(null)
    reorderRule(selected as ClaimId, dragIndex, index)
    setDragIndex(null)
  }

  const chips: { id: ClaimId | "all"; name: string; external?: boolean }[] = [
    { id: "all", name: "All" },
    ...claims.map((c) => ({ id: c.id as ClaimId | "all", name: c.name, external: c.origin.kind === "external" })),
  ]

  return (
    <>
      {/* Claim filter chips — single select; "All" shows every claim's rules together */}
      <div className="flex flex-wrap items-center gap-2.5">
        {chips.map((c) => {
          const active = selected === c.id
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13.5px] font-600 transition ${
                active
                  ? "border-brand bg-brand text-white shadow-sm"
                  : c.external
                    ? "border-line text-muted hover:border-brand-ring hover:text-brand"
                    : "border-line text-ink-soft hover:border-brand-ring hover:text-brand"
              }`}
            >
              {c.name}
              {c.external && <ExternalLink size={13} className={active ? "opacity-90" : "opacity-60"} />}
            </button>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-800 text-ink">{isAll ? "All claim rules" : `${claim!.name} rules`}</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              {selectedExternal
                ? `Set in the ${screenName(claim!)}`
                : isAll
                  ? `${rows.length} ${rows.length === 1 ? "rule" : "rules"} across the claims set here`
                  : `${rows.length} ${rows.length === 1 ? "rule" : "rules"} · read top to bottom, the first match wins`}
            </p>
          </div>
          <Button
            size="sm"
            disabled={isAll || selectedExternal}
            title={isAll ? "Pick a claim to add a rule to" : selectedExternal ? "This claim is configured in another screen" : undefined}
            onClick={() => !isAll && !selectedExternal && go({ name: "editor", creditType, claim: selected as ClaimId, ref: "new" })}
          >
            <Plus size={15} /> Add rule
          </Button>
        </div>

        {selectedExternal ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand">
              <ExternalLink size={20} />
            </span>
            <p className="max-w-md text-[14px] text-ink-soft">
              <span className="font-700 text-ink">{claim!.name}</span> has no rules here — it's set in the{" "}
              <span className="font-700 text-brand">{screenName(claim!)}</span>.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-muted">No rules yet{claim ? ` for ${claim.name}` : ""}. Use “Add rule” to create one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-[13px]">
              <thead className="bg-brand-soft/60 text-[12px] font-700 text-brand">
                <tr>
                  {canReorder && <th className="w-8" />}
                  <th className="px-5 py-3">Rule Name</th>
                  <th className="w-28 px-4 py-3">Action</th>
                  <th className="w-28 px-4 py-3">Status</th>
                  <th className="w-28 px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.flatMap((rule, index) => {
                  // In All mode, mark the first row of each claim so we can drop a group header above it.
                  const firstOfClaim = isAll && (index === 0 || rows[index - 1].claimId !== rule.claimId)
                  return [
                    firstOfClaim ? (
                      <tr key={`${rule.claimId}-head`} className="border-t border-line bg-brand-soft/40">
                        <td colSpan={canReorder ? 5 : 4} className="px-5 py-2.5 text-[11.5px] font-800 uppercase tracking-wide text-brand">
                          {claimById[rule.claimId]?.name}
                        </td>
                      </tr>
                    ) : null,
                    <tr
                      key={`${rule.claimId}-${rule.ref}`}
                      draggable={canReorder}
                      onDragStart={canReorder ? () => setDragIndex(index) : undefined}
                      onDragOver={canReorder ? (event) => event.preventDefault() : undefined}
                      onDrop={canReorder ? () => dropOn(index) : undefined}
                      onDragEnd={canReorder ? () => setDragIndex(null) : undefined}
                      className={`border-t border-line transition hover:bg-canvas/40 ${dragIndex === index ? "bg-brand-soft/40" : ""}`}
                    >
                      {canReorder && (
                        <td className="cursor-grab pl-3 text-muted/40 active:cursor-grabbing" aria-label="Drag to reorder">
                          <GripVertical size={16} />
                        </td>
                      )}
                      <td className="px-5 py-4 text-ink">{rule.when}</td>
                      <td className="px-4 py-4"><EffectPill effect={rule.effect} /></td>
                      <td className="px-4 py-4">
                        {rule.active === false ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1 text-[12px] font-600 text-muted">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" /> Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe9d8] bg-[#edf8f0] px-2.5 py-1 text-[12px] font-600 text-[#1f7a46]">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" /> Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => go({ name: "editor", creditType, claim: rule.claimId, ref: rule.ref, readOnly: true })}
                          aria-label={`View rule ${rule.when}`}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-brand transition hover:bg-brand-soft"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => go({ name: "editor", creditType, claim: rule.claimId, ref: rule.ref })}
                          aria-label={`Edit rule ${rule.ref}`}
                          className="inline-grid h-8 w-8 place-items-center rounded-lg text-brand transition hover:bg-brand-soft"
                        >
                          <PencilIcon />
                        </button>
                      </td>
                    </tr>,
                  ]
                })}
              </tbody>
            </table>
          </div>
        )}

        {isAll && externalClaims.length > 0 && (
          <div className="border-t border-line bg-canvas/40 px-5 py-4">
            <p className="mb-2.5 text-[11.5px] font-800 uppercase tracking-wide text-muted">Configured in other screens</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {externalClaims.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c.id)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left transition hover:border-brand-ring"
                >
                  <span>
                    <span className="block text-[13.5px] font-700 text-ink">{c.name}</span>
                    <span className="block text-[12px] text-muted">Set in the {screenName(c)}</span>
                  </span>
                  <ExternalLink size={15} className="shrink-0 text-brand" />
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </>
  )
}

function PencilIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* 4 · Rule editor                                                     */
/* ------------------------------------------------------------------ */

function parseParam(param: string): { field: string; op: string; value: string } {
  const m = param.match(/^(.*?)\s+(is not|is|=|>|<)\s+(.*)$/)
  if (m) return { field: m[1], op: m[2], value: m[3] }
  return { field: param, op: "is", value: "" }
}

function EditorPage({
  creditType,
  claim,
  ref_,
  readOnly = false,
  rules,
  claimById,
  onSave,
  go,
}: {
  creditType: string
  claim: ClaimId
  ref_: string
  readOnly?: boolean
  rules: Record<ClaimId, RuleRow[]>
  claimById: Record<ClaimId, Claim>
  onSave: (claim: ClaimId, rule: RuleRow) => void
  go: (v: PAView) => void
}) {
  const toast = useToast()
  const claimRules = rules[claim] ?? []
  const existing = useMemo(() => claimRules.find((r) => r.ref === ref_), [claimRules, ref_])
  const claimName = claimById[claim]?.name ?? claim
  const isNew = ref_ === "new"

  const seedConditions = (): Condition[] => {
    if (existing?.conditions?.length) return existing.conditions
    if (existing?.param) {
      const p = parseParam(existing.param)
      return [{ param: p.field, op: p.op, value: p.value, source: "Run context" }]
    }
    return [{ param: "Credit origin", op: "is", value: "", source: "Run context" }]
  }

  const [name, setName] = useState(existing?.when ?? "")
  const [active, setActive] = useState(existing?.active ?? true)
  const [conditions, setConditions] = useState<Condition[]>(seedConditions)
  const [effect, setEffect] = useState<Effect>(existing?.effect ?? "TAKE")
  const [amountWay, setAmountWay] = useState(existing?.amountWay ?? AMOUNT_WAY_OPTIONS[0])
  const [fixedAmount, setFixedAmount] = useState(existing?.fixedAmount ?? "")
  const [paramDesc, setParamDesc] = useState(existing?.paramDesc ?? existing?.whichParam ?? "")

  // Which "Amount to take" options open a follow-up field, and whether that field is a
  // parameter/calculation that still needs to be coded.
  const isFixed = amountWay === "A fixed amount"
  const isParamBased = amountWay === "A share of the credit, from a parameter" || amountWay === "The lower of two amounts"
  const paramDescLabel = amountWay === "The lower of two amounts" ? "Describe the two amounts / source" : "Describe the source parameter"

  const nextRef = () => String(Math.max(0, ...claimRules.map((r) => Number(r.ref) || 0)) + 1)

  const setCond = (i: number, patch: Partial<Condition>) =>
    setConditions((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const addCond = () => setConditions((cs) => [...cs, { param: "Credit origin", op: "is", value: "", source: "Run context" }])
  const removeCond = (i: number) => setConditions((cs) => (cs.length === 1 ? cs : cs.filter((_, idx) => idx !== i)))

  const save = () => {
    if (!name.trim()) {
      toast({ tone: "danger", title: "Name is required", body: "Give the rule a short name before saving." })
      return
    }
    const ref = isNew ? nextRef() : ref_
    const first = conditions[0]
    const detail = isFixed ? (fixedAmount.trim() ? `R$ ${fixedAmount.trim()}` : "") : isParamBased ? paramDesc.trim() : ""
    const then =
      effect === "TAKE" ? (detail ? `${amountWay} — ${detail}` : amountWay) : existing?.then ?? EFFECT_OPTIONS.find((o) => o.value === effect)?.label ?? ""
    onSave(claim, {
      ref,
      when: name.trim(),
      param: `${first.param} ${first.op} ${first.value}`.trim(),
      then,
      effect,
      position: existing?.position,
      active,
      conditions,
      amountWay,
      fixedAmount: isFixed ? fixedAmount.trim() : undefined,
      paramDesc: isParamBased ? paramDesc.trim() : undefined,
    })
    toast({ tone: "success", title: isNew ? "Rule created" : "Rule saved", body: `Ref ${ref} saved to ${claimName}.` })
    go({ name: "rules", creditType, focus: claim })
  }

  return (
    <>
      {/* Action bar at the top — Cancel / Save, per app standard */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-800 text-ink">{isNew ? "New rule" : readOnly ? `View rule — ${existing?.when ?? ref_}` : `Edit rule — ${existing?.when ?? ref_}`}</h1>
          <p className="mt-0.5 text-[13px] text-muted">In {claimName} · {creditType} profile — a condition and what the claim does when it holds.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {readOnly ? (
            <>
              <Button variant="outline" onClick={() => go({ name: "rules", creditType, focus: claim })}>
                <ChevronLeft size={16} /> Back
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => go({ name: "rules", creditType, focus: claim })}>Cancel</Button>
              <Button onClick={save}><Save size={15} /> Save</Button>
            </>
          )}
        </div>
      </div>

      <fieldset disabled={readOnly} className="min-w-0 space-y-5">
      <Card className="p-5">
        <p className="mb-3 text-[13px] font-800 text-ink">Rule</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" className="sm:col-span-2 lg:col-span-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Funrural on an invoice credit" />
          </Field>
          <Field label="In claim"><Input value={claimName} readOnly /></Field>
        </div>
        <div className="mt-3 max-w-[220px]">
          <Field label="Active">
            <Select value={active ? "yes" : "no"} onChange={(v) => setActive(v === "yes")} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-800 text-ink">When — every line must be true</p>
          <button
            type="button"
            onClick={() => toast({ tone: "info", title: "Test", body: "Runs this rule against the latest analysis to preview the effect." })}
            className="text-[12.5px] font-600 text-brand hover:underline"
          >
            Test
          </button>
        </div>

        <div className="space-y-2.5">
          {conditions.map((c, i) => (
            <div key={i} className="grid items-end gap-2.5 sm:grid-cols-[46px_minmax(0,1.3fr)_130px_minmax(0,1fr)_minmax(0,1fr)_36px]">
              <span className="pb-2.5 text-[12px] font-800 uppercase tracking-wide text-muted">{i === 0 ? "If" : "And"}</span>
              <Field label={i === 0 ? "Parameter" : ""}>
                <Select value={c.param} onChange={(v) => setCond(i, { param: v })} options={withValue(PARAM_FIELD_OPTIONS, c.param)} searchable />
              </Field>
              <Field label={i === 0 ? "Operator" : ""}>
                <Select value={c.op} onChange={(v) => setCond(i, { op: v })} options={OPERATOR_OPTIONS} />
              </Field>
              <Field label={i === 0 ? "Value" : ""}>
                <Input value={c.value} onChange={(e) => setCond(i, { value: e.target.value })} placeholder="e.g. Invoice" />
              </Field>
              <Field label={i === 0 ? "Source" : ""}>
                <Select value={c.source} onChange={(v) => setCond(i, { source: v })} options={withValue(SOURCE_OPTIONS, c.source)} />
              </Field>
              <button
                type="button"
                onClick={() => removeCond(i)}
                disabled={conditions.length === 1}
                aria-label="Remove condition"
                className="mb-0.5 inline-grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCond}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-ring px-3 py-2 text-[13px] font-600 text-brand transition hover:bg-brand-soft"
        >
          <Plus size={15} /> Add condition
        </button>
        <p className="mt-3 text-[12.5px] text-muted">Read top to bottom. If any line is false the rule is skipped and the next rule is tried.</p>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-[13px] font-800 text-ink">Then — pick one effect</p>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Field label="Action">
            <Select value={effect} onChange={(v) => setEffect(v as Effect)} options={EFFECT_OPTIONS} />
          </Field>
          <div className="flex items-end">
            <EffectPill effect={effect} />
          </div>
        </div>

        {effect === "TAKE" && (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Field label="Amount to take">
              <Select value={amountWay} onChange={setAmountWay} options={AMOUNT_WAY_OPTIONS.map((v) => ({ value: v, label: v }))} />
            </Field>
            {isFixed && (
              <Field label="Fixed amount">
                <Input value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} inputMode="decimal" placeholder="e.g. 1500.00" />
              </Field>
            )}
            {isParamBased && (
              <Field label={paramDescLabel}>
                <Input value={paramDesc} onChange={(e) => setParamDesc(e.target.value)} placeholder={`e.g. ${WHICH_PARAM_OPTIONS[0]}`} />
                <p className="mt-1.5 text-[12px] text-muted">The parameter and the calculation need to be coded.</p>
              </Field>
            )}
          </div>
        )}

      </Card>
      </fieldset>
    </>
  )
}

export default PaymentAnalysis
