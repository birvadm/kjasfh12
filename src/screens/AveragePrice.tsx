import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Plus, X } from '../components/icons'
import { Button, Field, Input, Select, useToast } from '../components/ui'

type PriceRow = { id: string; node: string; tobacco: string; segment: string; base: string; adjusted: string; applied: string; validFrom: string; validTill: string; source: string; editing?: boolean }

const calculatedPrice = (base: string, applied: string) => ((Number(base) * Number(applied)) / 100).toFixed(2)

const INITIAL_ROWS: PriceRow[] = [
  { id: 'a1', node: 'GT 409', tobacco: 'Virginia', segment: 'Gold', base: '23.40', adjusted: '23.40', applied: '100', validFrom: '2026-09-01', validTill: '2027-09-01', source: 'Import 12/08' },
  { id: 'a2', node: 'GT 409', tobacco: 'Virginia', segment: 'Silver', base: '23.40', adjusted: '22.23', applied: '95', validFrom: '2026-09-01', validTill: '2027-09-01', source: 'Import 12/08' },
  { id: 'a3', node: 'GT 409', tobacco: 'Virginia', segment: 'Bronze', base: '23.40', adjusted: '21.06', applied: '90', validFrom: '2026-09-01', validTill: '2027-09-01', source: 'Import 12/08' },
  { id: 'a4', node: 'GT 102', tobacco: 'Virginia', segment: 'Gold', base: '23.40', adjusted: '23.40', applied: '100', validFrom: '2026-09-01', validTill: '2027-09-01', source: 'Import 12/08' },
  { id: 'a5', node: 'GT 102', tobacco: 'Virginia', segment: 'Silver', base: '23.40', adjusted: '22.23', applied: '95', validFrom: '2026-09-01', validTill: '2027-09-01', source: 'Import 12/08' },
  { id: 'a6', node: 'GT 102', tobacco: 'Virginia', segment: 'Bronze', base: '23.40', adjusted: '22.23', applied: '95', validFrom: '2026-11-21', validTill: '2027-11-21', source: 'Manual 20/11' },
]

