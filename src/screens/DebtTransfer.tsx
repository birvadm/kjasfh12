import { useEffect, useMemo, useState } from "react"
import { Check, Eye, Info } from "../components/icons"
import {
  Badge,
  Button,
  Field,
  Input,
  Label,
  Pagination,
  Select,
} from "../components/ui"
import {
  DebtTransferReports,
  type DebtTransferReport,
} from "./DebtTransferReports"

export type DebtRow = {
  id: string
  code: string
  farmer: string
  contract: string
  crop: string
  status: "Active" | "Inactive"
  segment: "Gold" | "Silver" | "Bronze"
  estimate: string
  delivered: string
  balance: string
  indebtedness: string
  debtType: "Production advance" | "Supplies" | "Freight"
  node: string
}

export type DebtLine = {
  id: string
  type: "Billing" | "Investments" | "Production advance" | "Freight" | "Supplies"
  debt: string
  installment: string
  dueDate: string
  overdue: boolean
  balance: number
}

const DEBTS: DebtRow[] = [
  {
    id: "d1",
    code: "512004",
    farmer: "Helena Kunz",
    contract: "4-1",
    crop: "2026",
    status: "Active",
    segment: "Gold",
    estimate: "2,382",
    delivered: "0",
    balance: "9,329.75",
    indebtedness: "20.13%",
    debtType: "Supplies",
    node: "Santa Cruz do Sul",
  },
  {
    id: "d2",
    code: "517333",
    farmer: "Rafael Bortolini",
    contract: "4-1",
    crop: "2026",
    status: "Active",
    segment: "Silver",
    estimate: "6,415",
    delivered: "3,114",
    balance: "1,707.42",
    indebtedness: "-4.34%",
    debtType: "Production advance",
    node: "Rio Pardo",
  },
  {
    id: "d3",
    code: "520117",
    farmer: "Camila Reis",
    contract: "3-1",
    crop: "2026",
    status: "Inactive",
    segment: "Bronze",
    estimate: "1,236",
    delivered: "0",
    balance: "24,062.28",
    indebtedness: "100.04%",
    debtType: "Freight",
    node: "Vera Cruz",
  },
  {
    id: "d4",
    code: "524880",
    farmer: "Nina Sachs",
    contract: "2-1",
    crop: "2026",
    status: "Active",
    segment: "Gold",
    estimate: "4,905",
    delivered: "1,540",
    balance: "6,412.90",
    indebtedness: "13.02%",
    debtType: "Supplies",
    node: "Santa Cruz do Sul",
  },
  {
    id: "d5",
    code: "529344",
    farmer: "Lucas Meireles",
    contract: "1-2",
    crop: "2026",
    status: "Active",
    segment: "Silver",
    estimate: "3,760",
    delivered: "820",
    balance: "4,185.70",
    indebtedness: "11.26%",
    debtType: "Supplies",
    node: "Santa Cruz do Sul",
  },
  {
    id: "d6",
    code: "531028",
    farmer: "Bruna Fagundes",
    contract: "2-3",
    crop: "2026",
    status: "Active",
    segment: "Gold",
    estimate: "5,118",
    delivered: "1,244",
    balance: "2,968.40",
    indebtedness: "7.44%",
    debtType: "Supplies",
    node: "Rio Pardo",
  },
]

export type DebtRequest = {
  id: string
  raisedBy: string
  raisedOn: string
  originCode: string
  originFarmer: string
  originContract?: string
  destCode: string
  destFarmer: string
  destContract?: string
  debts: number
  value: string
  status: "Waiting" | "Approved" | "Rejected"
  node: string
  fieldTech: string
  note: string
  lines: DebtLine[]
}

