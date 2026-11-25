import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { Check, Clock, Info, MapPin, Pencil, Plus, Route as RouteIcon, Search, X } from "../components/icons"
import { Badge, Button, Field, Input, Modal, MultiSelect, Select, useToast } from "../components/ui"
import {
  DEST_CATALOG,
  STOPS_BY_TRANSPORTER,
  TRANSPORTERS,
  type Farmer,
} from "../data"
import { MapCanvas } from "./RouteMapCanvas"

type Tab = "farmer" | "facility" | "map"
type FacilityKind = "billing" | "buying"

type RouteRow = {
  id: string
  transporter: string
  farmer: string
  farmerDistance: string
  billingFacility: string
  billingDistance: string
  buyingFacility: string
  buyingDistance: string
  area: string
  previousFarmerDistance?: string
  previousBillingDistance?: string
  active: boolean
}

type FarmerDraft = Pick<RouteRow, "transporter" | "farmer" | "farmerDistance" | "area">
type FacilityDraft = Pick<RouteRow, "transporter" | "billingFacility" | "billingDistance" | "buyingFacility" | "buyingDistance" | "area"> & {
  kind: FacilityKind | ""
}

const ROUTES: RouteRow[] = [
  {
    id: "route-1",
    transporter: "Sul Cargas",
    farmer: "Helena Kunz",
    farmerDistance: "24km",
    billingFacility: "456 - Venâncio Aires",
    billingDistance: "182km", area: "Vale do Sol", previousFarmerDistance: "21.50km", previousBillingDistance: "180.00km",
    buyingFacility: "123 - Santa Cruz do Sul",
    buyingDistance: "362km",
    active: true,
  },
  {
    id: "route-2",
    transporter: "Vale Log Transportes",
    farmer: "Rafael Bortolini",
    farmerDistance: "18km",
    billingFacility: "567 - Lajeado",
    billingDistance: "216km", area: "Sinimbu",
    buyingFacility: "234 - Rio Pardo",
    buyingDistance: "248km",
    active: true,
  },
  {
    id: "route-3",
    transporter: "RS Freight",
    farmer: "Camila Reis",
    farmerDistance: "31km",
    billingFacility: "678 - Estrela",
    billingDistance: "238km", area: "Rio Pardo",
    buyingFacility: "345 - Vera Cruz",
    buyingDistance: "308km",
    active: false,
  },
]

const stationMap: Record<string, string> = {
  "123 - Santa Cruz do Sul": "Posto de Compra",
  "234 - Rio Pardo": "Unidade Rio Pardo",
  "345 - Vera Cruz": "Armazém Vale do Sol",
  "456 - Venâncio Aires": "Estação Venâncio Aires",
  "567 - Lajeado": "Armazém Vale do Sol",
  "678 - Estrela": "Posto de Compra",
}

const FARMER_DISTANCE_DEFAULTS: Record<string, string> = {
  "Helena Kunz": "24",
  "Rafael Bortolini": "18",
  "Camila Reis": "31",
  "Tiago Oliveira": "27",
  "Lucas Schneider": "22",
  "Mateus Ferreira": "35",
  "Otávio Lima": "29",
  "Bruno Wagner": "26",
}

const FACILITY_DISTANCE_DEFAULTS: Record<string, string> = {
  "456 - Venâncio Aires": "182",
  "567 - Lajeado": "216",
  "678 - Estrela": "238",
  "123 - Santa Cruz do Sul": "362",
  "234 - Rio Pardo": "248",
  "345 - Vera Cruz": "308",
}

const farmerDistanceFor = (name: string) =>
  FARMER_DISTANCE_DEFAULTS[name] ?? "24"
const facilityDistanceFor = (name: string) =>
  FACILITY_DISTANCE_DEFAULTS[name] ?? ""
const formatKm = (value: string) => `${(Number.parseFloat(value) || 0).toFixed(2)}km`
// Operational distance: green when it matches the calculated value, amber when overridden.
const DistanceValue = ({ value, previous }: { value: string; previous?: string }) => (
  <span className={`font-600 ${previous ? "text-[#9a6a12]" : "text-[#1a7a45]"}`}>{formatKm(value)}</span>
)
const transporterLabel = (name: string) => `${2344 + Math.max(0, TRANSPORTERS.findIndex((item) => item.name === name))}-${name}`
const farmerLabel = (name: string) => `${5201 + Math.max(0, Object.values(STOPS_BY_TRANSPORTER).flat().findIndex((item) => item.name === name))}-${name}`
const areaForTransporter = (name: string) => TRANSPORTERS.find((item) => item.name === name)?.city.replace(/ - RS$/, "") ?? "—"

const farmer = (name: string): Farmer =>
  Object.values(STOPS_BY_TRANSPORTER)
    .flat()
    .find((item) => item.name === name) ?? { name, city: "RS" }

const tabs: { key: Tab; label: string }[] = [
  { key: "farmer", label: "Farmer Distance" },
  { key: "facility", label: "Facility Distance" },
]

