import { useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from '../components/icons'
import { HOLIDAYS, PO_TYPES } from '../data'
import type { Holiday } from '../data'
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Field,
  FieldSet,
  Input,
  Select,
  useToast,
} from '../components/ui'

export function PaymentCalendar() {
  return <HolidaysSection />
}

const SCOPES = [
  { value: 'National', label: 'National' },
  { value: 'State', label: 'State' },
  { value: 'Municipal', label: 'Municipal' },
]

const APPLIES = [
  { value: 'All types', label: 'All types' },
  ...PO_TYPES.map((t) => ({ value: t.label, label: t.label })),
]

const isoToBr = (v: string) => {
  if (!v) return ''
  const [y, m, d] = v.split('-')
  return `${d}/${m}/${y}`
}

const brToIso = (v: string) => {
  if (!v) return ''
  const [d, m, y] = v.split('/')
  return `${y}-${m}-${d}`
}

type HolidayRow = Holiday & { editing?: boolean }

function HolidaysSection() {
  const toast = useToast()
  const [rows, setRows] = useState<HolidayRow[]>(HOLIDAYS)

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: `h${Date.now()}`,
        date: '',
        description: '',
        scope: 'National',
        state: '-',
        municipality: '-',
        appliesTo: 'All types',
        editing: true,
      },
    ])

  const patch = (id: string, p: Partial<HolidayRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)))

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id))

  const saveRow = (r: HolidayRow) => {
    if (!r.date || !r.description.trim()) return
    const isNat = r.scope === 'National'
    patch(r.id, {
      description: r.description.trim(),
      state: isNat ? '-' : r.state.trim() || '-',
      municipality: r.scope === 'Municipal' ? r.municipality.trim() || '-' : '-',
      editing: false,
    })
    toast({
      tone: 'success',
      title: 'Holiday saved',
      body: 'The holiday now applies to the closing calendar.',
    })
  }

  return (
    <FieldSet
      title="Holidays"
      action={
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus size={15} /> Add
        </Button>
      }
    >
      <Card className="overflow-hidden">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="bg-brand-soft/60 text-left text-[12px] font-700 uppercase tracking-wide text-brand">
              {['Date', 'Description', 'Scope', 'State', 'Municipality', 'Applies to'].map((h) => (
                <th key={h} className="px-4 py-3">
                  {h}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) =>
              h.editing ? (
                <tr key={h.id} className="border-t border-line bg-canvas/60">
                  <td className="px-3 py-2.5">
                    <DatePicker
                      value={h.date && h.date.includes('/') ? brToIso(h.date) : h.date}
                      onChange={(v) => patch(h.id, { date: isoToBr(v) })}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      className="h-9"
                      placeholder="Description"
                      value={h.description}
                      onChange={(e) => patch(h.id, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={h.scope}
                      onChange={(v) => patch(h.id, { scope: v })}
                      options={SCOPES}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      className="h-9"
                      placeholder={h.scope === 'National' ? '-' : 'State'}
                      disabled={h.scope === 'National'}
                      value={h.state === '-' ? '' : h.state}
                      onChange={(e) => patch(h.id, { state: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Input
                      className="h-9"
                      placeholder={h.scope === 'Municipal' ? 'Municipality' : '-'}
                      disabled={h.scope !== 'Municipal'}
                      value={h.municipality === '-' ? '' : h.municipality}
                      onChange={(e) => patch(h.id, { municipality: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={h.appliesTo}
                      onChange={(v) => patch(h.id, { appliesTo: v })}
                      options={APPLIES}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => saveRow(h)}
                        disabled={!h.date || !h.description.trim()}
                        title="Save holiday"
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand disabled:opacity-40"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => removeRow(h.id)}
                        title="Discard"
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[#fdecec] hover:text-[#c23b3b]"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={h.id} className="border-t border-line hover:bg-canvas">
                  <td className="px-4 py-3 tabular-nums">{h.date}</td>
                  <td className="px-4 py-3 font-600 text-ink">{h.description}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        h.scope === 'National'
                          ? 'blue'
                          : h.scope === 'State'
                            ? 'amber'
                            : 'neutral'
                      }
                    >
                      {h.scope}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{h.state}</td>
                  <td className="px-4 py-3">{h.municipality}</td>
                  <td className="px-4 py-3">{h.appliesTo}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => patch(h.id, { editing: true })}
                        title="Edit holiday"
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => removeRow(h.id)}
                        title="Remove holiday"
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[#fdecec] hover:text-[#c23b3b]"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </Card>
    </FieldSet>
  )
}