export const DEBT_REQUESTS: DebtRequest[] = [
  {
    id: "FT-1188",
    raisedBy: "FT area 410",
    raisedOn: "20/08/2026 14:32",
    originCode: "512004",
    originFarmer: "Helena Kunz",
    destCode: "448190",
    destFarmer: "Manuela Wachholz",
    destContract: "4-1",
    debts: 3,
    value: "7,204.66",
    status: "Waiting",
    node: "Santa Cruz do Sul",
    fieldTech: "FT area 410",
    note: "Please split the furnace debt into 3 installments if possible — the farmer cannot take it in one.",
    lines: [
      {
        id: "ft1188-1",
        type: "Billing",
        debt: "Billing supplies",
        installment: "1/3",
        dueDate: "30/06/2027",
        overdue: false,
        balance: 2125.09,
      },
      {
        id: "ft1188-2",
        type: "Billing",
        debt: "Billing supplies",
        installment: "2/3",
        dueDate: "31/10/2027",
        overdue: false,
        balance: 2125.09,
      },
      {
        id: "ft1188-3",
        type: "Investments",
        debt: "One block furnace",
        installment: "-",
        dueDate: "30/06/2027",
        overdue: false,
        balance: 2954.48,
      },
    ],
  },
  {
    id: "FT-1185",
    raisedBy: "FT area 512",
    raisedOn: "15/08/2026 10:07",
    originCode: "511902",
    originFarmer: "Otávio Lindner",
    destCode: "447631",
    destFarmer: "Bianca Fuchs",
    debts: 1,
    value: "5,060.00",
    status: "Approved",
    node: "Rio Pardo",
    fieldTech: "FT area 512",
    note: "Farmer relocated to the new contract — move the freight balance across.",
    lines: [
      {
        id: "ft1185-1",
        type: "Freight",
        debt: "Field freight",
        installment: "-",
        dueDate: "30/09/2026",
        overdue: false,
        balance: 5060.0,
      },
    ],
  },
  {
    id: "FT-1179",
    raisedBy: "FT area 208",
    raisedOn: "09/08/2026 16:45",
    originCode: "509440",
    originFarmer: "Nina Sachs",
    destCode: "460777",
    destFarmer: "Lucas Meireles",
    debts: 2,
    value: "6,412.90",
    status: "Rejected",
    node: "Vera Cruz",
    fieldTech: "FT area 208",
    note: "Requesting transfer of the fertilizer batch to the son's contract.",
    lines: [
      {
        id: "ft1179-1",
        type: "Supplies",
        debt: "Fertilizer batch",
        installment: "1/2",
        dueDate: "20/07/2027",
        overdue: false,
        balance: 3206.45,
      },
      {
        id: "ft1179-2",
        type: "Supplies",
        debt: "Fertilizer batch",
        installment: "2/2",
        dueDate: "20/11/2027",
        overdue: false,
        balance: 3206.45,
      },
    ],
  },
]