export function RouteMapUpdated() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>("farmer")
  const [rows, setRows] = useState(ROUTES)
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null)
  const [refreshOpen, setRefreshOpen] = useState(false)
  const [transporter, setTransporter] = useState("Sul Cargas")
  const [selectedFarmer, setSelectedFarmer] = useState("Helena Kunz")
  const [adding, setAdding] = useState(false)
  const [farmerDraft, setFarmerDraft] = useState<FarmerDraft>({
    transporter: "Sul Cargas",
    farmer: "Helena Kunz",
    farmerDistance: "",
    area: "Vale do Sol",
  })
  const [facilityDraft, setFacilityDraft] = useState<FacilityDraft>({
    transporter: "Sul Cargas",
    billingFacility: "",
    billingDistance: "",
    buyingFacility: "",
    buyingDistance: "",
    area: "",
    kind: "billing",
  })
  const [farmerActive, setFarmerActive] = useState(true)
  const [facilityActive, setFacilityActive] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingFarmer, setEditingFarmer] = useState<FarmerDraft | null>(null)
  const [editingFacility, setEditingFacility] = useState<FacilityDraft | null>(
    null,
  )
  const [editingActive, setEditingActive] = useState(true)
  const [editingFacilityKind, setEditingFacilityKind] = useState<FacilityKind | null>(null)
  const [farmerQuery, setFarmerQuery] = useState("")
  const [facilityQuery, setFacilityQuery] = useState("")
  const [transporterFilter, setTransporterFilter] = useState<string[]>([])
  const [farmerFilter, setFarmerFilter] = useState<string[]>([])
  const [areaFilter, setAreaFilter] = useState<string[]>([])
  const [facilityTypeFilter, setFacilityTypeFilter] = useState<string[]>([])
  const [facilityNameFilter, setFacilityNameFilter] = useState<string[]>([])

  const route = rows.find((row) => row.transporter === transporter) ?? rows[0]
  const farmers = STOPS_BY_TRANSPORTER[transporter] ?? []
  const facility = stationMap[route.buyingFacility] ?? "Posto de Compra"
  const destination =
    DEST_CATALOG.find((item) => item.name === facility) ?? DEST_CATALOG[0]

  const mapRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.transporter === transporter && row.farmer === selectedFarmer,
      ),
    [rows, selectedFarmer, transporter],
  )
  const filteredFarmerRows = useMemo(() => {
    const query = farmerQuery.trim().toLowerCase()
    return (query
      ? rows.filter((row) =>
          `${row.transporter} ${row.farmer}`.toLowerCase().includes(query),
        )
      : rows).filter((row) => (!transporterFilter.length || transporterFilter.includes(row.transporter)) && (!farmerFilter.length || farmerFilter.includes(row.farmer)) && (!areaFilter.length || areaFilter.includes(row.area)))
  }, [areaFilter, farmerFilter, farmerQuery, rows, transporterFilter])
  const filteredFacilityRows = useMemo(() => {
    const query = facilityQuery.trim().toLowerCase()
    return (query
      ? rows.filter((row) =>
          `${row.transporter} ${row.billingFacility} ${row.buyingFacility}`
            .toLowerCase()
            .includes(query),
        )
      : rows).filter((row) =>
        (!transporterFilter.length || transporterFilter.includes(row.transporter)) &&
        (!areaFilter.length || areaFilter.includes(row.area)),
      )
  }, [areaFilter, facilityQuery, rows, transporterFilter])

  const chooseTransporter = (next: string) => {
    setTransporter(next)
    setSelectedFarmer(STOPS_BY_TRANSPORTER[next]?.[0]?.name ?? "")
  }

  const edit = (row: RouteRow) => {
    setAdding(false)
    setEditingId(row.id)
    setEditingFacilityKind(null)
    setEditingFarmer({
      transporter: row.transporter,
      farmer: row.farmer,
      farmerDistance: row.farmerDistance.replace(/ km$/i, ""),
      area: row.area,
    })
    setEditingFacility({
      transporter: row.transporter,
      billingFacility: row.billingFacility,
      billingDistance: row.billingDistance.replace(/ km$/i, ""),
      buyingFacility: row.buyingFacility,
      buyingDistance: row.buyingDistance.replace(/ km$/i, ""),
      area: row.area,
      kind: "billing",
    })
    setEditingActive(row.active)
  }
  const editFacility = (row: RouteRow, kind: FacilityKind) => {
    edit(row)
    setEditingFacility((current) => current ? { ...current, kind } : current)
    setEditingFacilityKind(kind)
  }
  const cancelForm = () => {
    setAdding(false)
    setEditingId(null)
    setEditingFacilityKind(null)
  }
  const beginAdd = () => {
    if (tab === "map") setTab("farmer")
    setEditingId(null)
    setEditingFacilityKind(null)
    if (tab === "facility") {
      setFacilityActive(true)
      setFacilityDraft({
        transporter: "",
        billingFacility: "",
        billingDistance: "",
        buyingFacility: "",
        buyingDistance: "",
        area: "",
        kind: "",
      })
    } else {
      setFarmerActive(true)
      setFarmerDraft({
        transporter: "",
        farmer: "",
        farmerDistance: "",
        area: "",
      })
    }
    setAdding(true)
  }
  const saveFarmer = () => {
    if (
      !farmerDraft.transporter ||
      !farmerDraft.farmer ||
      !farmerDraft.farmerDistance
    )
      return
    if (rows.some((row) => row.transporter === farmerDraft.transporter && row.farmer === farmerDraft.farmer)) {
      toast({ tone: "info", title: "Route already exists", body: `${farmerDraft.transporter} already has a route for ${farmerDraft.farmer}.` })
      return
    }
    const existing = rows.find(
      (item) => item.transporter === farmerDraft.transporter,
    )
    setRows((current) => [
      ...current,
      {
        id: `route-${Date.now()}`,
        transporter: farmerDraft.transporter,
        farmer: farmerDraft.farmer,
        farmerDistance: formatKm(farmerDraft.farmerDistance),
        billingFacility: existing?.billingFacility ?? "456 - Venâncio Aires",
        billingDistance: existing?.billingDistance ?? "—",
        buyingFacility: existing?.buyingFacility ?? "123 - Santa Cruz do Sul",
        buyingDistance: existing?.buyingDistance ?? "—",
        area: areaForTransporter(farmerDraft.transporter),
        active: farmerActive,
      },
    ])
    cancelForm()
    toast({
      tone: "success",
      title: "Farmer route added",
      body: `${farmerDraft.farmer} is now assigned to ${farmerDraft.transporter}.`,
    })
  }
  const saveFacility = () => {
    const isBilling = facilityDraft.kind === "billing"
    const facility = isBilling ? facilityDraft.billingFacility : facilityDraft.buyingFacility
    const distance = isBilling ? facilityDraft.billingDistance : facilityDraft.buyingDistance
    if (!facilityDraft.transporter || !facilityDraft.kind || !facility || !distance) return
    const existing = rows.find((item) => item.transporter === facilityDraft.transporter)
    const linkedFarmer = existing?.farmer ?? STOPS_BY_TRANSPORTER[facilityDraft.transporter]?.[0]?.name ?? "Unassigned farmer"
    if (rows.some((row) => row.transporter === facilityDraft.transporter && (isBilling ? row.billingFacility : row.buyingFacility) === facility)) {
      toast({ tone: "info", title: "Route already exists", body: "This transporter already has the same billing and buying facility route." })
      return
    }
    setRows((current) => [
      ...current,
      {
        id: `route-${Date.now()}`,
        transporter: facilityDraft.transporter,
        farmer: linkedFarmer,
        farmerDistance: existing?.farmerDistance ?? "—",
        billingFacility: isBilling ? facility : existing?.billingFacility ?? "456 - Venâncio Aires",
        billingDistance: isBilling ? formatKm(distance) : existing?.billingDistance ?? "182km",
        buyingFacility: isBilling ? existing?.buyingFacility ?? "123 - Santa Cruz do Sul" : facility,
        buyingDistance: isBilling ? existing?.buyingDistance ?? "362km" : formatKm(distance),
        area: areaForTransporter(facilityDraft.transporter),
        active: facilityActive,
      },
    ])
    cancelForm()
    toast({
      tone: "success",
      title: "Facility route added",
      body: `Facility distances were added for ${facilityDraft.transporter}.`,
    })
  }
  const saveFarmerEdit = () => {
    if (
      !editingId ||
      !editingFarmer?.transporter ||
      !editingFarmer.farmer ||
      !editingFarmer.farmerDistance
    )
      return
    setRows((current) =>
      current.map((row) =>
        row.id === editingId
          ? {
              ...row,
              transporter: editingFarmer.transporter,
              farmer: editingFarmer.farmer,
              farmerDistance: formatKm(editingFarmer.farmerDistance),
              area: areaForTransporter(editingFarmer.transporter),
              active: editingActive,
            }
          : row,
      ),
    )
    cancelForm()
    toast({ tone: "success", title: "Farmer route updated" })
  }
  const saveFacilityEdit = () => {
    const isBilling = editingFacility?.kind === "billing"
    const facility = isBilling ? editingFacility?.billingFacility : editingFacility?.buyingFacility
    const distance = isBilling ? editingFacility?.billingDistance : editingFacility?.buyingDistance
    if (!editingId || !editingFacility?.transporter || !editingFacility.kind || !facility || !distance) return
    setRows((current) =>
      current.map((row) =>
        row.id === editingId
          ? {
              ...row,
              transporter: editingFacility.transporter,
              billingFacility: isBilling ? facility : row.billingFacility,
              billingDistance: isBilling ? formatKm(distance) : row.billingDistance,
              buyingFacility: isBilling ? row.buyingFacility : facility,
              buyingDistance: isBilling ? row.buyingDistance : formatKm(distance),
              area: areaForTransporter(editingFacility.transporter),
              active: editingActive,
            }
          : row,
      ),
    )
    cancelForm()
    toast({ tone: "success", title: "Facility route updated" })
  }

  return (
    <MapCtx.Provider value={setMapTarget}>
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-white px-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="flex gap-7 overflow-x-auto">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key)
                setAdding(false)
                setEditingId(null)
                setEditingFacilityKind(null)
              }}
              className={`-mb-px shrink-0 border-b-2 py-4 text-left text-[14px] font-700 transition ${
                tab === item.key
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab !== "map" ? (
        <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
          <HeaderFilter
            value={tab === "farmer" ? farmerQuery : facilityQuery}
            onChange={tab === "farmer" ? setFarmerQuery : setFacilityQuery}
            placeholder={tab === "farmer" ? "Transporter or farmer" : "Transporter or facility"}
            onAdd={beginAdd}
            onRefresh={() => setRefreshOpen(true)}
          />
          <div className={`mt-4 grid gap-3 ${tab === "facility" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            <Field label="Transporter"><MultiSelect searchable values={transporterFilter} onChange={setTransporterFilter} placeholder="Search transporters" allLabel="All transporters" options={[...new Set(rows.map((row) => row.transporter))].map((value) => ({ value, label: transporterLabel(value) }))} /></Field>
            <Field label="Area"><MultiSelect searchable values={areaFilter} onChange={setAreaFilter} placeholder="Search areas" allLabel="All areas" options={[...new Set(rows.map((row) => row.area))].map((value) => ({ value, label: value }))} /></Field>
            {tab === "farmer" ? <Field label="Farmer"><MultiSelect searchable values={farmerFilter} onChange={setFarmerFilter} placeholder="Search farmers" allLabel="All farmers" options={[...new Set(rows.map((row) => row.farmer))].map((value) => ({ value, label: farmerLabel(value) }))} /></Field> : null}
            {tab === "facility" ? <><Field label="Facility type"><MultiSelect values={facilityTypeFilter} onChange={setFacilityTypeFilter} placeholder="Select types" allLabel="All facility types" options={[{ value: "billing", label: "Billing facility" }, { value: "buying", label: "Buying facility" }]} /></Field><Field label="Facility name"><MultiSelect searchable values={facilityNameFilter} onChange={setFacilityNameFilter} placeholder="Search facilities" allLabel="All facilities" options={[...new Set(rows.flatMap((row) => [row.billingFacility, row.buyingFacility]))].map((value) => ({ value, label: value }))} /></Field></> : null}
          </div>
        </div>
      ) : null}

      {tab === "farmer" ? (
        <FarmerTable
          rows={filteredFarmerRows}
          adding={adding}
          draft={farmerDraft}
          active={farmerActive}
          onDraftChange={setFarmerDraft}
          onActiveChange={setFarmerActive}
          onSave={saveFarmer}
          onCancel={cancelForm}
          editingId={editingId}
          editingDraft={editingFarmer}
          editingActive={editingActive}
          onEditingChange={setEditingFarmer}
          onEditingActiveChange={setEditingActive}
          onSaveEdit={saveFarmerEdit}
          onEdit={edit}
        />
      ) : null}
      {tab === "facility" ? (
        <FacilityTable
          rows={filteredFacilityRows}
          adding={adding}
          draft={facilityDraft}
          active={facilityActive}
          onDraftChange={setFacilityDraft}
          onActiveChange={setFacilityActive}
          onSave={saveFacility}
          onCancel={cancelForm}
          editingId={editingId}
          editingDraft={editingFacility}
          editingActive={editingActive}
          onEditingChange={setEditingFacility}
          onEditingActiveChange={setEditingActive}
          onSaveEdit={saveFacilityEdit}
          onEdit={editFacility}
          editingKind={editingFacilityKind}
          facilityTypes={facilityTypeFilter}
          facilityNames={facilityNameFilter}
        />
      ) : null}
      {tab === "map" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
            <Field label="Transporter" className="w-full sm:w-[240px]">
              <Select
                value={transporter}
                onChange={chooseTransporter}
                options={rows.map((item) => ({
                  value: item.transporter,
                  label: item.transporter,
                }))}
              />
            </Field>
            <Field label="Farmer" className="w-full sm:w-[240px]">
              <Select
                value={selectedFarmer}
                onChange={setSelectedFarmer}
                options={farmers.map((item) => ({
                  value: item.name,
                  label: item.name,
                }))}
              />
            </Field>
            <Field label="Billing facility" className="w-full sm:w-[260px]">
              <Select
                value={route.billingFacility}
                onChange={(billingFacility) => setRows((current) => current.map((item) => item.transporter === transporter ? { ...item, billingFacility, billingDistance: facilityDistanceFor(billingFacility) } : item))}
                options={[...new Set(rows.filter((item) => item.transporter === transporter).map((item) => item.billingFacility)), route.billingFacility].filter((value, index, all) => all.indexOf(value) === index).map((value) => ({ value, label: value }))}
                className="[&_button]:border-[#dcd7f5] [&_button]:bg-[#f2efff]/55"
              />
            </Field>
            <Field label="Buying facility" className="w-full sm:w-[260px]">
              <Select
                value={route.buyingFacility}
                onChange={(buyingFacility) => setRows((current) => current.map((item) => item.transporter === transporter ? { ...item, buyingFacility, buyingDistance: facilityDistanceFor(buyingFacility) } : item))}
                options={[...new Set(rows.filter((item) => item.transporter === transporter).map((item) => item.buyingFacility)), route.buyingFacility].filter((value, index, all) => all.indexOf(value) === index).map((value) => ({ value, label: value }))}
                className="[&_button]:border-[#f3d9bd] [&_button]:bg-[#fff4e8]/70"
              />
            </Field>
            <p className="w-full text-[12px] text-muted">
              Billing and buying facilities are populated from the selected
              transporter.
            </p>
          </div>
          <div className="relative h-[590px] overflow-hidden rounded-2xl border border-line bg-[#f1f3f4] shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
            <MapCanvas
              stops={[
                {
                  name:
                    stationMap[route.billingFacility] ?? route.billingFacility,
                  city: "Billing facility",
                  color: "#5d52a4",
                  label: `${stationMap[route.billingFacility] ?? route.billingFacility} · ${route.billingDistance}`,
                  removable: false,
                },
                ...mapRows.map((item) => ({
                  ...farmer(item.farmer),
                  color: "#187247",
                  label: `${item.farmer} · ${item.farmerDistance}`,
                  removable: false,
                })),
              ]}
              nearby={[]}
              onAdd={() => {}}
              onRemove={() => {}}
              sourceName={transporter}
              dest={destination}
              focus={null}
              onFocus={() => {}}
              activeTollIdx={[]}
              stopColor="#187247"
              destinationColor="#a45d14"
              destinationLabel={`${destination.name} · ${route.buyingDistance}`}
            />
            <div className="absolute left-5 top-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur">
              <span className="border-r border-line pr-4 text-[11px] font-700 uppercase tracking-wide text-muted">
                Distances calculated from transporter
              </span>
              <Legend
                color="bg-[#5d52a4]"
                label={`1. Billing · ${formatKm(route.billingDistance)}`}
              />
              <Legend
                color="bg-[#187247]"
                label={`2. Farmer · ${formatKm(route.farmerDistance)}`}
              />
              <Legend
                color="bg-[#a45d14]"
                label={`3. Buying · ${formatKm(route.buyingDistance)}`}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
      <RouteDetailsModal target={mapTarget} onClose={() => setMapTarget(null)} />
      <Modal open={refreshOpen} onClose={() => setRefreshOpen(false)} title={tab === "facility" ? "Refresh facility distances" : "Refresh farmer distances"} width="max-w-xl">
        <div className="space-y-4 text-[13.5px] leading-relaxed text-ink-soft">
          <p>
            This action re-synchronises every active route on this screen with Google Maps and recalculates the distance from each
            transporter to its {tab === "facility" ? "billing and buying facilities" : "farmers"}.
          </p>
          <div className="rounded-xl border border-line bg-canvas/50 p-4">
            <p className="mb-2 text-[12px] font-700 uppercase tracking-wide text-muted">What will change</p>
            <ul className="space-y-2">
              <li className="flex gap-2.5"><Check size={15} className="mt-0.5 shrink-0 text-brand" /><span><span className="font-600 text-ink">Calculated distance</span> is replaced with the latest value returned by Google Maps.</span></li>
              <li className="flex gap-2.5"><Check size={15} className="mt-0.5 shrink-0 text-brand" /><span><span className="font-600 text-ink">Operational distance</span> is updated to match, except where it has been manually overridden.</span></li>
              <li className="flex gap-2.5"><Check size={15} className="mt-0.5 shrink-0 text-brand" /><span>Manual overrides are preserved; the new calculated value is shown alongside them for review.</span></li>
              <li className="flex gap-2.5"><Check size={15} className="mt-0.5 shrink-0 text-brand" /><span>The <span className="font-600 text-ink">Last Synced from Google Maps</span> timestamp is updated and the change is recorded in the audit log.</span></li>
            </ul>
          </div>
          <p className="flex gap-2 text-[12.5px] text-muted">
            <Info size={14} className="mt-0.5 shrink-0" />
            Updated distances apply to payment orders generated after the refresh. Orders already issued are not affected.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2.5 border-t border-line pt-4">
          <Button variant="outline" onClick={() => setRefreshOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setRefreshOpen(false)
              toast({ tone: "success", title: `${tab === "facility" ? "Facility" : "Farmer"} distances refreshed`, body: "Calculated distances were synchronised with Google Maps." })
            }}
          >
            <Clock size={16} /> Refresh now
          </Button>
        </div>
      </Modal>
    </MapCtx.Provider>
  )
}

