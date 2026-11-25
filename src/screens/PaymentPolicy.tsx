import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, ChevronRight, Pencil, Plus } from "../components/icons"
import {
  Button,
  Field,
  FieldSet,
  Input,
  Modal,
  Select,
  useToast,
} from "../components/ui"

export type Policy = {
  code: number
  name: string
  basis: string
  ceiling: string
  split: string
  release: string
  status: "Active" | "Inactive"
}

export type Detail = {
  basis: string
  ceiling: string
  split: string
  release: string
  validFrom: string
  safety: string
  inss: string
  firstDelivery: string
  positionTable: string
  drawsBudget: string
  afterCeiling: string
  negotiatedVisits: { id: number; date: string; percent: string }[]
  releaseType: "Advance" | "Part of Tobacco Delivery"
  releaseAmount: string
}

const INITIAL_POLICIES: Policy[] = [
  {
    code: 1,
    name: "Free payment, any position",
    basis: "% of net revenue",
    ceiling: "30",
    split: "Full",
    release: "Automatic",
    status: "Inactive",
  },
  {
    code: 2,
    name: "Free on positions C and X",
    basis: "% of net revenue",
    ceiling: "30",
    split: "By position table",
    release: "Automatic",
    status: "Inactive",
  },
  {
    code: 3,
    name: "Free on positions C, B and T",
    basis: "% of net revenue",
    ceiling: "30",
    split: "By position table",
    release: "Automatic",
    status: "Inactive",
  },
  {
    code: 4,
    name: "Indebtedness driven",
    basis: "% of estimated volume",
    ceiling: "40",
    split: "By indebtedness",
    release: "Automatic",
    status: "Active",
  },
  {
    code: 5,
    name: "Free payment, positions if set",
    basis: "% of net revenue",
    ceiling: "30",
    split: "By position table",
    release: "Automatic",
    status: "Active",
  },
  {
    code: 6,
    name: "Negotiated per delivery",
    basis: "% of net revenue",
    ceiling: "30",
    split: "Negotiated",
    release: "Per delivery",
    status: "Inactive",
  },
  {
    code: 7,
    name: "Blocked with FT release",
    basis: "% of net revenue",
    ceiling: "30",
    split: "FT release",
    release: "Blocked with release",
    status: "Active",
  },
  {
    code: 8,
    name: "Debt only, no exceptions",
    basis: "None",
    ceiling: "-",
    split: "Full",
    release: "Automatic",
    status: "Inactive",
  },
]
const DEFAULT_DETAIL: Detail = {
  basis: "% of estimated volume",
  ceiling: "40",
  split: "By indebtedness",
  release: "Automatic",
  validFrom: "2026-09-01",
  safety: "10",
  inss: "2.5",
  firstDelivery: "In the position table",
  positionTable: "1 entry",
  drawsBudget: "No",
  afterCeiling: "Debt in full, then free",
  negotiatedVisits: [
    { id: 1, date: "2026-09-15", percent: "10" },
    { id: 2, date: "2026-10-15", percent: "20" },
  ],
  releaseType: "Advance",
  releaseAmount: "",
}

const POLICY_DETAILS: Record<number, Detail> = {
  1: {
    ...DEFAULT_DETAIL,
    basis: "% of net revenue",
    ceiling: "30",
    split: "Full",
    release: "Automatic",
    positionTable: "0 entries",
    inss: "11",
  },
  2: {
    ...DEFAULT_DETAIL,
    basis: "% of net revenue",
    ceiling: "30",
    split: "By position table",
    release: "Automatic",
    positionTable: "2 entries",
    inss: "11",
  },
  3: {
    ...DEFAULT_DETAIL,
    basis: "% of net revenue",
    ceiling: "30",
    split: "By position table",
    release: "Automatic",
    positionTable: "3 entries",
    inss: "11",
  },
  4: {
    ...DEFAULT_DETAIL,
    basis: "% of estimated volume",
    ceiling: "40",
    split: "By indebtedness",
    release: "Automatic",
    positionTable: "1 entry",
    inss: "2.5",
    drawsBudget: "No",
  },
  5: {
    ...DEFAULT_DETAIL,
    basis: "% of net revenue",
    ceiling: "30",
    split: "By position table",
    release: "Automatic",
    positionTable: "6 entries",
    inss: "11",
    drawsBudget: "No",
  },
  6: {
    ...DEFAULT_DETAIL,
    basis: "% of net revenue",
    ceiling: "30",
    split: "Negotiated",
    release: "Per delivery",
    positionTable: "0 entries",
    inss: "11",
    drawsBudget: "No",
  },
  7: {
    ...DEFAULT_DETAIL,
    basis: "% of net revenue",
    ceiling: "30",
    split: "FT release",
    release: "Blocked with release",
    positionTable: "0 entries",
    inss: "11",
    drawsBudget: "Yes",
  },
  8: {
    ...DEFAULT_DETAIL,
    basis: "None",
    ceiling: "",
    split: "Full",
    release: "Automatic",
    positionTable: "0 entries",
    inss: "",
    drawsBudget: "No",
  },
}