export const DEBT_LINES: Record<string, DebtLine[]> = {
  d1: [
    {
      id: "d1-1",
      type: "Billing",
      debt: "Billing supplies",
      installment: "1/3",
      dueDate: "30/06/2027",
      overdue: false,
      balance: 2125.09,
    },
    {
      id: "d1-2",
      type: "Billing",
      debt: "Billing supplies",
      installment: "2/3",
      dueDate: "31/10/2027",
      overdue: false,
      balance: 2125.09,
    },
    {
      id: "d1-3",
      type: "Billing",
      debt: "Billing supplies",
      installment: "3/3",
      dueDate: "28/02/2028",
      overdue: false,
      balance: 2125.09,
    },
    {
      id: "d1-4",
      type: "Investments",
      debt: "One block furnace",
      installment: "-",
      dueDate: "30/04/2026",
      overdue: true,
      balance: 2954.48,
    },
  ],
  d2: [
    {
      id: "d2-1",
      type: "Production advance",
      debt: "Seedling advance",
      installment: "1/2",
      dueDate: "15/05/2027",
      overdue: false,
      balance: 853.71,
    },
    {
      id: "d2-2",
      type: "Production advance",
      debt: "Seedling advance",
      installment: "2/2",
      dueDate: "15/09/2027",
      overdue: false,
      balance: 853.71,
    },
  ],
  d3: [
    {
      id: "d3-1",
      type: "Freight",
      debt: "Field freight",
      installment: "-",
      dueDate: "30/04/2026",
      overdue: true,
      balance: 12031.14,
    },
    {
      id: "d3-2",
      type: "Freight",
      debt: "Field freight",
      installment: "-",
      dueDate: "30/09/2026",
      overdue: false,
      balance: 12031.14,
    },
  ],
  d4: [
    {
      id: "d4-1",
      type: "Supplies",
      debt: "Fertilizer batch",
      installment: "1/2",
      dueDate: "20/07/2027",
      overdue: false,
      balance: 3206.45,
    },
    {
      id: "d4-2",
      type: "Supplies",
      debt: "Fertilizer batch",
      installment: "2/2",
      dueDate: "20/11/2027",
      overdue: false,
      balance: 3206.45,
    },
  ],
  d5: [
    {
      id: "d5-1",
      type: "Supplies",
      debt: "Crop protection",
      installment: "1/2",
      dueDate: "15/08/2027",
      overdue: false,
      balance: 2092.85,
    },
    {
      id: "d5-2",
      type: "Supplies",
      debt: "Crop protection",
      installment: "2/2",
      dueDate: "15/12/2027",
      overdue: false,
      balance: 2092.85,
    },
  ],
  d6: [
    {
      id: "d6-1",
      type: "Supplies",
      debt: "Curing materials",
      installment: "-",
      dueDate: "10/09/2027",
      overdue: false,
      balance: 2968.4,
    },
  ],
}

export const DESTINATION_FARMERS = [
  {
    value: "448190",
    label: "448190 · Manuela Wachholz",
    contracts: ["4-1", "4-2"],
    existing: 9329.75,
    indebtedness: 20.13,
  },
  {
    value: "451022",
    label: "451022 · Otávio Lindner",
    contracts: ["2-1", "3-1"],
    existing: 4180.0,
    indebtedness: 8.7,
  },
  {
    value: "460777",
    label: "460777 · Bianca Fuchs",
    contracts: ["5-1"],
    existing: 0,
    indebtedness: 0,
  },
  {
    value: "471309",
    label: "471309 · Lucas Meireles",
    contracts: ["1-1", "1-2"],
    existing: 15220.5,
    indebtedness: 42.6,
  },
]

export type TransferLine = {
  id: string
  type: DebtLine["type"]
  debt: string
  installment: string
  dueDate: string
  value: number
}

export type TransferSetup = {
  originLabel: string
  destLabel: string
  goesTo: string
  justification: string
  lines: TransferLine[]
}

export type CarryOverSetup = {
  debtType: string
  fromCrop: string
  farmer: string
  farmersFlagged: number
  debtsToMove: number
  valueCarriedOver: number
}

const segmentTone: Record<DebtRow["segment"], "amber" | "neutral" | "red"> = {
  Gold: "amber",
  Silver: "neutral",
  Bronze: "red",
}

const requestStatusTone: Record<DebtRequest["status"], "amber" | "green" | "red"> =
  {
    Waiting: "amber",
    Approved: "green",
    Rejected: "red",
  }

const requestContracts: Record<string, { origin: string; destination: string }> = {
  "FT-1188": { origin: "4-1", destination: "4-2" },
  "FT-1185": { origin: "3-1", destination: "2-1" },
  "FT-1179": { origin: "2-1", destination: "1-1" },
}