function FarmerTable({
  rows,
  adding,
  draft,
  active,
  onDraftChange,
  onActiveChange,
  onSave,
  onCancel,
  editingId,
  editingDraft,
  editingActive,
  onEditingChange,
  onEditingActiveChange,
  onSaveEdit,
  onEdit,
}: {
  rows: RouteRow[]
  adding: boolean
  draft: FarmerDraft
  active: boolean
  onDraftChange: (value: FarmerDraft) => void
  onActiveChange: (value: boolean) => void
  onSave: () => void
  onCancel: () => void
  editingId: string | null
  editingDraft: FarmerDraft | null
  editingActive: boolean
  onEditingChange: (value: FarmerDraft | null) => void
  onEditingActiveChange: (value: boolean) => void
  onSaveEdit: () => void
  onEdit: (row: RouteRow) => void
}) {
  const editor = (
    value: FarmerDraft,
    enabled: boolean,
    change: (value: FarmerDraft) => void,
    changeEnabled: (value: boolean) => void,
    save: () => void,
    tint = "bg-white",
    rowKey?: string,
  ) => {
    const farmerOptions = STOPS_BY_TRANSPORTER[value.transporter] ?? []
    return (
      <tr key={rowKey} className={`border-t border-line ${tint}`}>
        <td className="px-3 py-2">
          <Select
            value={value.transporter}
            searchable
            onChange={(transporter) =>
              change({
                transporter,
                farmer: "",
                farmerDistance: "",
                area: areaForTransporter(transporter),
              })
            }
            options={TRANSPORTERS.map((item) => ({
              value: item.name,
              label: item.name,
            }))}
          />
        </td>
        <td className="px-4 py-3 text-ink-soft">{areaForTransporter(value.transporter)}</td>
        <td className="px-3 py-2">
          <Select
            value={value.farmer}
            searchable
            onChange={(farmer) =>
              change({
                ...value,
                farmer,
                farmerDistance: farmerDistanceFor(farmer),
              })
            }
            options={farmerOptions.map((item) => ({
              value: item.name,
              label: item.name,
            }))}
            placeholder="Select farmer"
          />
        </td>
        <td className="px-4 py-3 tabular-nums text-ink-soft">{value.farmer ? formatKm(farmerDistanceFor(value.farmer)) : <span className="text-muted/70">Auto-calculated</span>}</td>
        {rowKey === undefined ? (
          <td className="px-4 py-3 tabular-nums font-600 text-[#1a7a45]">{value.farmer ? formatKm(farmerDistanceFor(value.farmer)) : <span className="font-400 text-muted/70">Auto-calculated</span>}</td>
        ) : (
        <td className="px-3 py-2">
          <Input
            value={value.farmerDistance}
            onChange={(event) =>
              change({ ...value, farmerDistance: event.target.value })
            }
            placeholder="e.g. 24"
            inputMode="decimal"
          />
        </td>
        )}
        <td className="px-4 py-3">
          <StatusToggle active={enabled} onChange={changeEnabled} />
        </td>
        <td className="px-3 py-2">
          <DraftActions onSave={save} onCancel={onCancel} />
        </td>
      </tr>
    )
  }
  return (
    <TableShell>
      <table className="w-full min-w-[780px] text-left text-[13px]">
        <thead className="text-[11.5px] font-700 uppercase tracking-wide text-ink-soft">
          <tr>
            <th className="px-4 py-3">Transporter</th>
            <th className="px-4 py-3">Area</th>
            <th className="px-4 py-3">Farmer</th>
            <th className="px-4 py-3">Calculated distance</th>
            <th className="px-4 py-3">Operational distance</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {adding
            ? editor(draft, active, onDraftChange, onActiveChange, onSave, "new-farmer")
            : null}
          {rows.map((row) =>
            editingId === row.id && editingDraft ? (
              editor(
                editingDraft,
                editingActive,
                (value) => onEditingChange(value),
                onEditingActiveChange,
                onSaveEdit,
                "bg-canvas/45",
                row.id,
              )
            ) : (
              <tr
                key={row.id}
                className="border-t border-line hover:bg-canvas/45"
              >
                <td className="px-4 py-3 font-600 text-ink">
                  {transporterLabel(row.transporter)}
                </td>
                <td className="px-4 py-3 text-ink-soft">{row.area}</td>
                <td className="px-4 py-3 text-ink-soft">{farmerLabel(row.farmer)}</td>
                <td className="px-4 py-3 tabular-nums text-ink-soft">{formatKm(row.previousFarmerDistance ?? row.farmerDistance)}</td>
                <td className="px-4 py-3 tabular-nums text-ink">
                  <DistanceValue value={row.farmerDistance} previous={row.previousFarmerDistance} />
                </td>
                <td className="px-4 py-3">
                  <Status active={row.active} />
                </td>
                <td className="px-4 py-3">
                  <Actions row={row} onEdit={onEdit} />
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </TableShell>
  )
}

function FacilityTable({
  rows,
  adding,
  draft,
  active,
  onDraftChange,
  onActiveChange,
  onSave,
  onCancel,
  editingId,
  editingDraft,
  editingActive,
  onEditingChange,
  onEditingActiveChange,
  onSaveEdit,
  onEdit,
  editingKind,
  facilityTypes,
  facilityNames,
}: {
  rows: RouteRow[]
  adding: boolean
  draft: FacilityDraft
  active: boolean
  onDraftChange: (value: FacilityDraft) => void
  onActiveChange: (value: boolean) => void
  onSave: () => void
  onCancel: () => void
  editingId: string | null
  editingDraft: FacilityDraft | null
  editingActive: boolean
  onEditingChange: (value: FacilityDraft | null) => void
  onEditingActiveChange: (value: boolean) => void
  onSaveEdit: () => void
  onEdit: (row: RouteRow, kind: FacilityKind) => void
  editingKind: FacilityKind | null
  facilityTypes: string[]
  facilityNames: string[]
}) {
  const facilities = Object.keys(stationMap).map((name) => ({
    value: name,
    label: name,
  }))
  const facilityRows = rows
    .flatMap((row) => [
      { row, kind: "billing" as const, label: "Billing facility", name: row.billingFacility, distance: row.billingDistance, originalDistance: row.previousBillingDistance },
      { row, kind: "buying" as const, label: "Buying facility", name: row.buyingFacility, distance: row.buyingDistance },
    ])
    .filter((item) =>
      (!facilityTypes.length || facilityTypes.includes(item.kind)) &&
      (!facilityNames.length || facilityNames.includes(item.name)),
    )
  const editor = (
    value: FacilityDraft,
    enabled: boolean,
    change: (value: FacilityDraft) => void,
    changeEnabled: (value: boolean) => void,
    save: () => void,
    rowKey?: string,
  ) => {
    const isBilling = value.kind === "billing"
    const facility = isBilling ? value.billingFacility : value.buyingFacility
    const distance = isBilling ? value.billingDistance : value.buyingDistance
    return (
    <tr key={rowKey} className="border-t border-[#d7cfe9] bg-[#fbfaff]">
      <td className="px-3 py-2">
        <Select
          value={value.transporter}
          searchable
          onChange={(transporter) => change({ ...value, transporter })}
          options={TRANSPORTERS.map((item) => ({
            value: item.name,
            label: item.name,
          }))}
        />
      </td>
      <td className="px-4 py-3 text-ink-soft">{areaForTransporter(value.transporter)}</td>
      <td className="px-3 py-2">
        <Select
          value={value.kind}
          onChange={(kind) => change({ ...value, kind: kind as FacilityKind })}
          placeholder="Select type"
          options={[{ value: "billing", label: "Billing facility" }, { value: "buying", label: "Buying facility" }]}
        />
      </td>
      <td className="px-3 py-2">
        <Select
          value={facility}
          searchable
          disabled={!value.kind}
          onChange={(facility) =>
            isBilling
              ? change({ ...value, billingFacility: facility, billingDistance: facilityDistanceFor(facility) })
              : change({ ...value, buyingFacility: facility, buyingDistance: facilityDistanceFor(facility) })
          }
          options={facilities}
          placeholder="Select facility"
        />
      </td>
      <td className="px-4 py-3 tabular-nums text-ink-soft">{facility ? formatKm(facilityDistanceFor(facility)) : <span className="text-muted/70">Auto-calculated</span>}</td>
      {rowKey === "new-facility" ? (
        <td className="px-4 py-3 tabular-nums font-600 text-[#1a7a45]">{facility ? formatKm(facilityDistanceFor(facility)) : <span className="font-400 text-muted/70">Auto-calculated</span>}</td>
      ) : (
      <td className="px-3 py-2">
        <Input
          value={distance}
          disabled={!value.kind}
          onChange={(event) =>
            isBilling
              ? change({ ...value, billingDistance: event.target.value })
              : change({ ...value, buyingDistance: event.target.value })
          }
          placeholder="Distance"
          inputMode="decimal"
        />
      </td>
      )}
      <td className="px-4 py-3"><StatusToggle active={enabled} onChange={changeEnabled} /></td>
      <td className="px-3 py-2"><DraftActions onSave={save} onCancel={onCancel} /></td>
    </tr>
    )
  }
  return (
    <TableShell>
      <table className="w-full min-w-[1080px] text-left text-[13px]">
        <thead className="text-[11.5px] font-700 uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-ink-soft">Transporter</th>
            <th className="px-4 py-3 text-ink-soft">Area</th>
            <th className="px-4 py-3 text-ink-soft">Facility type</th>
            <th className="px-4 py-3 text-ink-soft">Facility name</th>
            <th className="px-4 py-3 text-ink-soft">Calculated distance</th>
            <th className="px-4 py-3 text-ink-soft">Operational distance</th>
            <th className="px-4 py-3 text-ink-soft">Status</th>
            <th className="px-4 py-3 text-right text-ink-soft">Actions</th>
          </tr>
        </thead>
        <tbody>
          {adding ? (
            editor(draft, active, onDraftChange, onActiveChange, onSave, "new-facility")
          ) : null}
          {facilityRows.map((item) =>
            editingId === item.row.id && editingKind === item.kind && editingDraft ? (
              editor(
                editingDraft,
                editingActive,
                (value) => onEditingChange(value),
                onEditingActiveChange,
                onSaveEdit,
                `${item.row.id}-${item.kind}`,
              )
            ) : (
              <tr key={`${item.row.id}-${item.kind}`} className="border-t border-line hover:bg-canvas/45">
                <td className="px-4 py-3 font-600 text-ink">{transporterLabel(item.row.transporter)}</td>
                <td className="px-4 py-3 text-ink-soft">{item.row.area}</td>
                <td className="px-4 py-3"><Badge tone={item.kind === "billing" ? "blue" : "amber"}>{item.label}</Badge></td>
                <td className="px-4 py-3 text-ink-soft">{item.name}</td>
                <td className="px-4 py-3 tabular-nums text-ink-soft">{formatKm(item.originalDistance ?? item.distance)}</td>
                <td className="px-4 py-3 tabular-nums text-ink"><DistanceValue value={item.distance} previous={item.originalDistance} /></td>
                <td className="px-4 py-3"><Status active={item.row.active} /></td>
                <td className="px-4 py-3"><Actions row={item.row} kind={item.kind} onEdit={() => onEdit(item.row, item.kind)} /></td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </TableShell>
  )
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
      <div className="route-distance-scroll overflow-x-auto">{children}</div>
    </div>
  )
}
function HeaderFilter({
  value,
  onChange,
  placeholder,
  onAdd,
  onRefresh,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  onAdd: () => void
  onRefresh?: () => void
}) {
  return (
    <div className="flex w-full flex-wrap items-end justify-end gap-3">
      {onRefresh ? <Button variant="outline" onClick={onRefresh}><Clock size={16} /> Refresh route</Button> : null}
      <Button onClick={onAdd}><Plus size={16} /> Add new</Button>
    </div>
  )
}
function DraftActions({
  onSave,
  onCancel,
}: {
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={onSave}
        className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white transition hover:bg-brand-dark"
        title="Save new route"
      >
        <Check size={16} strokeWidth={3} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-white hover:text-ink"
        title="Cancel"
      >
        <X size={16} />
      </button>
    </div>
  )
}
function StatusToggle({
  active,
  onChange,
}: {
  active: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={() => onChange(!active)}
      className={`flex items-center gap-2 text-[12px] font-700 ${
        active ? "text-[#187247]" : "text-muted"
      }`}
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          active ? "bg-[#187247]" : "bg-[#c7d2e6]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            active ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
      {active ? "Active" : "Inactive"}
    </button>
  )
}
function Status({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? "green" : "neutral"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}
type MapTarget = { row: RouteRow; kind: "farmer" | FacilityKind }
const MapCtx = createContext<(t: MapTarget) => void>(() => {})

/* Full-screen route review — header, from→to, KPIs, then the map. */
function RouteDetailsModal({ target, onClose }: { target: MapTarget | null; onClose: () => void }) {
  const toast = useToast()
  const [refreshedAt, setRefreshedAt] = useState(new Date(2026, 7, 15, 8, 30))
  useEffect(() => {
    if (!target) return
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [target, onClose])
  if (!target) return null
  const { row, kind } = target
  const toName = kind === "farmer" ? row.farmer : kind === "billing" ? row.billingFacility : row.buyingFacility
  const toType = kind === "farmer" ? "Farmer" : kind === "billing" ? "Billing facility" : "Buying facility"
  const distance = kind === "farmer" ? row.farmerDistance : kind === "billing" ? row.billingDistance : row.buyingDistance
  const previous = kind === "farmer" ? row.previousFarmerDistance : kind === "billing" ? row.previousBillingDistance : undefined
  const color = kind === "farmer" ? "#187247" : kind === "billing" ? "#5d52a4" : "#a45d14"
  const dest: Farmer = kind === "farmer" ? farmer(row.farmer) : DEST_CATALOG.find((d) => d.name === (stationMap[toName] ?? toName)) ?? DEST_CATALOG[0]
  const stamp = refreshedAt.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  const kpis = [
    { label: "Calculated distance", value: formatKm(previous ?? distance), hint: "From route service" },
    { label: "Operational distance", value: formatKm(distance), hint: previous ? "Overridden manually" : "Matches calculated", tone: previous ? "text-[#9a6a12]" : "text-[#1a7a45]" },
    { label: "Route source", value: "Google Maps", hint: "Driving, fastest route" },
    { label: "Last Synced from Google Maps", value: stamp, hint: "Auto-refreshed daily" },
  ]
  return (
    <div className="fixed inset-0 z-50 flex p-4 sm:p-6">
      <div className="animate-overlay absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-pop relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_64px_-24px_rgba(15,30,61,0.5)]">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand"><RouteIcon size={18} /></span>
            <div>
              <h2 className="text-[15px] font-700 text-ink">Route Details</h2>
              <p className="text-[12.5px] text-muted">{toType} distance · {row.area}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { setRefreshedAt(new Date()); toast({ tone: "success", title: "Route refreshed", body: "The distance was recalculated from the route service." }) }}>
              <Clock size={15} /> Refresh route
            </Button>
            <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-4 border-b border-line bg-canvas/40 px-6 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1a73e8]" />
              <div className="min-w-0"><p className="text-[11px] font-600 uppercase tracking-wide text-muted">From · Transporter</p><p className="truncate text-[14px] font-700 text-ink">{row.transporter}</p></div>
            </div>
            <div className="flex flex-1 items-center gap-2 text-muted min-w-[80px]">
              <span className="h-px flex-1 border-t border-dashed border-[#c4cfe4]" />
              <span className="rounded-full bg-white px-2.5 py-0.5 text-[12px] font-700 tabular-nums text-ink-soft border border-line">{formatKm(distance)}</span>
              <span className="h-px flex-1 border-t border-dashed border-[#c4cfe4]" />
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
              <div className="min-w-0"><p className="text-[11px] font-600 uppercase tracking-wide text-muted">To · {toType}</p><p className="truncate text-[14px] font-700 text-ink">{toName}</p></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-line bg-white px-4 py-3">
                <p className="text-[12px] font-500 text-muted">{k.label}</p>
                <p className={`mt-1 text-[18px] font-800 tabular-nums ${k.tone ?? "text-ink"}`}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[320px] flex-1 bg-[#f1f3f4]">
          <MapCanvas
            stops={[]}
            nearby={[]}
            onAdd={() => {}}
            onRemove={() => {}}
            sourceName={row.transporter}
            dest={dest}
            focus={null}
            onFocus={() => {}}
            activeTollIdx={[]}
            destinationColor={color}
            destinationLabel={`${toName} · ${formatKm(distance)}`}
          />
        </div>
      </div>
    </div>
  )
}

function Actions({ row, onEdit, kind = "farmer" }: { row: RouteRow; onEdit: (row: RouteRow) => void; kind?: MapTarget["kind"] }) {
  const openMap = useContext(MapCtx)
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={() => openMap({ row, kind })}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
        title="View route on map"
      >
        <MapPin size={16} />
      </button>
      <button
        type="button"
        onClick={() => onEdit(row)}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
        title="Override distance"
        aria-label="Override distance"
      >
        <Pencil size={16} />
      </button>
    </div>
  )
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[12px] font-600 text-ink-soft">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}
