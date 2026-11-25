import { useMemo, useState } from 'react'
import {
  Check,
  Clock,
  Coins,
  Info,
  Plus,
  MapPin,
  Route,
  Search,
  SlidersHorizontal,
  Undo2,
  X,
} from '../components/icons'
import { Badge, Button, Input, Modal, MultiSelect, Select, useToast } from '../components/ui'
import { STOPS_BY_TRANSPORTER, TRANSPORTERS } from '../data'

const fmtBRL = (n: number) =>
  `R$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatKm = (value: string) => `${(Number.parseFloat(value) || 0).toFixed(2)}km`
const transporterLabel = (name: string) => `T-${String(Math.max(1, TRANSPORTER_OPTIONS.findIndex((item) => item.name === name) + 1)).padStart(3, '0')} · ${name}`
const farmerLabel = (name: string) => `F-${String(Math.max(1, [...new Set(Object.values(STOPS_BY_TRANSPORTER).flat().map((item) => item.name))].indexOf(name) + 1)).padStart(3, '0')} · ${name}`

type Toll = {
  plaza: string
  road: string
  kind: string
  car: string
  lcv: string
  truck2: string
  truck3: string
}

type TollTotals = { car: number; lcv: number; truck2: number; truck3: number }

type RouteOption = { label: string; tag: string; distanceKm: number }

/* ===== DISTANCE BASED — registered distance from other facilities ===== */
type FacilityRow = {
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
  previousBuyingDistance?: string
  active: boolean
  editing?: boolean
  isNew?: boolean
}

const FACILITY_OPTIONS: Record<string, { facility: string; distance: string }[]> = {
  'Buying Station': [
    { facility: '123 - Santa Cruz do Sul', distance: '362km' },
    { facility: '234 - Rio Pardo', distance: '248km' },
    { facility: '345 - Vera Cruz', distance: '308km' },
  ],
  'Billing Station': [
    { facility: '456 - Venâncio Aires', distance: '182km' },
    { facility: '567 - Lajeado', distance: '216km' },
    { facility: '678 - Estrela', distance: '238km' },
  ],
}

const TRANSPORTER_OPTIONS = TRANSPORTERS.filter((t) => t.name !== 'Transporter Base')

const facilityDetails = (facilityType: keyof typeof FACILITY_OPTIONS) => {
  const first = FACILITY_OPTIONS[facilityType][0]
  return { facility: first.facility, distance: first.distance }
}

const detailsForTransporter = (transporter: string) => {
  const billing = facilityDetails('Billing Station')
  const buying = facilityDetails('Buying Station')
  return {
  farmer: STOPS_BY_TRANSPORTER[transporter]?.[0]?.name ?? '',
  farmerDistance: '24km',
  billingFacility: billing.facility,
  billingDistance: billing.distance,
  buyingFacility: buying.facility,
  buyingDistance: buying.distance,
  }
}

const transporterForFarmer = (farmer: string) =>
  TRANSPORTER_OPTIONS.find((transporter) =>
    (STOPS_BY_TRANSPORTER[transporter.name] ?? []).some((mappedFarmer) => mappedFarmer.name === farmer),
  )?.name

const areasForTransporter = (transporter: string) =>
  [...new Set((STOPS_BY_TRANSPORTER[transporter] ?? []).map((farmer) => farmer.city.split(' - ')[0]))]

const INITIAL_FACILITIES: FacilityRow[] = [
  { id: 'f1', transporter: 'Sul Cargas', farmer: 'Helena Kunz', farmerDistance: '24km', billingFacility: '456 - Venâncio Aires', billingDistance: '182km', buyingFacility: '123 - Santa Cruz do Sul', buyingDistance: '362km', area: 'Vale do Sol', previousFarmerDistance: '21.50km', previousBillingDistance: '180.00km', active: true },
  { id: 'f2', transporter: 'Vale Log Transportes', farmer: 'Rafael Bortolini', farmerDistance: '18km', billingFacility: '567 - Lajeado', billingDistance: '216km', buyingFacility: '234 - Rio Pardo', buyingDistance: '248km', area: 'Sinimbu', active: true },
]

export type DistanceRoute = Pick<FacilityRow, 'transporter' | 'farmer' | 'farmerDistance' | 'billingFacility' | 'billingDistance' | 'buyingFacility' | 'buyingDistance' | 'active'>

export function ItemsPanel({ onViewRoute }: { onViewRoute: (route: DistanceRoute) => void }) {
  const toast = useToast()
  const [rows, setRows] = useState<FacilityRow[]>(INITIAL_FACILITIES)
  const [pendingSave, setPendingSave] = useState<FacilityRow | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [selectedTransporters, setSelectedTransporters] = useState<string[]>([])
  const [selectedFarmers, setSelectedFarmers] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])

  const availableAreas = [...new Set(selectedTransporters.flatMap(areasForTransporter))]

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesSearch = !query || [row.transporter, row.farmer, row.billingFacility, row.buyingFacility]
        .some((value) => value.toLowerCase().includes(query))
      const matchesStatus = status === 'All' || (status === 'Active' ? row.active : !row.active)
      const matchesTransporter = !selectedTransporters.length || selectedTransporters.includes(row.transporter)
      const matchesFarmer = !selectedFarmers.length || selectedFarmers.includes(row.farmer)
      const matchesArea = !selectedAreas.length || selectedAreas.includes(row.area)
      return matchesSearch && matchesStatus && matchesTransporter && matchesFarmer && matchesArea
    })
  }, [rows, search, selectedAreas, selectedFarmers, selectedTransporters, status])

  const patch = (id: string, p: Partial<FacilityRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)))

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id))

  const addNew = () => {
    if (!TRANSPORTER_OPTIONS.some((transporter) => !rows.some((row) => row.transporter === transporter.name))) {
      toast({ tone: 'info', title: 'No transporters available', body: 'Each transporter can be registered only once.' })
      return
    }
    setSearch('')
    setStatus('All')
    setRows((prev) => [
      ...prev,
      {
        id: `f${Date.now()}`,
        transporter: '',
        farmer: '',
        farmerDistance: '',
        billingFacility: '',
        billingDistance: '',
        buyingFacility: '',
        buyingDistance: '',
        area: '',
        active: true,
        editing: true,
        isNew: true,
      },
    ])
  }

  const saveRow = (r: FacilityRow) => {
    if (!r.farmerDistance.trim() || !r.billingDistance.trim() || !r.buyingDistance.trim()) return
    setPendingSave(r)
  }

  const confirmSave = () => {
    if (!pendingSave) return
    patch(pendingSave.id, {
      farmerDistance: pendingSave.farmerDistance.trim(),
      billingDistance: pendingSave.billingDistance.trim(),
      buyingDistance: pendingSave.buyingDistance.trim(),
      editing: false,
      isNew: false,
    })
    toast({ tone: 'success', title: 'Registered distances saved', body: `${pendingSave.transporter} · ${pendingSave.farmer}.` })
    setPendingSave(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block w-full sm:w-[260px]">
            <span className="mb-1.5 block text-[12.5px] font-500 text-muted">Route</span>
            <span className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Transporter, farmer or facility"
                className="pl-9"
              />
            </span>
          </label>
          <label className="block w-[150px]">
            <span className="mb-1.5 block text-[12.5px] font-500 text-muted">Status</span>
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: 'All', label: 'All' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
            />
          </label>
          <label className="block w-[220px]">
            <span className="mb-1.5 block text-[12.5px] font-500 text-muted">Transporter</span>
            <MultiSelect values={selectedTransporters} onChange={(values) => { setSelectedTransporters(values); setSelectedAreas([]) }} searchable allLabel="All transporters" placeholder="All transporters" options={TRANSPORTER_OPTIONS.map((t, index) => ({ value: t.name, label: `T-${String(index + 1).padStart(3, '0')} · ${t.name}` }))} />
          </label>
          <label className="block w-[220px]">
            <span className="mb-1.5 block text-[12.5px] font-500 text-muted">Farmer</span>
            <MultiSelect values={selectedFarmers} onChange={setSelectedFarmers} searchable allLabel="All farmers" placeholder="All farmers" options={[...new Set(rows.map((row) => row.farmer))].map((farmer, index) => ({ value: farmer, label: `F-${String(index + 1).padStart(3, '0')} · ${farmer}` }))} />
          </label>
          <label className="block w-[180px]">
            <span className="mb-1.5 block text-[12.5px] font-500 text-muted">Area</span>
            <MultiSelect values={selectedAreas} onChange={setSelectedAreas} disabled={!selectedTransporters.length} searchable allLabel="All areas" placeholder={selectedTransporters.length ? "All areas" : "Choose transporter first"} options={availableAreas.map((area) => ({ value: area, label: area }))} />
          </label>
        </div>
        <Button onClick={addNew}>
          <Plus size={16} /> Add New
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="route-distance-scroll overflow-x-auto">
        <table className="w-full min-w-[1180px] text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-left text-[12px] font-700 uppercase tracking-wide text-ink-soft">
              <th className="px-5 py-3.5">Transporter</th>
              <th className="bg-[#f2efff] px-5 py-3.5 text-[#5d52a4]">Billing facility</th>
              <DistanceHeader className="bg-[#f2efff] text-[#5d52a4]">Billing facility distance</DistanceHeader>
              <th className="bg-[#edf8f1] px-5 py-3.5 text-[#187247]">Farmer</th>
              <DistanceHeader className="bg-[#edf8f1] text-[#187247]">Farmer distance</DistanceHeader>
              <th className="bg-[#fff4e8] px-5 py-3.5 text-[#a45d14]">Buying facility</th>
              <DistanceHeader className="bg-[#fff4e8] text-[#a45d14]">Buying facility distance</DistanceHeader>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr className="border-b border-line">
                <td className="px-5 py-6 text-center text-[13px] text-muted" colSpan={9}>
                  No registered distances match the selected filters.
                </td>
              </tr>
            ) : (
              visibleRows.map((r) =>
                r.editing ? (
                  <tr key={r.id} className="border-b border-line bg-canvas/60 last:border-0">
                    {r.isNew ? (
                      <>
                        <td className="px-4 py-2.5">
                          <Select
                            value={r.transporter}
                            onChange={(transporter) => patch(r.id, { transporter, ...detailsForTransporter(transporter), area: '' })}
                            options={TRANSPORTER_OPTIONS
                              .filter((t) => t.name === r.transporter || !rows.some((row) => row.id !== r.id && row.transporter === t.name))
                              .map((t) => ({ value: t.name, label: t.name }))}
                          />
                          <div className="mt-2"><Select disabled={!r.transporter} value={r.area} onChange={(area) => patch(r.id, { area })} placeholder="Area" options={areasForTransporter(r.transporter).map((area) => ({ value: area, label: area }))} /></div>
                        </td>
                        <td className="bg-[#f2efff]/70 px-4 py-2.5">
                          <Select
                            disabled={!r.area}
                            value={r.billingFacility}
                            onChange={(billingFacility) => patch(r.id, { billingFacility })}
                            options={FACILITY_OPTIONS['Billing Station'].map((option) => ({ value: option.facility, label: option.facility }))}
                          />
                        </td>
                        <td className="bg-[#f2efff]/70 px-4 py-2.5"><Input disabled={!r.area} className="h-9" placeholder="e.g. 182km" value={r.billingDistance} onChange={(e) => patch(r.id, { billingDistance: e.target.value })} /></td>
                        <td className="bg-[#edf8f1]/70 px-4 py-2.5">
                          <Select
                            value={r.farmer}
                            disabled={!r.area}
                            placeholder="Farmer"
                            onChange={(farmer) => {
                              const transporter = transporterForFarmer(farmer)
                              patch(r.id, transporter ? { farmer, transporter } : { farmer })
                            }}
                            options={(STOPS_BY_TRANSPORTER[r.transporter] ?? []).map((farmer) => ({ value: farmer.name, label: farmer.name }))}
                          />
                        </td>
                        <td className="bg-[#edf8f1]/70 px-4 py-2.5">
                          <Input disabled={!r.area} className="h-9" placeholder="e.g. 24km" value={r.farmerDistance} onChange={(e) => patch(r.id, { farmerDistance: e.target.value })} />
                        </td>
                        <td className="bg-[#fff4e8]/70 px-4 py-2.5">
                          <Select
                            disabled={!r.area}
                            value={r.buyingFacility}
                            onChange={(buyingFacility) => patch(r.id, { buyingFacility })}
                            options={FACILITY_OPTIONS['Buying Station'].map((option) => ({ value: option.facility, label: option.facility }))}
                          />
                        </td>
                        <td className="bg-[#fff4e8]/70 px-4 py-2.5"><Input disabled={!r.area} className="h-9" placeholder="e.g. 362km" value={r.buyingDistance} onChange={(e) => patch(r.id, { buyingDistance: e.target.value })} /></td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-2.5 font-600 text-ink">{r.transporter}</td>
                        <td className="bg-[#f2efff]/70 px-5 py-2.5 text-ink-soft">{r.billingFacility}</td>
                        <td className="bg-[#f2efff]/70 px-4 py-2.5"><Input className="h-9" placeholder="e.g. 182km" value={r.billingDistance} onChange={(e) => patch(r.id, { billingDistance: e.target.value })} /></td>
                        <td className="bg-[#edf8f1]/70 px-5 py-2.5 text-ink-soft">{r.farmer}</td>
                        <td className="bg-[#edf8f1]/70 px-4 py-2.5"><Input className="h-9" placeholder="e.g. 24km" value={r.farmerDistance} onChange={(e) => patch(r.id, { farmerDistance: e.target.value })} /></td>
                        <td className="bg-[#fff4e8]/70 px-5 py-2.5 text-ink-soft">{r.buyingFacility}</td>
                        <td className="bg-[#fff4e8]/70 px-4 py-2.5"><Input className="h-9" placeholder="e.g. 362km" value={r.buyingDistance} onChange={(e) => patch(r.id, { buyingDistance: e.target.value })} /></td>
                      </>
                    )}
                    <td className="px-5 py-2.5">
                      <button
                        onClick={() => patch(r.id, { active: !r.active })}
                        role="switch"
                        aria-checked={r.active}
                        title={r.active ? 'Active' : 'Inactive'}
                        className={`relative h-6 w-11 rounded-full transition ${r.active ? 'bg-brand' : 'bg-[#c4cfe4]'}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.active ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => saveRow(r)}
                          disabled={!r.farmerDistance.trim() || !r.billingDistance.trim() || !r.buyingDistance.trim()}
                          title="Save"
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand disabled:opacity-40"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() =>
                            r.farmerDistance.trim() && r.billingDistance.trim() && r.buyingDistance.trim()
                              ? patch(r.id, { editing: false })
                              : removeRow(r.id)
                          }
                          title="Discard"
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[#fdecec] hover:text-[#c23b3b]"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-4 font-600 text-ink">{transporterLabel(r.transporter)}</td>
                    <td className="bg-[#f2efff]/70 px-5 py-4 text-ink-soft">{r.billingFacility}</td>
                    <td className="bg-[#f2efff]/70 px-5 py-4 tabular-nums text-ink-soft">{r.previousBillingDistance ? <DistanceWithOverride value={r.billingDistance} previous={r.previousBillingDistance} /> : formatKm(r.billingDistance)}</td>
                    <td className="bg-[#edf8f1]/70 px-5 py-4 text-ink-soft">{farmerLabel(r.farmer)}</td>
                    <td className="bg-[#edf8f1]/70 px-5 py-4 tabular-nums text-ink-soft">{r.previousFarmerDistance ? <DistanceWithOverride value={r.farmerDistance} previous={r.previousFarmerDistance} /> : formatKm(r.farmerDistance)}</td>
                    <td className="bg-[#fff4e8]/70 px-5 py-4 text-ink-soft">{r.buyingFacility}</td>
                    <td className="bg-[#fff4e8]/70 px-5 py-4 tabular-nums text-ink-soft">{r.previousBuyingDistance ? <DistanceWithOverride value={r.buyingDistance} previous={r.previousBuyingDistance} /> : formatKm(r.buyingDistance)}</td>
                    <td className="px-5 py-4">
                      <Badge tone={r.active ? 'green' : 'neutral'}>
                        {r.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => onViewRoute(r)}
                          title="View route"
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
                        >
                          <MapPin size={16} />
                        </button>
                        <button
                          onClick={() => patch(r.id, { editing: true })}
                          title="Override registered distance"
                          className="grid h-8 w-8 place-items-center rounded-lg text-brand transition hover:bg-brand-soft"
                        >
                          <Undo2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
        </div>
      </div>


      <Modal open={!!pendingSave} onClose={() => setPendingSave(null)} title="Confirm distance override" width="max-w-md">
        {pendingSave ? <><p className="text-[14px] leading-relaxed text-ink-soft">Save the three registered distance legs for <span className="font-700 text-ink">{pendingSave.transporter} → {pendingSave.farmer}</span>?</p><p className="mt-2 text-[12.5px] text-muted">Farmer: {pendingSave.farmerDistance} · Billing: {pendingSave.billingDistance} · Buying: {pendingSave.buyingDistance}</p><div className="mt-6 flex justify-end gap-2.5"><Button variant="outline" onClick={() => setPendingSave(null)}>Cancel</Button><Button onClick={confirmSave}><Check size={16} /> Confirm override</Button></div></> : null}
      </Modal>
    </div>
  )
}