const BASIS_OPTIONS = [
  { value: "None", label: "None" },
  { value: "% of net revenue", label: "% of net revenue" },
  { value: "% Estimate", label: "% Estimate" },
  { value: "% of estimated volume", label: "% of estimated volume" },
  { value: "Fixed amount", label: "Fixed amount" },
]
const SPLIT_OPTIONS = [
  "Full",
  "By position table",
  "By indebtedness",
  "Negotiated",
  "FT release",
].map((value) => ({ value, label: value }))
const RELEASE_OPTIONS = [
  "Automatic",
  "Per delivery",
  "Blocked with release",
].map((value) => ({ value, label: value }))

const splitControlValues = (split: string) => {
  if (split === "Negotiated") {
    return { drawsBudget: "No", release: "Per delivery" }
  }

  if (split === "FT release") {
    return { drawsBudget: "Yes", release: "Blocked with release" }
  }

  return { drawsBudget: "No", release: "Automatic" }
}

const DEDUCTION_OPTIONS = [
  { value: "", label: "No deduction" },
  { value: "11", label: "INSS 1 · 11%" },
  { value: "75.50", label: "INSS 2 · Fixed 75.50" },
  { value: "2.5", label: "Professional Tax · 2.5%" },
]

const statusTone = (status: Policy["status"]) =>
  status === "Active"
    ? "text-[#187247] bg-[#edf8f1] border-[#ccebd8]"
    : "text-muted bg-canvas border-line"

