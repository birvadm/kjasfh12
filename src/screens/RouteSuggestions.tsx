import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Home,
  MapPin,
  Plus,
  Receipt,
  Route,
  Search,
  Undo2,
  X,
} from '../components/icons'
import {
  DEST_CATALOG,
  FARMER_CATALOG,
  ROUTE_FARMERS,
  STOPS_BY_TRANSPORTER,
  TOLL_ROUTE_OPTIONS,
  TOLL_ROWS,
  TRANSPORTERS,
  type Farmer,
  type RouteState,
} from '../data'
import { Button, useToast } from '../components/ui'

const parseBRL = (s: string) => Number(s.replace(/[^0-9.]/g, '')) || 0
const fmtBRL = (n: number) =>
  `R$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const dur = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`

export function RouteSuggestions({
  route,
  onNavigate,
}: {
  route: RouteState
  onNavigate: (to: string) => void
}) {
  const toast = useToast()
  const { source, setSource, stops, setStops, dest, setDest, routeId, setRouteId } =
    route

  const options =
    TOLL_ROUTE_OPTIONS[source.name] ?? TOLL_ROUTE_OPTIONS['Transporter Base']
  const selected = options.find((o) => o.id === routeId) ?? options[0]
  const activeTolls = selected.tollIdx.map((i) => TOLL_ROWS[i])
  const totals = activeTolls.reduce(
    (a, t) => ({
      car: a.car + parseBRL(t.car),
      lcv: a.lcv + parseBRL(t.lcv),
      truck2: a.truck2 + parseBRL(t.truck2),
      truck3: a.truck3 + parseBRL(t.truck3),
    }),
    { car: 0, lcv: 0, truck2: 0, truck3: 0 },
  )

  // Farmers not already on the route (for swapping / adding stops).
  const pool = [...ROUTE_FARMERS, ...FARMER_CATALOG].filter(
    (f, i, arr) => arr.findIndex((x) => x.name === f.name) === i,
  )

  const pickTransporter = (t: Farmer) => {
    setSource(t)
    setStops(STOPS_BY_TRANSPORTER[t.name] ?? [])
    const opts = TOLL_ROUTE_OPTIONS[t.name] ?? TOLL_ROUTE_OPTIONS['Transporter Base']
    setRouteId(opts[0].id)
  }
  const swapStop = (idx: number, f: Farmer) =>
    setStops((s) => s.map((x, i) => (i === idx ? f : x)))
  const removeStop = (idx: number) =>
    setStops((s) => s.filter((_, i) => i !== idx))
  const addStop = (f: Farmer) => setStops((s) => [...s, f])

  const reroute = () => {
    // System re-plans and returns its recommended (first) option.
    setRouteId(options[0].id)
    toast({
      tone: 'success',
      title: 'Route re-planned',
      body: `System suggested "${options[0].label}" for ${source.name}.`,
    })
  }

  const availableStops = pool.filter((f) => !stops.some((s) => s.name === f.name))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
            <Route size={20} />
          </span>
          <div>
            <h1 className="text-[19px] font-800 leading-tight text-ink">
              Suggested routes
            </h1>
            <p className="text-[13px] text-muted">
              System-optimized route from transporter to billing station — tune it or re-route.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => onNavigate('routemap')}>
            <MapPin size={15} /> View on map
          </Button>
          <Button size="sm" onClick={reroute}>
            <Undo2 size={15} /> Re-route to system
          </Button>
        </div>
      </div>

      {/* Recommended route — editable breadcrumb chain */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="mb-3 flex items-center gap-1.5 text-[11px] font-700 uppercase tracking-wide text-muted">
          <span className="grid h-4 w-4 place-items-center rounded bg-[#e8f6ee] text-[#1a7a45]">
            <Check size={11} strokeWidth={3} />
          </span>
          Recommended route
        </div>

        {/* Chain: Transporter → farmers → billing station */}
        <div className="flex flex-wrap items-center gap-x-0.5 gap-y-2 rounded-2xl bg-canvas/50 p-2.5 ring-1 ring-line/70">
          <Picker
            tone="brand"
            icon={<Home size={15} />}
            kicker="Transporter"
            value={source}
            list={TRANSPORTERS}
            onPick={pickTransporter}
          />
          <Arrow />
          {stops.map((f, i) => (
            <span key={f.name} className="flex items-center gap-x-0.5">
              <Picker
                tone="blue"
                index={i + 1}
                kicker="Farmer"
                value={f}
                list={[f, ...availableStops]}
                onPick={(nf) => swapStop(i, nf)}
                onRemove={() => removeStop(i)}
              />
              <Arrow />
            </span>
          ))}
          {availableStops.length > 0 && (
            <>
              <AddStop options={availableStops} onAdd={addStop} />
              <Arrow />
            </>
          )}
          <Picker
            tone="purple"
            icon={<MapPin size={15} />}
            kicker="Billing station"
            value={dest}
            list={DEST_CATALOG}
            onPick={setDest}
          />
        </div>

        {/* Metrics for the currently selected option */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4">
          <Metric icon={<Route size={15} />} label="Distance" value={`${selected.distanceKm.toFixed(1)} km`} strong />
          <Metric icon={<Clock size={15} />} label="Travel time" value={dur(selected.durationMin)} />
          <Metric icon={<Coins size={15} />} label="Total tolls (2-axle)" value={fmtBRL(totals.truck2)} strong />
          <Metric
            icon={<Receipt size={15} />}
            label="Plazas"
            value={`${selected.tollIdx.length} on route`}
          />
        </div>
      </div>

      {/* Other suggested routes */}
      <div>
        <div className="mb-2.5 flex items-baseline gap-2">
          <h2 className="text-[14px] font-700 text-ink">Other suggested routes</h2>
          <span className="text-[12px] text-muted">
            {options.length} option{options.length === 1 ? '' : 's'} for {source.name}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((o, i) => {
            const on = o.id === selected.id
            const total = o.tollIdx.reduce((s, idx) => s + parseBRL(TOLL_ROWS[idx].truck2), 0)
            return (
              <button
                key={o.id}
                onClick={() => setRouteId(o.id)}
                className={`group relative rounded-xl border px-4 py-3.5 text-left transition ${
                  on
                    ? 'border-brand bg-brand-soft/60 ring-4 ring-brand-soft'
                    : 'border-line bg-white hover:border-brand-ring hover:bg-canvas/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`truncate text-[14px] font-700 ${on ? 'text-brand' : 'text-ink'}`}>
                        {o.label}
                      </p>
                      {i === 0 && (
                        <span className="rounded-full bg-[#e8f6ee] px-1.5 py-0.5 text-[10px] font-700 uppercase tracking-wide text-[#1a7a45]">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-muted">{o.tag}</p>
                  </div>
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition ${
                      on
                        ? 'border-brand bg-brand text-white'
                        : 'border-line text-transparent group-hover:border-brand-ring'
                    }`}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-[12px] text-ink-soft">
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Route size={12} className="text-muted" />
                    {o.distanceKm.toFixed(1)} km
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock size={12} className="text-muted" />
                    {dur(o.durationMin)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11.5px] text-muted">
                    {o.tollIdx.length === 0
                      ? 'No tolls'
                      : `${o.tollIdx.length} plaza${o.tollIdx.length === 1 ? '' : 's'}`}
                  </span>
                  <span className={`text-[13px] font-700 tabular-nums ${on ? 'text-brand' : 'text-ink'}`}>
                    {fmtBRL(total)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Toll table for the selected route */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div className="flex items-baseline justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[15px] font-700 text-ink">Toll details</h2>
            <span className="text-[12px] text-muted">
              ({activeTolls.length} plaza{activeTolls.length === 1 ? '' : 's'} on “{selected.label}”)
            </span>
          </div>
          {activeTolls.length > 0 && (
            <p className="text-[12px] text-muted">
              Would rather avoid tolls?{' '}
              <button
                onClick={reroute}
                className="font-700 text-brand underline-offset-2 hover:underline"
              >
                Re-route to system
              </button>
            </p>
          )}
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="bg-brand-soft/60 text-left text-[11.5px] font-700 uppercase tracking-wide text-brand">
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
                  <td className="px-4 py-8 text-center text-[13px] text-muted" colSpan={8}>
                    This route is toll-free — no plazas along the way.
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
                  <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(totals.car)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(totals.lcv)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(totals.truck2)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtBRL(totals.truck3)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <span className="flex shrink-0 items-center px-1 text-muted/50" aria-hidden>
      <span className="hidden h-px w-3 rounded bg-line sm:block" />
      <ChevronRight size={15} className="-ml-0.5" />
    </span>
  )
}

const TONE: Record<string, { kick: string; ic: string; ring: string }> = {
  brand: {
    kick: 'text-brand',
    ic: 'bg-brand-soft text-brand',
    ring: 'border-brand ring-brand/25',
  },
  blue: {
    kick: 'text-[#1a73e8]',
    ic: 'bg-[#e8f0fe] text-[#1a73e8]',
    ring: 'border-[#1a73e8] ring-[#1a73e8]/25',
  },
  purple: {
    kick: 'text-[#7c3aed]',
    ic: 'bg-[#f4eeff] text-[#7c3aed]',
    ring: 'border-[#7c3aed] ring-[#7c3aed]/25',
  },
}

function Picker({
  tone,
  icon,
  index,
  kicker,
  value,
  list,
  onPick,
  onRemove,
}: {
  tone: 'brand' | 'blue' | 'purple'
  icon?: React.ReactNode
  index?: number
  kicker: string
  value: Farmer
  list: Farmer[]
  onPick: (f: Farmer) => void
  onRemove?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const t = TONE[tone]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])

  const results = list.filter(
    (f) =>
      f.name.toLowerCase().includes(q.trim().toLowerCase()) ||
      f.city.toLowerCase().includes(q.trim().toLowerCase()),
  )

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o)
          setQ('')
        }}
        className={`group flex items-center gap-2.5 rounded-xl border bg-white px-2.5 py-1.5 text-left shadow-[0_1px_2px_rgba(15,30,61,0.04)] transition hover:shadow-[0_4px_12px_-6px_rgba(15,30,61,0.28)] ${
          open ? `${t.ring} ring-2` : 'border-line hover:border-ink/20'
        }`}
      >
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[12px] font-800 tabular-nums ${t.ic}`}>
          {index ?? icon}
        </span>
        <span className="min-w-0 pr-0.5">
          <span className={`block text-[9.5px] font-700 uppercase tracking-[0.08em] ${t.kick}`}>
            {kicker}
          </span>
          <span className="block max-w-[150px] truncate text-[13.5px] font-700 leading-tight text-ink">
            {value.name}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="animate-pop absolute left-0 top-[calc(100%+6px)] z-30 w-64 rounded-xl border border-line bg-white p-2.5 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]">
          <div className="flex items-center gap-2 rounded-lg border border-line px-2.5">
            <Search size={14} className="text-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${kicker.toLowerCase()}`}
              className="h-8 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted/70"
            />
          </div>
          <div className="mt-2 max-h-52 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12.5px] text-muted">No match.</p>
            ) : (
              results.map((f) => (
                <button
                  key={f.name}
                  onClick={() => {
                    onPick(f)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-brand-soft ${
                    f.name === value.name ? 'bg-brand-soft/60' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-600 text-ink">{f.name}</span>
                    <span className="block truncate text-[11.5px] text-muted">{f.city}</span>
                  </span>
                  {f.name === value.name && <Check size={14} className="shrink-0 text-brand" />}
                </button>
              ))
            )}
          </div>
          {onRemove && (
            <button
              onClick={() => {
                onRemove()
                setOpen(false)
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-600 text-[#c23b3b] transition hover:bg-[#fdecec]"
            >
              <X size={14} /> Remove this stop
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AddStop({
  options,
  onAdd,
}: {
  options: Farmer[]
  onAdd: (f: Farmer) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])

  const results = options.filter(
    (f) =>
      f.name.toLowerCase().includes(q.trim().toLowerCase()) ||
      f.city.toLowerCase().includes(q.trim().toLowerCase()),
  )

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o)
          setQ('')
        }}
        className={`flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-[13px] text-[12.5px] font-700 text-brand transition hover:bg-brand-soft ${
          open ? 'border-brand bg-brand-soft' : 'border-line/80 hover:border-brand'
        }`}
      >
        <Plus size={14} strokeWidth={2.6} /> Add stop
      </button>
      {open && (
        <div className="animate-pop absolute left-0 top-[calc(100%+6px)] z-30 w-64 rounded-xl border border-line bg-white p-2.5 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]">
          <div className="flex items-center gap-2 rounded-lg border border-line px-2.5">
            <Search size={14} className="text-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search farmer"
              className="h-8 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted/70"
            />
          </div>
          <div className="mt-2 max-h-52 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-2 py-3 text-center text-[12.5px] text-muted">No farmer left to add.</p>
            ) : (
              results.map((f) => (
                <button
                  key={f.name}
                  onClick={() => {
                    onAdd(f)
                    setOpen(false)
                  }}
                  className="flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition hover:bg-brand-soft"
                >
                  <span className="text-[13px] font-600 text-ink">{f.name}</span>
                  <span className="text-[11.5px] text-muted">{f.city}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  strong,
}: {
  icon: React.ReactNode
  label: string
  value: string
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
        <span className={`tabular-nums font-800 ${strong ? 'text-[17px] text-brand' : 'text-[15px] text-ink'}`}>
          {value}
        </span>
      </div>
    </div>
  )
}

export default RouteSuggestions
