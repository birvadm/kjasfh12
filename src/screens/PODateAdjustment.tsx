import { useMemo, useState } from 'react'
import { History, Send } from '../components/icons'
import {
  ADJ_ROWS,
  CHANGE_LOG,
  PO_TYPES,
  money,
  type AdjRow,
} from '../data'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Field,
  FieldSet,
  Input,
  Modal,
  Select,
  useToast,
} from '../components/ui'

export function PODateAdjustment() {
  const toast = useToast()
  const [selected, setSelected] = useState<string[]>(['a1', 'a2'])
  const [newDate, setNewDate] = useState('2026-08-11')
  const [comment, setComment] = useState('Field technician request, payment brought forward')
  const [logFor, setLogFor] = useState<string | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)

  const selectable = ADJ_ROWS.filter((r) => !r.transmitted)

  const toggle = (r: AdjRow) => {
    setSelected((s) =>
      s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id],
    )
  }

  const sum = useMemo(
    () =>
      ADJ_ROWS.filter((r) => selected.includes(r.id)).reduce(
        (a, r) => a + r.amount,
        0,
      ),
    [selected],
  )

  const submit = () => {
    if (!comment.trim()) {
      toast({ tone: 'info', title: 'Comment required', body: 'A comment is mandatory when a date is changed.' })
      return
    }
    toast({
      tone: 'success',
      title: 'Submitted for approval',
      body: `${selected.length} payment orders routed to the approval workflow.`,
    })
    setAdjustOpen(false)
  }

  return (
    <div className="space-y-5">
      <FieldSet>
        <div className="grid grid-cols-2 items-end gap-4 md:grid-cols-4 xl:grid-cols-8">
          <Field label="PO number">
            <Input placeholder="7801642" />
          </Field>
          <Field label="PO type">
            <Select
              value="1"
              onChange={() => {}}
              options={PO_TYPES.map((t) => ({ value: t.code, label: t.label }))}
            />
          </Field>
          <Field label="Recipient">
            <Select
              value="all"
              onChange={() => {}}
              options={[
                { value: 'all', label: 'All producers' },
                { value: 'a', label: 'Producer A' },
                { value: 'b', label: 'Producer B' },
              ]}
            />
          </Field>
          <Field label="Transmitted">
            <Select
              value="all"
              onChange={() => {}}
              options={[
                { value: 'all', label: 'All' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
          </Field>
          <Field label="Emission from">
            <DatePicker defaultValue="2026-08-03" />
          </Field>
          <Field label="Emission to">
            <DatePicker defaultValue="2026-08-04" />
          </Field>
          <Field label="PO date from">
            <DatePicker />
          </Field>
          <Field label="PO date to">
            <DatePicker />
          </Field>
        </div>
      </FieldSet>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {selected.length} payment order{selected.length === 1 ? '' : 's'} selected
        </p>
        <Button
          disabled={selected.length === 0}
          onClick={() => setAdjustOpen(true)}
        >
          <Send size={16} /> Adjust
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-brand-soft/50 text-left text-[12px] font-700 uppercase tracking-wide text-brand">
                <th className="w-12 px-4 py-3"></th>
                <Th>PO number</Th>
                <Th>PO Type</Th>
                <Th>Recipient</Th>
                <Th>Transmitted</Th>
                <Th>Emission Date</Th>
                <Th>PO date</Th>
                <Th>Expected Date</Th>
                <Th>On policy</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-center">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {ADJ_ROWS.map((r) => {
                const isSel = selected.includes(r.id)
                return (
                  <tr
                    key={r.id}
                    onClick={() => toggle(r)}
                    className={`cursor-pointer border-b border-line transition ${
                      isSel ? 'bg-brand-soft/60' : 'hover:bg-canvas'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox checked={isSel} onChange={() => toggle(r)} />
                    </td>
                    <td className="px-4 py-3 font-600 text-ink">{r.po}</td>
                    <td className="px-4 py-3">{r.type}</td>
                    <td className="px-4 py-3">{r.recipient}</td>
                    <td className="px-4 py-3">
                      {r.transmitted ? (
                        <Badge tone="green">Yes</Badge>
                      ) : (
                        <Badge tone="neutral">No</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.emission}</td>
                    <td className="px-4 py-3 tabular-nums">{r.poDate}</td>
                    <td className="px-4 py-3 tabular-nums">{r.expected}</td>
                    <td className="px-4 py-3">
                      {r.onPolicy === 'Yes' ? (
                        <Badge tone="green">Yes</Badge>
                      ) : (
                        <Badge tone="amber">No</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-600 tabular-nums">
                      {money(r.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setLogFor(r.po)
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
                        title="Open change log"
                      >
                        <History size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Adjustment — applies to selected rows"
        width="max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
          <Field label="New PO date">
            <DatePicker value={newDate} onChange={setNewDate} />
          </Field>
          <Field label="Comment (mandatory when a date is changed)">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What the auditor reads…"
            />
          </Field>
        </div>
        <p className="mt-4 text-[13px] text-muted">
          {selected.length} payment order{selected.length === 1 ? '' : 's'}{' '}
          selected. Sum{' '}
          <span className="font-600 text-ink">{money(sum)}</span>. Expected date
          from the calendar is{' '}
          <span className="font-600 text-ink">10-08-2026</span>.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setAdjustOpen(false)}>
            Cancel
          </Button>
          <Button disabled={selected.length === 0} onClick={submit}>
            <Send size={15} /> Submit for approval
          </Button>
        </div>
      </Modal>

      <ChangeLogModal po={logFor} onClose={() => setLogFor(null)} />
    </div>
  )
}

function Th({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <th className={`px-4 py-3 font-700 ${className}`}>{children}</th>
}

function ChangeLogModal({
  po,
  onClose,
}: {
  po: string | null
  onClose: () => void
}) {
  const rows = po ? (CHANGE_LOG[po] ?? CHANGE_LOG['7801644']) : undefined
  return (
    <Modal
      open={!!po}
      onClose={onClose}
      title={`Change log — payment order ${po ?? ''}`}
      width="max-w-3xl"
    >
      <Card className="overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-brand-soft/60 text-left text-[11.5px] font-700 uppercase tracking-wide text-brand">
              {['When', 'User', 'Field', 'From', 'To', 'Approved by', 'Approved'].map((h) => (
                <th key={h} className="px-3.5 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((l, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-3.5 py-2.5 tabular-nums">{l.when}</td>
                <td className="px-3.5 py-2.5">{l.user}</td>
                <td className="px-3.5 py-2.5">{l.field}</td>
                <td className="px-3.5 py-2.5 text-muted">{l.from}</td>
                <td className="px-3.5 py-2.5 font-600 text-ink">{l.to}</td>
                <td className="px-3.5 py-2.5">{l.approvedBy}</td>
                <td className="px-3.5 py-2.5 tabular-nums">{l.approved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
