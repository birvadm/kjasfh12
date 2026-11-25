import { useState } from 'react'
import { Check, Info, MapPin, Undo2, X } from '../components/icons'
import { Button, Modal } from '../components/ui'
import { DEST_CATALOG, FARMER_CATALOG, ROUTE_FARMERS, type Farmer } from '../data'
import { MapCanvas } from './RouteMapCanvas'
import type { DistanceRoute } from './RouteMapPanels'

const stationMap: Record<string, string> = {
  '123 - Santa Cruz do Sul': 'Posto de Compra',
  '234 - Rio Pardo': 'Unidade Rio Pardo',
  '345 - Vera Cruz': 'Armazém Vale do Sol',
  '456 - Venâncio Aires': 'Estação Venâncio Aires',
  '567 - Lajeado': 'Armazém Vale do Sol',
  '678 - Estrela': 'Posto de Compra',
}

const farmer = (name: string): Farmer =>
  [...ROUTE_FARMERS, ...FARMER_CATALOG].find((row) => row.name === name) ?? {
    name,
    city: 'RS',
  }

const distanceInKm = (value: unknown) => {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

const formatKm = (value: number) => `${value.toFixed(2)}km`

type Leg = 'farmerDistance' | 'billingDistance' | 'buyingDistance'

type LegConfig = {
  key: Leg
  label: string
  facility: (v: DistanceRoute) => string
  swatch: string
  headBg: string
  headText: string
  ring: string
}

const LEGS: LegConfig[] = [
  {
    key: 'billingDistance',
    label: 'Billing facility distance',
    facility: (v) => v.billingFacility,
    swatch: '#5d52a4',
    headBg: '#f2efff',
    headText: '#5d52a4',
    ring: 'focus-within:border-[#7b6fc7] focus-within:ring-[#ece7fb]',
  },
  {
    key: 'farmerDistance',
    label: 'Farmer distance',
    facility: (v) => v.farmer,
    swatch: '#187247',
    headBg: '#edf8f1',
    headText: '#187247',
    ring: 'focus-within:border-[#3f9d6b] focus-within:ring-[#e2f4ea]',
  },
  {
    key: 'buyingDistance',
    label: 'Buying facility distance',
    facility: (v) => v.buyingFacility,
    swatch: '#a45d14',
    headBg: '#fff4e8',
    headText: '#a45d14',
    ring: 'focus-within:border-[#cf8635] focus-within:ring-[#fbeed9]',
  },
]

export function DistanceRouteDetail({
  value,
  onSave,
}: {
  value: DistanceRoute
  onSave: (next: DistanceRoute) => void
}) {
  const [distances, setDistances] = useState<Record<Leg, string>>(() => ({
    farmerDistance: value.farmerDistance ?? '',
    billingDistance: value.billingDistance ?? '',
    buyingDistance: value.buyingDistance ?? '',
  }))
  const [draftDistances, setDraftDistances] = useState(distances)
  const [overriding, setOverriding] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [focus, setFocus] = useState<string | null>(null)
  const destination =
    DEST_CATALOG.find((row) => row.name === stationMap[value.buyingFacility]) ??
    DEST_CATALOG[0]
  const setLeg = (key: Leg, distance: string) =>
    setDraftDistances((current) => ({ ...current, [key]: distance }))
  const hasEmpty = LEGS.some((leg) => !draftDistances[leg.key].trim())
  const changed = LEGS.filter((leg) => draftDistances[leg.key] !== distances[leg.key])

  const cancelOverride = () => {
    setDraftDistances(distances)
    setOverriding(false)
  }

  const saveOverride = () => setConfirmSave(true)

  const confirmOverride = () => {
    setDistances(draftDistances)
    setOverriding(false)
    setConfirmSave(false)
    onSave({
      ...value,
      farmerDistance: draftDistances.farmerDistance,
      billingDistance: draftDistances.billingDistance,
      buyingDistance: draftDistances.buyingDistance,
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-[280px]">
          <p className="text-[11px] font-700 uppercase tracking-wide text-muted">
            Transporter
          </p>
          <p className="mt-1 text-[16px] font-700 text-ink">{value.transporter}</p>
          </div>

          <div className="flex items-center gap-2.5">
            {overriding ? (
              <>
                <Button variant="outline" onClick={cancelOverride}>
                  <X size={16} /> Cancel
                </Button>
                <Button onClick={saveOverride} disabled={hasEmpty || changed.length === 0}>
                  <Check size={16} /> Save all
                </Button>
              </>
            ) : (
              <Button onClick={() => setOverriding(true)}>
                <Undo2 size={16} /> Override
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {LEGS.map((leg) => (
            <div
              key={leg.key}
              className="rounded-xl border border-line"
              style={{ backgroundColor: overriding ? '#fff' : `${leg.headBg}80` }}
            >
              <div
                className="flex items-center gap-2 rounded-t-xl px-3.5 py-2"
                style={{ backgroundColor: leg.headBg }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: leg.swatch }}
                />
                <span className="flex items-center gap-1.5 text-[11.5px] font-700 uppercase tracking-wide" style={{ color: leg.headText }}>
                  {leg.label}
                  <span title="Distance from the transporter" aria-label="Distance from the transporter" className="inline-flex cursor-help opacity-70"><Info size={14} /></span>
                </span>
              </div>
              <div className="p-3">
                <p className="mb-2 truncate text-[12px] font-600 text-ink-soft" title={leg.facility(value)}>
                  {leg.facility(value)}
                </p>
                {overriding ? (
                  <div
                    className={`flex h-10 items-center rounded-lg border border-line bg-white px-3 transition focus-within:ring-4 ${leg.ring}`}
                  >
                    <input
                      value={draftDistances[leg.key]}
                      inputMode="decimal"
                      onChange={(event) => setLeg(leg.key, event.target.value)}
                      placeholder="e.g. 182km"
                      className="w-full bg-transparent text-[14px] font-600 tabular-nums text-ink outline-none placeholder:font-400 placeholder:text-muted/70"
                    />
                    <span className="ml-auto text-[11px] text-muted">km</span>
                  </div>
                ) : (
                  <p className="text-[16px] font-700 tabular-nums text-ink">
                    {formatKm(distanceInKm(distances[leg.key]))}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={confirmSave} onClose={() => setConfirmSave(false)} title="Confirm distance override" width="max-w-md">
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Save the updated farmer, billing facility, and buying facility distances for <span className="font-700 text-ink">{value.transporter} → {value.farmer}</span>?
        </p>
        <p className="mt-2 text-[12.5px] text-muted">Farmer: {draftDistances.farmerDistance} · Billing: {draftDistances.billingDistance} · Buying: {draftDistances.buyingDistance}</p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setConfirmSave(false)}>Cancel</Button>
          <Button onClick={confirmOverride}><Check size={16} /> Confirm override</Button>
        </div>
      </Modal>

      <div className="relative h-[560px] overflow-hidden rounded-2xl border border-line bg-[#f1f3f4] shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <MapCanvas
          stops={[
            {
              name: stationMap[value.billingFacility] ?? value.billingFacility,
              city: 'Billing facility · pick up supplies',
              color: '#5d52a4',
              label: '1 · Pick up supplies',
              removable: false,
            },
            {
              ...farmer(value.farmer),
              color: '#187247',
              label: '2 · Deliver supplies / collect tobacco',
              removable: false,
            },
          ]}
          nearby={[]}
          onAdd={() => {}}
          onRemove={() => {}}
          sourceName={value.transporter}
          dest={destination}
          focus={focus}
          onFocus={setFocus}
          activeTollIdx={[]}
          stopColor="#187247"
          destinationColor="#a45d14"
        />
        <div className="absolute left-5 top-5 rounded-xl border border-line bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-[11px] font-700 uppercase tracking-wide text-muted">
            Destination
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] font-700 text-ink">
            <MapPin size={15} className="text-brand" />
            Buying facility · {value.buyingFacility}
          </p>
        </div>
      </div>
    </div>
  )
}