function DistanceHeader({ children, className }: { children: React.ReactNode; className: string }) {
  return <th className={`px-5 py-3.5 ${className}`}><span className="inline-flex items-center gap-1.5">{children}<span title="Distance from the transporter" aria-label="Distance from the transporter" className="inline-flex cursor-help normal-case text-current/70"><Info size={14} /></span></span></th>
}

function DistanceWithOverride({ value, previous }: { value: string; previous: string }) {
  return <span className="inline-flex items-center gap-1.5">{formatKm(value)}<span title={`Previous distance: ${formatKm(previous)}`} aria-label={`Previous distance: ${formatKm(previous)}`} className="inline-flex cursor-help text-brand"><Info size={14} /></span></span>
}

/* ===== TOLL DETAILS PANEL (plazas on the current route) ===== */
export function TollPanel({
  activeTolls,
  selected,
  tollTotals,
  onClose,
  onNavigate,
}: {
  activeTolls: Toll[]
  selected: RouteOption
  tollTotals: TollTotals
  onClose: () => void
  onNavigate: (to: string) => void
}) {
  return (
    <div className="animate-pop min-h-0 flex-[7] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-700 text-ink">Toll Details</h2>
          <span className="text-[12px] text-muted">
            ({activeTolls.length} plaza{activeTolls.length === 1 ? '' : 's'} on this route)
          </span>
        </div>
        <button
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
        >
          <X size={17} />
        </button>
      </div>

      {/* Compact route readout + CTA to the full Suggested Routes planner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/40 px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
          <span className="inline-flex items-center gap-1.5 font-700 text-ink">
            <span className="grid h-5 w-5 place-items-center rounded-md bg-brand-soft text-brand">
              <Route size={12} />
            </span>
            {selected.label}
          </span>
          <span className="text-muted">{selected.tag}</span>
          <span className="inline-flex items-center gap-1 tabular-nums text-ink-soft">
            <Clock size={12} className="text-muted" />
            {selected.distanceKm.toFixed(1)} km
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums font-700 text-brand">
            <Coins size={12} />
            {fmtBRL(tollTotals.truck2)}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNavigate('routes')}>
          <SlidersHorizontal size={14} /> Suggested routes
        </Button>
      </div>

      <div className="max-h-[calc(100%-56px)] overflow-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="sticky top-0 bg-brand-soft/60 text-left text-[11.5px] font-700 uppercase tracking-wide text-brand">
              <th className="w-10 px-4 py-3">#</th>
              <th className="px-4 py-3">Toll Plaza / Location</th>
              <th className="px-4 py-3">Highway / Road</th>
              <th className="px-4 py-3">Toll Type</th>
              <th className="px-4 py-3 text-right">Car / Pickup</th>
              <th className="px-4 py-3 text-right">Light Truck</th>
              <th className="px-4 py-3 text-right">Truck (2 Axles)</th>
              <th className="px-4 py-3 text-right">Truck (3+ Axles)</th>
            </tr>
          </thead>
          <tbody>
            {activeTolls.length === 0 ? (
              <tr className="border-t border-line">
                <td className="px-4 py-6 text-center text-[13px] text-muted" colSpan={8}>
                  This route does not pass any toll plaza. Change the
                  transporter or add a stop near a highway to incur tolls.
                </td>
              </tr>
            ) : (
              activeTolls.map((t, i) => (
                <tr key={t.plaza} className="border-t border-line">
                  <td className="px-4 py-3 tabular-nums text-muted">{i + 1}</td>
                  <td className="px-4 py-3 font-600 text-ink">{t.plaza}</td>
                  <td className="px-4 py-3">{t.road}</td>
                  <td className="px-4 py-3 text-muted">{t.kind}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.car}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.lcv}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.truck2}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.truck3}</td>
                </tr>
              ))
            )}
            {activeTolls.length > 0 && (
              <tr className="border-t border-line bg-canvas font-700 text-brand">
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-ink" colSpan={3}>
                  Total ({activeTolls.length} plaza{activeTolls.length === 1 ? '' : 's'})
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(tollTotals.car)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(tollTotals.lcv)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(tollTotals.truck2)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(tollTotals.truck3)}</td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="px-4 py-3 text-[11.5px] text-muted">
          * Only plazas along the current route are shown. Values are
          subject to change as per concessionaire.
        </p>
      </div>
    </div>
  )
}