export function PaymentPolicy({
  onConfigure,
  restore,
  onRestoreApplied,
  onEditorChange,
}: {
  onConfigure: (policy: Policy, positionTable: string, detail: Detail) => void
  restore?: { policy: Policy; detail: Detail } | null
  onRestoreApplied?: () => void
  onEditorChange?: (label: "Add New Policy" | "Policy Edit" | null) => void
}) {
  const toast = useToast()
  const [cropYear, setCropYear] = useState("2026/27")
  const [status, setStatus] = useState("All")
  const [policies, setPolicies] = useState(INITIAL_POLICIES)
  const [selected, setSelected] = useState<Policy | null>(
    () => restore?.policy ?? null,
  )
  const [detail, setDetail] = useState<Detail>(() =>
    restore?.detail ? { ...DEFAULT_DETAIL, ...restore.detail } : DEFAULT_DETAIL,
  )
  const [duplicateSource, setDuplicateSource] = useState<Policy | null>(null)
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false)
  const hierarchyNodes = [
    "NORTE / CLEITON",
    "NORTE / 406 - ENCOSTA SUL",
    "SUL / EDILSON",
    "SUL / 504 - RIO AZUL",
    "SUL / 603 ANDERSON",
  ]
  const [selectedHierarchyNodes, setSelectedHierarchyNodes] = useState(hierarchyNodes)
  const [hierarchyOpen, setHierarchyOpen] = useState(false)

  const visible = useMemo(
    () =>
      policies.filter((policy) => status === "All" || policy.status === status),
    [policies, status],
  )

  // HMR and older restored policy details may not yet contain this newer field.
  const negotiatedVisits = (
    detail.negotiatedVisits ?? DEFAULT_DETAIL.negotiatedVisits
  ).map((visit, index) => ({
    ...visit,
    date: visit.date || ["2026-09-15", "2026-10-15"][index] || "2026-11-15",
  }))

  // The breadcrumb follows the actual rendered view, including a restored editor.
  useEffect(() => {
    onEditorChange?.(
      selected
        ? selected.name === "New payment policy"
          ? "Add New Policy"
          : "Policy Edit"
        : null,
    )
  }, [onEditorChange, selected])

  const openPolicy = (policy: Policy) => {
    setSelected(policy)
    setDetail({
      ...(POLICY_DETAILS[policy.code] ?? DEFAULT_DETAIL),
      basis: policy.basis,
      ceiling: policy.ceiling === "-" ? "" : policy.ceiling,
      split: policy.split,
      release: policy.release,
    })
  }

  const newPolicy = () => {
    const policy: Policy = {
      code: policies.length + 1,
      name: "New payment policy",
      basis: "% of net revenue",
      ceiling: "30",
      split: "Full",
      release: "Automatic",
      status: "Active",
    }
    setSelected(policy)
    setDetail({
      ...DEFAULT_DETAIL,
      basis: policy.basis,
      ceiling: policy.ceiling,
      split: policy.split,
    })
  }

  const saveDetail = () => {
    if (!selected) return
    setPolicies((current) => {
      const next = {
        ...selected,
        basis: detail.basis,
        ceiling: detail.ceiling || "-",
        split: detail.split,
        release: detail.release,
      }
      const exists = current.some((policy) => policy.code === selected.code)
      return exists
        ? current.map((policy) =>
            policy.code === selected.code ? next : policy,
          )
        : [...current, next]
    })
    toast({
      title: "Payment policy saved",
      body: `${selected.name} is ready to use.`,
      tone: "success",
    })
    setSelected(null)
  }

  const closeEditor = () => {
    setSelected(null)
  }

  const confirmDuplicate = () => {
    if (!duplicateSource) return
    const clone = {
      ...duplicateSource,
      code: policies.length + 1,
      name: `${duplicateSource.name} copy`,
      status: "Active" as const,
    }
    setPolicies((current) => [...current, clone])
    setDuplicateSource(null)
    setDuplicateConfirmOpen(false)
    toast({
      title: "Payment policy duplicated",
      body: `${clone.name} was added.`,
      tone: "success",
    })
  }

  if (selected) {
    return (
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <h1 className="text-[23px] font-800 text-ink">
            {selected.name === "New payment policy"
              ? "Add New Policy"
              : `Edit policy · ${selected.code}`}
          </h1>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
            <Button onClick={saveDetail}>
              <Check size={16} /> Save policy
            </Button>
          </div>
        </div>

        <FieldSet title="Policy information">
          <div className="grid gap-4 md:grid-cols-12">
            <Field label="Policy name" className="md:col-span-8">
              <Input
                value={selected.name}
                onChange={(event) =>
                  setSelected({ ...selected, name: event.target.value })
                }
                placeholder="Enter payment policy name"
              />
            </Field>
            <Field label="Status" className="md:col-span-4">
              <button
                onClick={() =>
                  setSelected({
                    ...selected,
                    status:
                      selected.status === "Active" ? "Inactive" : "Active",
                  })
                }
                role="switch"
                aria-checked={selected.status === "Active"}
                className="flex h-10 w-full items-center justify-between rounded-lg border border-line bg-white px-3 text-[14px] text-ink"
              >
                <span>{selected.status}</span>
                <span
                  className={`relative h-6 w-11 rounded-full ${
                    selected.status === "Active" ? "bg-brand" : "bg-[#c4cfe4]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                      selected.status === "Active" ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
            </Field>
          </div>
        </FieldSet>

        <FieldSet title="Ceiling and payment split">
          <div className="grid gap-4 md:grid-cols-12">
            <Field label="Ceiling basis" className="md:col-span-3">
              <Select
                value={detail.basis}
                onChange={(basis) =>
                  setDetail({
                    ...detail,
                    basis,
                    ceiling: basis === "None" ? "0" : detail.ceiling,
                  })
                }
                options={BASIS_OPTIONS}
              />
            </Field>
            <Field label="Ceiling %" className="md:col-span-2">
              <Input
                value={detail.ceiling}
                disabled={detail.basis === "None"}
                onChange={(event) =>
                  setDetail({ ...detail, ceiling: event.target.value })
                }
              />
            </Field>
            <Field label="Per-delivery split" className="md:col-span-2">
              <Select
                value={detail.split}
                onChange={(split) =>
                  setDetail({
                    ...detail,
                    split,
                    ...splitControlValues(split),
                  })
                }
                options={SPLIT_OPTIONS}
              />
            </Field>
            <Field label="Draws on budget" className="md:col-span-2">
              <Select
                value={detail.drawsBudget}
                disabled
                onChange={() => undefined}
                options={[
                  { value: "No", label: "No" },
                  { value: "Yes", label: "Yes" },
                ]}
              />
            </Field>
            <Field label="Release control" className="md:col-span-3">
              <Select
                value={detail.release}
                disabled
                onChange={() => undefined}
                options={RELEASE_OPTIONS}
              />
            </Field>
          </div>
        </FieldSet>

        {detail.split === "By position table" ? (
          <FieldSet
            title="Position table"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onConfigure(selected, detail.positionTable, detail)
                }
              >
                Configure
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Registered entries">
                <Input value={detail.positionTable} readOnly />
              </Field>
              <Field label="Min. first delivery">
                <Input value={detail.firstDelivery} disabled />
              </Field>
            </div>
          </FieldSet>
        ) : detail.split === "Full" ? (
          <FieldSet title="Per-delivery split: Full">
            <div className="rounded-lg border border-[#ccebd8] bg-[#edf8f1] px-4 py-3 text-[13px] leading-relaxed text-[#187247]">
              The per-delivery split is <span className="font-700">100%</span>.
              The full eligible amount is released on each delivery, subject to
              the configured ceiling.
            </div>
          </FieldSet>
        ) : detail.split === "By indebtedness" ? (
          <FieldSet title="Per-delivery split: By indebtedness">
            <div className="rounded-lg border border-brand-soft bg-brand-soft/45 px-4 py-3">
              <p className="text-[13px] font-600 text-ink">
                Current debt-based release rate
              </p>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                Derived from the farmer’s outstanding balance and approved
                safety margin; it recalculates automatically when either value
                changes.
              </p>
            </div>
          </FieldSet>
        ) : detail.split === "Negotiated" ? (
          <FieldSet title="Per-delivery split: Negotiated">
            <div className="rounded-lg border border-brand-soft bg-brand-soft/45 px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
              <p className="font-600 text-ink">
                Negotiated at the payment stage
              </p>
              <p className="mt-1">
                This policy permits payment percentages to be agreed for each
                farmer and delivery. The visit schedule and negotiated
                percentage are recorded when the payment is processed.
              </p>
            </div>
          </FieldSet>
        ) : detail.split === "FT release" ? (
          <FieldSet title="Per-delivery split: Field Technician release">
            <div className="rounded-lg border border-brand-soft bg-brand-soft/45 px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
              <p className="font-600 text-ink">
                Field Technician approval required
              </p>
              <p className="mt-1">
                This policy holds the payment for Field Technician release. The
                release method, approved amount, and available budget are
                confirmed against the specific farmer delivery.
              </p>
            </div>
          </FieldSet>
        ) : (
          <FieldSet title={`Per-delivery split: ${detail.split}`}>
            <div className="rounded-lg border border-line bg-canvas px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
              This policy uses the{" "}
              <span className="font-700 text-ink">{detail.split}</span> release
              rule for each delivery.
            </div>
          </FieldSet>
        )}

        <FieldSet title="OTHER configurations">
          <div className="grid gap-4 md:grid-cols-12">
            <Field label="Valid from" className="md:col-span-3">
              <Input
                type="date"
                value={detail.validFrom}
                onChange={(event) =>
                  setDetail({ ...detail, validFrom: event.target.value })
                }
              />
            </Field>
            <Field label="Safety margin %" className="md:col-span-2">
              <Input
                value={detail.safety}
                onChange={(event) =>
                  setDetail({ ...detail, safety: event.target.value })
                }
              />
            </Field>
            <Field label="Deduction" className="md:col-span-2">
              <Select
                value={detail.inss}
                onChange={(inss) => setDetail({ ...detail, inss })}
                options={DEDUCTION_OPTIONS}
              />
            </Field>
            <Field label="After the ceiling" className="md:col-span-3">
              <Select
                value={detail.afterCeiling}
                onChange={(afterCeiling) => setDetail({ ...detail, afterCeiling })}
                options={[{ value: "Debt in full, then free", label: "Debt in full, then free" }]}
              />
            </Field>
          </div>
        </FieldSet>

        {selected.name === "New payment policy" ? (
          <FieldSet title="Hierarchy nodes">
            <p className="mb-4 max-w-3xl text-[13px] leading-relaxed text-ink-soft">
              Select the hierarchy nodes to which this policy is applicable. By default, the policy applies to the entire tree; unselect any node as needed.
            </p>
            <div className="relative max-w-2xl">
              <button
                type="button"
                aria-expanded={hierarchyOpen}
                onClick={() => setHierarchyOpen((open) => !open)}
                className="flex min-h-10 w-full items-center justify-between rounded-lg border border-line bg-white px-3 text-left text-[14px] text-ink transition hover:border-brand"
              >
                <span>{selectedHierarchyNodes.length === hierarchyNodes.length ? "Entire hierarchy" : `${selectedHierarchyNodes.length} node${selectedHierarchyNodes.length === 1 ? "" : "s"} selected`}</span>
                <ChevronDown size={16} className="text-muted" />
              </button>
              {hierarchyOpen ? (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-line bg-white p-2 shadow-lg">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-brand-soft/55 px-3 py-2 text-[13px] font-700 text-brand">
                    <input
                      type="checkbox"
                      checked={selectedHierarchyNodes.length === hierarchyNodes.length}
                      onChange={(event) => setSelectedHierarchyNodes(event.target.checked ? hierarchyNodes : [])}
                      className="h-4 w-4 accent-brand"
                    />
                    <ChevronDown size={15} /> Brasil
                  </label>
                  <p className="px-9 py-2 text-[12px] font-600 text-muted">Region name</p>
                  {["NORTE", "SUL"].map((region) => (
                    <div key={region} className="mb-1">
                      <p className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-700 text-ink"><ChevronDown size={15} className="text-muted" />{region}</p>
                      {hierarchyNodes.filter((node) => node.startsWith(region)).map((node) => (
                        <label key={node} className="ml-6 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] text-ink-soft hover:bg-canvas">
                          <input type="checkbox" checked={selectedHierarchyNodes.includes(node)} onChange={() => setSelectedHierarchyNodes((current) => current.includes(node) ? current.filter((item) => item !== node) : [...current, node])} className="h-4 w-4 accent-brand" />
                          <ChevronRight size={14} className="text-muted" />
                          {node.split(" / ")[1]}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </FieldSet>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)] lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Crop season" className="w-[150px]">
            <Select
              value={cropYear}
              onChange={setCropYear}
              options={[
                { value: "2025/26", label: "2025/26" },
                { value: "2026/27", label: "2026/27" },
                { value: "2027/28", label: "2027/28" },
              ]}
            />
          </Field>
          <Field label="Status" className="w-[150px]">
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: "All", label: "All" },
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
              ]}
            />
          </Field>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            disabled={!duplicateSource}
            onClick={() => setDuplicateConfirmOpen(true)}
          >
            Duplicate
          </Button>
          <Button onClick={newPolicy}>
            <Plus size={16} /> New policy
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-[13px]">
            <thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand">
              <tr>
                <th className="w-[56px] px-4 py-3">Select</th>
                <th className="w-[70px] px-4 py-3">Code</th>
                <th className="min-w-[245px] px-4 py-3">Name</th>
                <th className="min-w-[180px] px-4 py-3">Ceiling basis</th>
                <th className="w-[100px] px-4 py-3">Ceiling %</th>
                <th className="min-w-[210px] px-4 py-3">Per-delivery split</th>
                <th className="min-w-[170px] px-4 py-3">Release control</th>
                <th className="w-[125px] px-4 py-3">Status</th>
                <th className="w-[78px] px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((policy) => (
                <tr
                  key={policy.code}
                  className="border-t border-line transition hover:bg-canvas/70"
                >
                  <td className="px-4 py-3">
                    <input
                      type="radio"
                      name="duplicate-policy"
                      checked={duplicateSource?.code === policy.code}
                      onChange={() => setDuplicateSource(policy)}
                      className="h-4 w-4 accent-[#004f9e]"
                      aria-label={`Select ${policy.name} to duplicate`}
                    />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {policy.code}
                  </td>
                  <td className="px-4 py-3 font-600 text-ink">{policy.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{policy.basis}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">
                    {policy.ceiling}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{policy.split}</td>
                  <td className="px-4 py-3 text-ink-soft">{policy.release}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[12px] font-600 ${statusTone(policy.status)}`}
                    >
                      {policy.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      aria-label={`Edit ${policy.name}`}
                      onClick={() => openPolicy(policy)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={duplicateConfirmOpen}
        onClose={() => setDuplicateConfirmOpen(false)}
        title="Duplicate payment policy"
        width="max-w-md"
      >
        {duplicateSource ? (
          <>
            <p className="text-[14px] leading-relaxed text-ink-soft">
              Create a new payment policy using{" "}
              <span className="font-700 text-ink">{duplicateSource.name}</span>{" "}
              as the source?
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="outline"
                onClick={() => setDuplicateConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={confirmDuplicate}>Yes, duplicate</Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  )
}