export function AveragePrice() {
  const toast = useToast()
  const [cropYear, setCropYear] = useState('2026/27')
  const [tobacco, setTobacco] = useState('Virginia')
  const [segment, setSegment] = useState('All')
  const [node, setNode] = useState('All')
  const [rows, setRows] = useState(INITIAL_ROWS)
  const visible = useMemo(() => rows.filter((row) => (node === 'All' || row.node === node) && (tobacco === 'All' || row.tobacco === tobacco) && (segment === 'All' || row.segment === segment)), [rows, node, tobacco, segment])
  const patch = (id: string, update: Partial<PriceRow>) => setRows((all) => all.map((row) => row.id === id ? { ...row, ...update } : row))
  const addRow = () => setRows((all) => [...all, { id: `a${Date.now()}`, node: node === 'All' ? 'GT 409' : node, tobacco: tobacco === 'All' ? 'Virginia' : tobacco, segment: segment === 'All' ? 'Gold' : segment, base: '23.40', adjusted: '23.40', applied: '100', validFrom: '2026-09-01', validTill: '2027-09-01', source: 'Manual today', editing: true }])
  const save = (row: PriceRow) => { patch(row.id, { adjusted: calculatedPrice(row.base, row.applied), source: row.source.startsWith('Import') ? row.source : 'Manual today', editing: false }); toast({ title: 'Average price saved', body: `${row.node} · ${row.segment}`, tone: 'success' }) }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]"><div className="flex flex-wrap items-end gap-3"><Field label="Crop season" className="w-[150px]"><Select value={cropYear} onChange={setCropYear} options={[{ value: '2025/26', label: '2025/26' }, { value: '2026/27', label: '2026/27' }]} /></Field><Field label="Node" className="w-[180px]"><NodeSearchSelect value={node} onChange={setNode} /></Field><Field label="Genetic Type" className="w-[180px]"><Select value={tobacco} onChange={setTobacco} options={[{ value: 'All', label: 'All' }, { value: 'Virginia', label: 'Virginia' }, { value: 'Burley', label: 'Burley' }]} /></Field><Field label="Segment" className="w-[165px]"><Select value={segment} onChange={setSegment} options={[{ value: 'All', label: 'All' }, { value: 'Gold', label: 'Gold' }, { value: 'Silver', label: 'Silver' }, { value: 'Bronze', label: 'Bronze' }]} /></Field></div><div className="ml-auto flex items-center gap-2.5"><Button variant="outline" onClick={() => toast({ title: 'Average price exported', tone: 'info' })}>Export</Button><Button variant="outline" onClick={() => toast({ title: 'Import template downloaded', tone: 'info' })}>Import</Button><Button onClick={addRow}><Plus size={16} /> Add New</Button></div></div>
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)]"><div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-[13px]"><thead className="bg-brand-soft text-[11.5px] font-700 uppercase tracking-wide text-brand"><tr><th className="px-4 py-3">Node</th><th className="px-4 py-3">GENETIC TYPE</th><th className="px-4 py-3">Segment</th><th className="px-4 py-3">Base price</th><th className="px-4 py-3">Adjusted price / kg</th><th className="px-4 py-3">CORRECTION %</th><th className="px-4 py-3">Valid from</th><th className="px-4 py-3">Valid till</th><th className="px-4 py-3">Source</th><th className="w-20 px-4 py-3"></th></tr></thead><tbody>{visible.map((row) => <tr key={row.id} className="border-t border-line transition hover:bg-canvas/60">{row.editing ? <><td className="px-3 py-2"><NodeSearchSelect compact value={row.node} onChange={(node) => patch(row.id, { node })} /></td><td className="px-3 py-2"><Select className="h-9" value={row.tobacco} onChange={(tobacco) => patch(row.id, { tobacco })} options={[{ value: 'Virginia', label: 'Virginia' }, { value: 'Burley', label: 'Burley' }]} /></td><td className="px-3 py-2"><Select className="h-9" value={row.segment} onChange={(segment) => patch(row.id, { segment })} options={[{ value: 'Gold', label: 'Gold' }, { value: 'Silver', label: 'Silver' }, { value: 'Bronze', label: 'Bronze' }]} /></td><td className="px-3 py-2"><Input className="h-9" value={row.base} onChange={(e) => patch(row.id, { base: e.target.value })} /></td><td className="px-4 py-2 font-600 tabular-nums text-brand">{calculatedPrice(row.base, row.applied)}</td><td className="px-3 py-2"><Input className="h-9" value={row.applied} onChange={(e) => patch(row.id, { applied: e.target.value })} /></td><td className="px-3 py-2"><Input className="h-9" type="date" value={row.validFrom} onChange={(e) => patch(row.id, { validFrom: e.target.value })} /></td><td className="px-3 py-2"><Input className="h-9" type="date" value={row.validTill} onChange={(e) => patch(row.id, { validTill: e.target.value })} /></td><td className="px-4 py-2 text-muted">Manual today</td><td className="px-3 py-2"><div className="flex gap-1"><button onClick={() => save(row)} className="grid h-8 w-8 place-items-center rounded-lg text-brand hover:bg-brand-soft"><Check size={16} /></button><button onClick={() => setRows((all) => all.filter((item) => item.id !== row.id))} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-canvas"><X size={16} /></button></div></td></> : <><td className="px-4 py-3 font-600 text-ink">{row.node}</td><td className="px-4 py-3 text-ink-soft">{row.tobacco}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[12px] font-600 ${row.segment === 'Gold' ? 'border-[#f1dc92] bg-[#fff8db] text-[#8a6410]' : row.segment === 'Silver' ? 'border-[#d7ddea] bg-[#f3f5f9] text-[#58657a]' : 'border-[#e9c3a9] bg-[#fff1e8] text-[#9a4f28]'}`}>{row.segment}</span></td><td className="px-4 py-3 tabular-nums">{row.base}</td><td className="px-4 py-3 tabular-nums">{row.adjusted}</td><td className="px-4 py-3 tabular-nums">{row.applied}</td><td className="px-4 py-3 tabular-nums">{row.validFrom}</td><td className="px-4 py-3 tabular-nums">{row.validTill}</td><td className="px-4 py-3 text-ink-soft">{row.source}</td><td className="px-4 py-3"></td></>}</tr>)}</tbody></table></div></div>
  </div>
}


const NODE_OPTIONS = ['All', 'GT 102', 'GT 105', 'GT 204', 'GT 305', 'GT 409', 'GT 502']

function NodeSearchSelect({ value, onChange, compact = false }: { value: string; onChange: (value: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [])
  const options = NODE_OPTIONS.filter((item) => item.toLowerCase().includes(query.toLowerCase()))
  return <div ref={root} className="relative"><button type="button" onClick={() => { setOpen((current) => !current); setQuery('') }} className={`flex ${compact ? 'h-9 text-[13px]' : 'h-10 text-[14px]'} w-full items-center justify-between rounded-lg border border-line bg-white px-3 text-left text-ink outline-none transition hover:border-brand focus:border-brand focus:ring-4 focus:ring-brand-soft`}><span>{value}</span><span className="text-muted">⌄</span></button>{open ? <div className="animate-pop absolute z-40 mt-1.5 w-full rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]"><Input autoFocus className="h-9" placeholder="Search node..." value={query} onChange={(event) => setQuery(event.target.value)} /> <div className="mt-1 max-h-44 overflow-y-auto">{options.map((item) => <button key={item} type="button" onClick={() => { onChange(item); setOpen(false) }} className={`block w-full rounded-lg px-2.5 py-2 text-left text-[13px] ${item === value ? 'bg-brand-soft text-brand font-600' : 'text-ink hover:bg-canvas'}`}>{item}</button>)}</div></div> : null}</div>
}