export function DebtTransfer({
  onViewTransfer,
  onViewRequest,
  onCarryOver,
  onViewReport,
  initialTab = "transfer",
}: {
  onViewTransfer?: (row: DebtRow) => void
  onViewRequest?: (request: DebtRequest) => void
  onCarryOver?: (setup: CarryOverSetup) => void
  onViewReport?: (report: DebtTransferReport) => void
  initialTab?: "transfer" | "requests" | "reports"
}) {
  const [tab, setTab] = useState<"transfer" | "requests" | "reports">(
    initialTab,
  )
  const [cropYear, setCropYear] = useState("2026/27")
  const [node, setNode] = useState("All")
  const [farmer, setFarmer] = useState("")
  const [segment, setSegment] = useState("All")
  const [debtType, setDebtType] = useState("All")
  const [fieldTech, setFieldTech] = useState("All")
  const [requestStatus, setRequestStatus] = useState("Waiting")
  const [transferPage, setTransferPage] = useState(1)
  const [requestPage, setRequestPage] = useState(1)
  const [carryOverIds, setCarryOverIds] = useState<string[]>([])
  const pageSize = 10
  const specificDebtType = debtType !== "All"

  const visibleRows = useMemo(() => {
    const query = farmer.trim().toLowerCase()
    return DEBTS.filter((row) => {
      const matchesQuery =
        !query ||
        `${row.code} ${row.farmer} ${row.contract}`
          .toLowerCase()
          .includes(query)
      return (
        matchesQuery &&
        (node === "All" || row.node === node) &&
        (segment === "All" || row.segment === segment) &&
        (debtType === "All" || row.debtType === debtType)
      )
    })
  }, [debtType, farmer, node, segment])

  const visibleRequests = useMemo(() => {
    return DEBT_REQUESTS.filter((request) => {
      return (
        (node === "All" || request.node === node) &&
        (fieldTech === "All" || request.fieldTech === fieldTech) &&
        (requestStatus === "All" || request.status === requestStatus)
      )
    })
  }, [fieldTech, node, requestStatus])

  const fieldTechOptions = [
    "All",
    ...Array.from(new Set(DEBT_REQUESTS.map((request) => request.fieldTech))),
  ]

  // Picking a specific debt type enables carry over; pre-select every matching row so the
  // user only has to unselect the ones they want to leave out. Reverting to "All" clears it.
  useEffect(() => {
    if (specificDebtType) {
      setCarryOverIds(visibleRows.map((row) => row.id))
    } else {
      setCarryOverIds([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtType])

  const carryOverRows = specificDebtType
    ? visibleRows.filter((row) => carryOverIds.includes(row.id))
    : []
  const canCarryOver = carryOverRows.length > 0

  const carryOver = () => {
    if (!carryOverRows.length) return
    const lines = carryOverRows.flatMap(
      (row) => DEBT_LINES[row.id.replace(/^r-/, "")] ?? [],
    )
    onCarryOver?.({
      debtType,
      fromCrop: carryOverRows[0].crop,
      farmer:
        carryOverRows.length === 1
          ? `${carryOverRows[0].code} ${carryOverRows[0].farmer}`
          : `${carryOverRows.length} farmers selected`,
      farmersFlagged: carryOverRows.length,
      debtsToMove: lines.length,
      valueCarriedOver: lines.reduce((sum, line) => sum + line.balance, 0),
    })
  }

  const pagedRows = visibleRows.slice(
    (transferPage - 1) * pageSize,
    transferPage * pageSize,
  )
  const pagedRequests = visibleRequests.slice(
    (requestPage - 1) * pageSize,
    requestPage * pageSize,
  )

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-white px-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="flex gap-7 overflow-x-auto border-b border-line">
          <button
            type="button"
            onClick={() => setTab("transfer")}
            className={`relative shrink-0 py-4 text-[14px] font-700 transition after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:content-[''] ${
              tab === "transfer"
                ? "text-brand after:bg-brand"
                : "text-muted after:bg-transparent hover:text-ink"
            }`}
          >
            Transfer
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={`relative shrink-0 py-4 text-[14px] font-700 transition after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:content-[''] ${
              tab === "requests"
                ? "text-brand after:bg-brand"
                : "text-muted after:bg-transparent hover:text-ink"
            }`}
          >
            Debt Transfer Approval
          </button>
          <button
            type="button"
            onClick={() => setTab("reports")}
            className={`relative shrink-0 py-4 text-[14px] font-700 transition after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:content-[''] ${
              tab === "reports"
                ? "text-brand after:bg-brand"
                : "text-muted after:bg-transparent hover:text-ink"
            }`}
          >
            Reports
          </button>
        </div>
      </div>

      {tab === "transfer" ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-[150px_170px_minmax(210px,1fr)_150px_170px]">
              <Field label="Crop season">
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
              <Field label="Node">
                <Select
                  value={node}
                  onChange={setNode}
                  options={[
                    "All",
                    "Santa Cruz do Sul",
                    "Rio Pardo",
                    "Vera Cruz",
                  ].map((value) => ({ value, label: value }))}
                />
              </Field>
              <Field label="Farmer">
                <Input
                  value={farmer}
                  onChange={(event) => setFarmer(event.target.value)}
                  placeholder="Search farmer"
                />
              </Field>
              <Field label="Segment">
                <Select
                  value={segment}
                  onChange={setSegment}
                  options={["All", "Gold", "Silver", "Bronze"].map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </Field>
              <div>
                <Label>Debt type</Label>
                <Select
                  value={debtType}
                  onChange={setDebtType}
                  options={[
                    "All",
                    "Production advance",
                    "Supplies",
                    "Freight",
                  ].map((value) => ({ value, label: value }))}
                />
              </div>
            </div>
            <div className="flex w-full items-center justify-end gap-3 lg:w-auto">
              <Button onClick={carryOver} disabled={!canCarryOver}>
                <Check size={16} /> Carry over
              </Button>
              <span
                title="Carry over is available only when individual debts are selected. Select one or more individual debts to enable this option."
                aria-label="Carry over is available only when individual debts are selected. Select one or more individual debts to enable this option."
                className="inline-flex cursor-help text-muted/75"
              >
                <Info size={16} />
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1160px] text-left text-[13px]">
                <thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand">
                  <tr>
                    {specificDebtType ? (
                      <th className="w-14 px-4 py-3">Select</th>
                    ) : null}
                    <th className="px-4 py-3">Code</th>
                    <th className="min-w-[160px] px-4 py-3">Farmer</th>
                    <th className="px-4 py-3">Contract ID</th>
                    <th className="px-4 py-3">Crop</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Segment</th>
                    <th className="px-4 py-3 text-right">Estimate kg</th>
                    <th className="px-4 py-3 text-right">Delivered kg</th>
                    <th className="px-4 py-3 text-right">Debt balance</th>
                    <th className="px-4 py-3 text-right">Indebtedness</th>
                    <th className="w-24 px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length ? (
                    pagedRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`border-t border-line transition hover:bg-canvas/65 ${
                          carryOverIds.includes(row.id)
                            ? "bg-brand-soft/35"
                            : ""
                        }`}
                      >
                        {specificDebtType ? (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={carryOverIds.includes(row.id)}
                              onChange={() =>
                                setCarryOverIds((selected) =>
                                  selected.includes(row.id)
                                    ? selected.filter((id) => id !== row.id)
                                    : [...selected, row.id],
                                )
                              }
                              className="h-4 w-4 rounded accent-[#004f9e]"
                              aria-label={`Select ${row.farmer}`}
                            />
                          </td>
                        ) : null}
                        <td className="px-4 py-3 font-600 tabular-nums text-ink">
                          {row.code}
                        </td>
                        <td className="px-4 py-3 font-600 text-ink">
                          {row.farmer}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">
                          {row.contract}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-ink-soft">
                          {row.crop}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-[12px] font-600 ${
                              row.status === "Active"
                                ? "border-[#ccebd8] bg-[#edf8f1] text-[#187247]"
                                : "border-line bg-canvas text-muted"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={segmentTone[row.segment]}>
                            {row.segment}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                          {row.estimate}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                          {row.delivered}
                        </td>
                        <td className="px-4 py-3 text-right font-600 tabular-nums text-ink">
                          {row.balance}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                          {row.indebtedness}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onViewTransfer?.(row)}
                            aria-label={`View ${row.farmer}`}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand ml-auto"
                          >
                            <Eye size={17} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={specificDebtType ? 12 : 11}
                        className="px-4 py-8 text-center text-muted"
                      >
                        No debt records match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={transferPage}
              pageSize={pageSize}
              total={visibleRows.length}
              onPageChange={setTransferPage}
            />
          </div>
        </>
      ) : tab === "requests" ? (
        <>
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-[150px_170px_200px_170px]">
              <Field label="Crop season">
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
              <Field label="Node">
                <Select
                  value={node}
                  onChange={setNode}
                  options={[
                    "All",
                    "Santa Cruz do Sul",
                    "Rio Pardo",
                    "Vera Cruz",
                  ].map((value) => ({ value, label: value }))}
                />
              </Field>
              <Field label="Field Technician">
                <Select
                  value={fieldTech}
                  onChange={setFieldTech}
                  searchable
                  options={fieldTechOptions.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={requestStatus}
                  onChange={setRequestStatus}
                  options={["All", "Waiting", "Approved", "Rejected"].map(
                    (value) => ({ value, label: value }),
                  )}
                />
              </Field>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-[13px]">
                <thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand">
                  <tr>
                    <th className="px-4 py-3">Request</th>
                    <th className="px-4 py-3">Raised by</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="min-w-[190px] bg-[#fff6db] px-4 py-3 text-[#856019]">Origin farmer</th>
                    <th className="bg-[#fff6db] px-4 py-3 text-[#856019]">Origin contract</th>
                    <th className="min-w-[190px] bg-[#edf8f0] px-4 py-3 text-[#28734b]">
                      Destination farmer
                    </th>
                    <th className="bg-[#edf8f0] px-4 py-3 text-[#28734b]">Destination contract</th>
                    <th className="px-4 py-3 text-right">Debts</th>
                    <th className="px-4 py-3 text-right">Value</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="w-24 px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRequests.length ? (
                    pagedRequests.map((request) => (
                      <tr
                        key={request.id}
                        className="border-t border-line transition hover:bg-canvas/65"
                      >
                        <td className="px-4 py-3 font-700 text-brand">
                          {request.id}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">
                          {request.raisedBy}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-ink-soft">
                          {request.raisedOn}
                        </td>
                        <td className="bg-[#fff6db]/60 px-4 py-3 text-ink">
                          <span className="font-600 tabular-nums">
                            {request.originCode}
                          </span>{" "}
                          {request.originFarmer}
                        </td>
                        <td className="bg-[#fff6db]/60 px-4 py-3 tabular-nums text-ink-soft">
                          {request.originContract ?? requestContracts[request.id]?.origin ?? "—"}
                        </td>
                        <td className="bg-[#edf8f0]/70 px-4 py-3 text-ink">
                          <span className="font-600 tabular-nums">
                            {request.destCode}
                          </span>{" "}
                          {request.destFarmer}
                        </td>
                        <td className="bg-[#edf8f0]/70 px-4 py-3 tabular-nums text-ink-soft">
                          {request.destContract ?? requestContracts[request.id]?.destination ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                          {request.debts}
                        </td>
                        <td className="px-4 py-3 text-right font-600 tabular-nums text-ink">
                          {request.value}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={requestStatusTone[request.status]}>
                            {request.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onViewRequest?.(request)}
                            aria-label={`View ${request.id}`}
                            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand ml-auto"
                          >
                            <Eye size={17} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-8 text-center text-muted"
                      >
                        No requests match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={requestPage}
              pageSize={pageSize}
              total={visibleRequests.length}
              onPageChange={setRequestPage}
            />
          </div>
        </>
      ) : (
        <DebtTransferReports onView={(report) => onViewReport?.(report)} />
      )}
    </div>
  )
}
