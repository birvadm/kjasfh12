import { useMemo, useRef, useState, useEffect } from 'react'
import {
  Boxes,
  ChevronDown,
  Clock,
  Coins,
  GripVertical,
  Home,
  Plus,
  Receipt,
  Route,
  Search,
  SlidersHorizontal,
  X,
} from '../components/icons'
import {
  FARMER_CATALOG,
  OVERRIDE_REASONS,
  STOPS_BY_TRANSPORTER,
  TOLL_ROUTE_OPTIONS,
  TOLL_ROWS,
  TRANSPORTERS,
  type Farmer,
  type RouteState,
} from '../data'
import { Button, Modal, Select, useToast } from '../components/ui'

import { MapCanvas, SRC_KEY } from './RouteMapCanvas'
import { ItemsPanel, TollPanel, type DistanceRoute } from './RouteMapPanels'

export function RouteMap({
  route,
  onNavigate,
  onViewDistanceRoute,
}: {
  route: RouteState
  onNavigate: (to: string) => void
  onViewDistanceRoute: (route: DistanceRoute) => void
}) {
  const toast = useToast()
  const { source, setSource, stops, setStops, dest, routeId, setRouteId } =
    route
  const [mode] = useState<'items'>('items')
  const [itemDist, setItemDist] = useState<Record<string, string>>({})
  const [focus, setFocus] = useState<string | null>(null)
  const [srcOpen, setSrcOpen] = useState(false)
  const [srcQuery, setSrcQuery] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)
  const [tollOpen, setTollOpen] = useState(false)
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reason, setReason] = useState(OVERRIDE_REASONS[0])
  const [manualDist, setManualDist] = useState('74.10')
  const [comments, setComments] = useState(
    'Road diversion near Candelária due to road works on RS-287.',
  )
  const addRef = useRef<HTMLDivElement>(null)
  const srcRef = useRef<HTMLDivElement>(null)

  // System-suggested route combinations for the selected transporter.
  const options =
    TOLL_ROUTE_OPTIONS[source.name] ?? TOLL_ROUTE_OPTIONS['Transporter Base']
  const selected = options.find((o) => o.id === routeId) ?? options[0]

  const km = selected.distanceKm
  const mins = selected.durationMin
  const travel = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`

  const activeTollIdx = selected.tollIdx
  const activeTolls = activeTollIdx.map((i) => TOLL_ROWS[i])
  const toll = activeTolls.reduce((s, t) => s + parseBRL(t.truck2), 0)
  const tollTotals = activeTolls.reduce(
    (a, t) => ({
      car: a.car + parseBRL(t.car),
      lcv: a.lcv + parseBRL(t.lcv),
      truck2: a.truck2 + parseBRL(t.truck2),
      truck3: a.truck3 + parseBRL(t.truck3),
    }),
    { car: 0, lcv: 0, truck2: 0, truck3: 0 },
  )

  // Items-based freight legs: each farmer (tobacco origin) → destination, with
  // a manually adjustable distance in km.
  const itemRows = stops.map((f, i) => ({
    farmer: f,
    km: itemDist[f.name] ?? ITEM_SAMPLE[i % ITEM_SAMPLE.length],
  }))
  const itemsTotal = itemRows.reduce((s, r) => s + (parseFloat(r.km) || 0), 0)

  const available = useMemo(() => {
    const taken = stops.map((s) => s.name)
    return FARMER_CATALOG.filter(
      (c) =>
        !taken.includes(c.name) &&
        c.name.toLowerCase().includes(query.trim().toLowerCase()),
    )
  }, [stops, query])

  const transporters = useMemo(
    () =>
      TRANSPORTERS.filter(
        (t) =>
          t.name.toLowerCase().includes(srcQuery.trim().toLowerCase()) ||
          t.city.toLowerCase().includes(srcQuery.trim().toLowerCase()),
      ),
    [srcQuery],
  )

  const nearby = useMemo(
    () => FARMER_CATALOG.filter((c) => !stops.some((s) => s.name === c.name)),
    [stops],
  )

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (addOpen && !addRef.current?.contains(e.target as Node))
        setAddOpen(false)
      if (srcOpen && !srcRef.current?.contains(e.target as Node))
        setSrcOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [addOpen, srcOpen])

  const add = (f: Farmer) => {
    setStops((s) => [...s, f])
    setFocus(f.name)
    setAddOpen(false)
    setQuery('')
  }
  const remove = (name: string) => {
    setStops((s) => s.filter((x) => x.name !== name))
    setFocus((cur) => (cur === name ? null : cur))
  }
  const pickTransporter = (t: Farmer) => {
    setSource(t)
    setStops(STOPS_BY_TRANSPORTER[t.name] ?? [])
    const opts = TOLL_ROUTE_OPTIONS[t.name] ?? TOLL_ROUTE_OPTIONS['Transporter Base']
    setRouteId(opts[0].id)
    setFocus(null)
    setSrcOpen(false)
  }
  const reorder = (from: number, to: number) => {
    if (from === to) return
    setStops((s) => {
      const next = [...s]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  return (
    <div>
      {mode === 'items' ? (
        <ItemsPanel onViewRoute={onViewDistanceRoute} />
      ) : (
      <>
      {/* ===== HEADER = ROUTE & DISTANCE SUMMARY ===== */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-white px-5 py-3 shadow-[0_1px_2px_rgba(15,30,61,0.05)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Metric
            icon={<Route size={15} />}
            label="Total Distance"
            value={km.toFixed(2)}
            unit="km"
            strong
          />
          <div className="hidden h-8 w-px bg-line sm:block" />
          <Metric icon={<Clock size={15} />} label="Travel Time" value={travel} />
          <div className="hidden h-8 w-px bg-line sm:block" />
          <Metric
            icon={<Coins size={15} />}
            label="Total Tolls"
            value={`R$ ${toll.toFixed(2)}`}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant={tollOpen ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTollOpen((o) => !o)}
          >
            <Receipt size={15} /> {tollOpen ? 'Hide Tolls' : 'Toll Details'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOverrideOpen(true)}
          >
            <SlidersHorizontal size={15} /> Manual Override
          </Button>
        </div>
      </div>

      {/* ===== MAP + TOLL SPLIT ===== */}
      <div className="flex h-[660px] flex-col gap-4">
        {tollOpen && (
          <TollPanel
            activeTolls={activeTolls}
            selected={selected}
            tollTotals={tollTotals}
            onClose={() => setTollOpen(false)}
            onNavigate={onNavigate}
          />
        )}

        <div
          className={`relative min-h-0 overflow-hidden rounded-2xl border border-line bg-[#f1f3f4] shadow-[0_1px_2px_rgba(15,30,61,0.05)] ${
            tollOpen ? 'flex-[3]' : 'flex-1'
          }`}
        >
          <MapCanvas
            stops={stops}
            nearby={nearby}
            onAdd={add}
            onRemove={remove}
            sourceName={source.name}
            dest={dest}
            focus={focus}
            onFocus={setFocus}
            activeTollIdx={activeTollIdx}
          />

          {focus && (
            <button
              onClick={() => setFocus(null)}
              className="animate-pop absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-line bg-white/95 px-3.5 py-2 text-[13px] font-600 text-ink-soft shadow-[0_8px_24px_-8px_rgba(15,30,61,0.35)] backdrop-blur transition hover:bg-white hover:text-ink"
            >
              <X size={14} /> Reset view
            </button>
          )}

          {/* LEFT OVERLAY: Route & Stops (collapsible) */}
          <div
            className={`absolute left-4 top-4 z-10 flex w-[360px] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white/95 shadow-[0_16px_48px_-16px_rgba(15,30,61,0.4)] backdrop-blur ${
              panelOpen ? 'bottom-4' : ''
            }`}
          >
            <button
              onClick={() => setPanelOpen((o) => !o)}
              className="flex items-center gap-2.5 px-5 py-4 text-left transition hover:bg-canvas/60"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
                <Route size={18} />
              </span>
              <h2 className="flex-1 text-[15px] font-700 text-ink">
                Route &amp; Stops
              </h2>
              <ChevronDown
                size={18}
                className={`text-muted transition ${panelOpen ? '' : '-rotate-90'}`}
              />
            </button>

            {panelOpen && (
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto border-t border-line px-5 py-4">
                {/* Source — searchable transporter */}
                <div>
                  <p className="mb-1.5 text-[11px] font-700 uppercase tracking-wide text-muted">
                    Source (Transporter)
                  </p>
                  <div ref={srcRef} className="relative">
                    <button
                      onClick={() => {
                        setSrcOpen((o) => !o)
                        setSrcQuery('')
                        setFocus(SRC_KEY)
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition hover:border-brand-ring ${
                        focus === SRC_KEY ? 'border-brand ring-4 ring-brand-soft' : 'border-line'
                      }`}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                        <Home size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-700 text-brand">
                          {source.name}
                        </p>
                        <p className="truncate text-[12px] text-muted">
                          {source.city}
                        </p>
                      </div>
                      <ChevronDown size={16} className="text-muted" />
                    </button>

                    {srcOpen && (
                      <div className="animate-pop absolute left-0 right-0 top-[70px] z-30 rounded-xl border border-line bg-white p-2.5 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]">
                        <div className="flex items-center gap-2 rounded-lg border border-line px-2.5">
                          <Search size={14} className="text-muted" />
                          <input
                            autoFocus
                            value={srcQuery}
                            onChange={(e) => setSrcQuery(e.target.value)}
                            placeholder="Search transporter"
                            className="h-8 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted/70"
                          />
                        </div>
                        <div className="mt-2 max-h-48 overflow-y-auto">
                          {transporters.length === 0 ? (
                            <p className="px-2 py-3 text-center text-[12.5px] text-muted">
                              No transporter matches.
                            </p>
                          ) : (
                            transporters.map((t) => (
                              <button
                                key={t.name}
                                onClick={() => pickTransporter(t)}
                                className={`flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition hover:bg-brand-soft ${
                                  t.name === source.name ? 'bg-brand-soft' : ''
                                }`}
                              >
                                <span className="text-[13px] font-600 text-ink">
                                  {t.name}
                                </span>
                                <span className="text-[11.5px] text-muted">
                                  {t.city}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stops */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[11px] font-700 uppercase tracking-wide text-muted">
                      Intermediate Stops (Farmers)
                    </p>
                    <div ref={addRef} className="relative">
                      <button
                        onClick={() => {
                          setAddOpen((o) => !o)
                          setQuery('')
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[12px] font-600 text-brand transition hover:bg-brand-soft"
                      >
                        <Plus size={13} strokeWidth={2.6} /> Add Stop
                      </button>
                      {addOpen && (
                        <div className="animate-pop absolute right-0 top-9 z-30 w-60 rounded-xl border border-line bg-white p-2.5 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]">
                          <div className="flex items-center gap-2 rounded-lg border border-line px-2.5">
                            <Search size={14} className="text-muted" />
                            <input
                              autoFocus
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              placeholder="Search farmer"
                              className="h-8 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted/70"
                            />
                          </div>
                          <div className="mt-2 max-h-44 overflow-y-auto">
                            {available.length === 0 ? (
                              <p className="px-2 py-3 text-center text-[12.5px] text-muted">
                                No farmer matches that name.
                              </p>
                            ) : (
                              available.map((f) => (
                                <button
                                  key={f.name}
                                  onClick={() => add(f)}
                                  className="flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition hover:bg-brand-soft"
                                >
                                  <span className="text-[13px] font-600 text-ink">
                                    {f.name}
                                  </span>
                                  <span className="text-[11.5px] text-muted">
                                    {f.city}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {stops.map((f, i) => (
                      <div
                        key={f.name}
                        draggable
                        onClick={() => setFocus(f.name)}
                        onDragStart={() => setDragIdx(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (dragIdx !== null) reorder(dragIdx, i)
                          setDragIdx(null)
                        }}
                        onDragEnd={() => setDragIdx(null)}
                        className={`flex items-center gap-2.5 rounded-xl border bg-white px-2.5 py-2 transition ${
                          dragIdx === i ? 'opacity-40' : ''
                        } ${
                          focus === f.name
                            ? 'border-brand ring-4 ring-brand-soft'
                            : 'border-line hover:border-brand-ring'
                        }`}
                      >
                        <GripVertical
                          size={16}
                          className="shrink-0 cursor-grab text-muted/50 active:cursor-grabbing"
                        />
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-700 text-white">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-600 text-ink">
                            {f.name}
                          </p>
                          <p className="truncate text-[11.5px] text-muted">
                            {f.city}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            remove(f.name)
                          }}
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-[#fdecec] hover:text-[#c23b3b]"
                          aria-label={`Remove ${f.name}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                    {stops.length === 0 && (
                      <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-muted">
                        No intermediate stops. Add a farmer to build the route.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}

      {/* ===== MANUAL OVERRIDE MODAL ===== */}
      <Modal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        title="Manual Override"
        width="max-w-lg"
      >
        <p className="text-[13.5px] leading-relaxed text-muted">
          Replace the system-calculated distance for this trip. The saved value
          takes precedence in downstream freight calculations.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="System Calculated Distance">
            <div className="flex h-10 items-center rounded-lg border border-line bg-canvas px-3 text-[13.5px] text-muted">
              {km.toFixed(2)}
              <span className="ml-auto text-[11.5px]">km</span>
            </div>
          </Field>
          <Field label="Manually Entered Distance">
            <div className="flex h-10 items-center rounded-lg border border-line bg-white px-3 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-soft">
              <input
                value={manualDist}
                onChange={(e) => setManualDist(e.target.value)}
                inputMode="decimal"
                className="w-full bg-transparent text-[13.5px] text-ink outline-none"
              />
              <span className="ml-auto text-[11.5px] text-muted">km</span>
            </div>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Reason (Optional)">
            <Select
              value={reason}
              onChange={setReason}
              options={OVERRIDE_REASONS.map((r) => ({ value: r, label: r }))}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Comments (Optional)">
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value.slice(0, 200))}
              rows={3}
              className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-[13.5px] leading-relaxed text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
            />
            <p className="mt-1 text-right text-[11px] text-muted">
              {comments.length}/200
            </p>
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOverrideOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setConfirmOpen(true)}>Save Override</Button>
        </div>
      </Modal>

      {/* ===== CONFIRMATION MODAL ===== */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Save manual override?"
        width="max-w-md"
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Are you sure you want to replace the system distance of{' '}
          <span className="font-700 text-ink">{km.toFixed(2)} km</span> with{' '}
          <span className="font-700 text-ink">{manualDist || '0'} km</span> for
          this trip? This change is logged against your user.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfirmOpen(false)
              setOverrideOpen(false)
              toast({
                tone: 'success',
                title: 'Override saved',
                body: `Trip distance set to ${manualDist || '0'} km.`,
              })
            }}
          >
            Yes, save override
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  unit,
  strong,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          strong ? 'bg-brand-soft text-brand' : 'bg-canvas text-ink-soft'
        }`}
      >
        {icon}
      </span>
      <div className="leading-tight">
        <span className="block text-[10.5px] font-600 uppercase tracking-wide text-muted">
          {label}
        </span>
        <span
          className={`tabular-nums font-800 ${
            strong ? 'text-[18px] text-brand' : 'text-[16px] text-ink'
          }`}
        >
          {value}
          {unit ? (
            <span className="ml-0.5 text-[11px] font-600 text-muted">
              {unit}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-500 text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

// Seed distances (km) for items-based freight legs; user can edit each one.
const ITEM_SAMPLE = ['32.40', '58.10', '21.75', '44.90', '67.20', '18.60']

const parseBRL = (s: string) => Number(s.replace(/[^0-9.]/g, '')) || 0


export default RouteMap
