import { useState } from 'react'
import {
  CalendarDays,
  Check,
  Pencil,
  Plus,
  Save,
  X,
} from '../components/icons'
import { TYPE_ROWS, type TypeRow } from '../data'
import { FixedDaysModal } from '../components/FixedDaysModal'
import {
  Badge,
  Button,
  Card,
  Field,
  FieldSet,
  Input,
  Modal,
  Radio,
  Select,
  useToast,
} from '../components/ui'

type Row = Omit<TypeRow, 'closing'> & {
  id: string
  editing?: boolean
  active: boolean
}

export function PaymentOrderTypeConfig({
  onNavigate,
}: {
  onNavigate: (to: string) => void
}) {
  const toast = useToast()
  const [rows, setRows] = useState<Row[]>(
    TYPE_ROWS.map((t) => ({
      ...t,
      id: t.code || `t${Math.random()}`,
      active: t.registered,
    })),
  )
  const [ruleFor, setRuleFor] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const patch = (id: string, p: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)))

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id))

  const addNew = () =>
    setRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        code: '',
        type: '',
        english: '',
        calendar: 'Not registered',
        validTill: '-',
        limit: '-',
        active: true,
        registered: false,
        editing: true,
      },
    ])

  const saveRow = (r: Row) => {
    if (!r.code.trim() || !r.english.trim()) return
    patch(r.id, {
      code: r.code.trim(),
      english: r.english.trim(),
      registered: r.calendar !== 'Not registered' && r.limit !== '-',
      editing: false,
    })
    toast({
      tone: 'success',
      title: 'Type saved',
      body: 'Change routed to the approval workflow.',
    })
  }

  const ruleRow = rows.find((r) => r.id === ruleFor)
  const confirmRow = rows.find((r) => r.id === confirm)

  const runConfirm = () => {
    if (confirmRow) saveRow(confirmRow)
    setConfirm(null)
  }

  return (
    <div>
      <FieldSet
        title="Registered payment order types"
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('calendar')}>
              <CalendarDays size={15} /> Holiday Calendar
            </Button>
            <Button variant="outline" size="sm" onClick={addNew}>
              <Plus size={15} /> Add
            </Button>
          </div>
        }
      >
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line bg-brand-soft/50 text-left text-[12px] font-700 uppercase tracking-wide text-brand">
                  <th className="w-20 px-4 py-3">Code</th>
                  <th className="px-4 py-3">Payment order type</th>
                  <th className="px-4 py-3">Calendar</th>
                  <th className="px-4 py-3">Valid FROM</th>
                  <th className="px-4 py-3 text-right">Limit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) =>
                  t.editing ? (
                    <tr key={t.id} className="border-b border-line bg-canvas/60">
                      <td className="px-3 py-2.5">
                        <Input
                          className="h-9"
                          placeholder="Code"
                          value={t.code}
                          onChange={(e) => patch(t.id, { code: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          className="h-9"
                          placeholder="Payment order type"
                          value={t.english}
                          onChange={(e) => patch(t.id, { english: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRuleFor(t.id)}
                        >
                          <CalendarDays size={15} />
                          {t.calendar === 'Not registered' ? 'Configure' : t.calendar}
                        </Button>
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          className="h-9"
                          placeholder="Valid till"
                          value={t.validTill === '-' ? '' : t.validTill}
                          onChange={(e) =>
                            patch(t.id, { validTill: e.target.value || '-' })
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          className="h-9 text-right"
                          placeholder="Limit"
                          value={t.limit === '-' ? '' : t.limit}
                          onChange={(e) =>
                            patch(t.id, { limit: e.target.value || '-' })
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => patch(t.id, { active: !t.active })}
                          role="switch"
                          aria-checked={t.active}
                          title={t.active ? 'Active' : 'Inactive'}
                          className={`relative h-6 w-11 rounded-full transition ${t.active ? 'bg-brand' : 'bg-[#c4cfe4]'}`}
                        >
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${t.active ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setConfirm(t.id)}
                            disabled={!t.code.trim() || !t.english.trim()}
                            title="Save type"
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand disabled:opacity-40"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() =>
                              t.code
                                ? patch(t.id, { editing: false })
                                : removeRow(t.id)
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
                    <tr
                      key={t.id}
                      className="border-b border-line transition hover:bg-canvas"
                    >
                      <td className="px-4 py-3 tabular-nums text-muted">{t.code}</td>
                      <td
                        className={`px-4 py-3 font-600 ${
                          t.registered ? 'text-ink' : 'text-muted'
                        }`}
                      >
                        {t.english}
                      </td>
                      <td className="px-4 py-3">
                        <div className="group relative inline-block">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 text-left">
                            <CalendarDays size={15} className="text-muted" />
                            {t.registered ? (
                              <span className="text-ink-soft">{t.calendar}</span>
                            ) : (
                              <span className="text-muted">{t.calendar}</span>
                            )}
                          </div>
                          {t.fixedDates && t.fixedDates.length > 0 && (
                            <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden min-w-[150px] rounded-lg border border-line bg-white p-2.5 shadow-lg group-hover:block">
                              <p className="mb-1.5 text-[11px] font-700 uppercase tracking-wide text-brand">
                                Fixed days
                              </p>
                              {t.fixedDates.map((d) => (
                                <p
                                  key={d}
                                  className="py-0.5 text-[12.5px] tabular-nums text-ink-soft"
                                >
                                  {d}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {t.validTill === '-' ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className="text-ink-soft">{t.validTill}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {t.limit === '-' ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className="text-ink-soft">{t.limit}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={t.active ? 'green' : 'neutral'}>{t.active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => patch(t.id, { editing: true })}
                            title="Edit type"
                            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </FieldSet>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Save changes" width="max-w-md">
        <p className="text-[13.5px] leading-relaxed text-ink-soft">Save changes to <span className="font-700 text-ink">{confirmRow ? `${confirmRow.code} — ${confirmRow.english}` : 'this payment order type'}</span>? This change is routed to the approval workflow.</p>
        <div className="mt-5 flex justify-end gap-3"><Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button><Button onClick={runConfirm}><Save size={15} /> Save</Button></div>
      </Modal>

      <CalendarRuleModal
        row={ruleRow}
        onClose={() => setRuleFor(null)}
        onSave={(label) => {
          if (ruleRow) {
            patch(ruleRow.id, {
              calendar: label,
              registered: ruleRow.limit !== '-',
            })
          }
          setRuleFor(null)
          toast({
            tone: 'success',
            title: 'Calendar saved',
            body: 'Change sent to the approval workflow and logged.',
          })
        }}
      />
    </div>
  )
}

type RuleKind = 'working' | 'weekly' | 'fixed'

const WEEKDAYS = [
  { value: 'sun', label: 'Sunday' },
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
]

function CalendarRuleModal({
  row,
  onClose,
  onSave,
}: {
  row: Row | undefined
  onClose: () => void
  onSave: (label: string) => void
}) {
  const [rule, setRule] = useState<RuleKind>('working')
  const [days, setDays] = useState('3')
  const [weekStart, setWeekStart] = useState('sun')
  const [weekEnd, setWeekEnd] = useState('sat')
  const [payOn, setPayOn] = useState('tue')
  const [fixedDates, setFixedDates] = useState<string[]>([])
  const [showFixed, setShowFixed] = useState(false)

  const label =
    rule === 'working'
      ? `${1 + Number(days || 0)} days`
      : rule === 'weekly'
        ? `Weekly, pay ${WEEKDAYS.find((w) => w.value === payOn)?.label ?? ''}`
        : 'Fixed days'

  return (
    <Modal open={!!row} onClose={onClose} title="Calendar rule" width="max-w-3xl">
      <h4 className="mb-3 text-[12.5px] font-700 uppercase tracking-[0.08em] text-brand">
        Rule
      </h4>
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
          <Radio
            checked={rule === 'working'}
            onChange={() => setRule('working')}
            label="Working days after emission"
          />
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] text-muted">Days</span>
            <Input
              className="h-9 w-20 text-center"
              value={days}
              disabled={rule !== 'working'}
              onChange={(e) => setDays(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-line px-4 py-3">
          <Radio
            checked={rule === 'weekly'}
            onChange={() => setRule('weekly')}
            label="Weekly period"
          />
          <div
            className={`mt-3 grid grid-cols-3 gap-3 transition ${
              rule === 'weekly' ? '' : 'pointer-events-none opacity-40'
            }`}
          >
            <Field label="Week starts">
              <Select value={weekStart} onChange={setWeekStart} options={WEEKDAYS} />
            </Field>
            <Field label="Week ends">
              <Select value={weekEnd} onChange={setWeekEnd} options={WEEKDAYS} />
            </Field>
            <Field label="Pay on">
              <Select value={payOn} onChange={setPayOn} options={WEEKDAYS} />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
          <Radio
            checked={rule === 'fixed'}
            onChange={() => {
              setRule('fixed')
              setShowFixed(true)
            }}
            label="Fixed days of month"
          />
          <div className="flex items-center gap-3">
            {rule === 'fixed' && fixedDates.length > 0 && (
              <span className="text-[12px] text-muted">
                {fixedDates.length} date{fixedDates.length === 1 ? '' : 's'}
              </span>
            )}
            <Button
              variant="outline"
              className="h-9"
              disabled={rule !== 'fixed'}
              onClick={() => setShowFixed(true)}
            >
              <CalendarDays size={15} /> Register dates
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave(label)}>
          <Save size={15} /> Save
        </Button>
      </div>

      <FixedDaysModal
        open={showFixed}
        onClose={() => setShowFixed(false)}
        dates={fixedDates}
        subtitle={row ? `${row.code} — ${row.english}` : undefined}
        onConfirm={(d) => {
          setFixedDates(d)
          setRule('fixed')
          setShowFixed(false)
        }}
      />
    </Modal>
  )
}
