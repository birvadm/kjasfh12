import { useMemo, useState } from 'react'
import { ChevronLeft, Undo2, Info } from '../components/icons'
import { PO_TYPES, REV_ROWS, money, type RevRow } from '../data'
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

const BANK_NAMES: Record<string, string> = {
  '748': 'Sicredi',
  '001': 'Banco do Brasil',
  '041': 'Banrisul',
}

// Map a "code / agency" value to the bank name shown in the filter, e.g.
// "748 / 0403-G" → "748 Sicredi".
const bankName = (bank: string) => {
  const code = bank.split('/')[0].trim()
  return BANK_NAMES[code] ? `${code} ${BANK_NAMES[code]}` : bank
}

export function POReversal({ onBack }: { onBack?: () => void }) {
  const toast = useToast()
  const [selected, setSelected] = useState<string[]>(['r1', 'r2'])
  const [reason, setReason] = useState('invalid')
  const [returnDate, setReturnDate] = useState('2026-08-06')
  const [bankRef, setBankRef] = useState('DEV-748-00931')
  const [comment, setComment] = useState('Account closed, notified by the bank on 06/08')
  const [reverseOpen, setReverseOpen] = useState(false)

  const submit = () => {
    toast({
      tone: 'success',
      title: 'Reversal submitted',
      body: `${selected.length} payment orders (${money(sum)}) sent to approval.`,
    })
    setReverseOpen(false)
  }

  const toggle = (r: RevRow) =>
    setSelected((s) =>
      s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id],
    )

  const sum = useMemo(
    () =>
      REV_ROWS.filter((r) => selected.includes(r.id)).reduce(
        (a, r) => a + r.amount,
        0,
      ),
    [selected],
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,30,61,0.05)]">
        <div>
          <p className="text-[15px] font-700 text-ink">Payment order reversal</p>
          <p className="mt-1 text-[13px] text-muted">Review and submit payment order reversals.</p>
        </div>
        {onBack ? <Button variant="outline" onClick={onBack}><ChevronLeft size={16} /> Back to Debt Reversal</Button> : null}
      </div>
      <FieldSet>
        <div className="grid grid-cols-2 items-end gap-4 md:grid-cols-4 xl:grid-cols-8">
          <Field label="PO number">
            <Input placeholder="7801644" />
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
                { value: 'all', label: 'All' },
                { value: 'producer', label: 'Producer' },
                { value: 'supplier', label: 'Supplier' },
                { value: 'transporter', label: 'Transporter' },
              ]}
            />
          </Field>
          <Field label="Transmitted">
            <Select
              value="yes"
              onChange={() => {}}
              options={[
                { value: 'all', label: 'All' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
          </Field>
          <Field label="PO date from">
            <DatePicker defaultValue="2026-08-03" />
          </Field>
          <Field label="PO date to">
            <DatePicker defaultValue="2026-08-05" />
          </Field>
          <Field label="Bank">
            <Select
              value="all"
              onChange={() => {}}
              options={[
                { value: 'all', label: 'All' },
                { value: '748', label: '748 Sicredi' },
                { value: '001', label: '001 Banco do Brasil' },
                { value: '041', label: '041 Banrisul' },
              ]}
            />
          </Field>
          <Field label="Transmission file">
            <Select
              value="fo090"
              onChange={() => {}}
              options={[
                { value: 'fo090', label: 'FO090858.748' },
                { value: 'fo091', label: 'FO091002.001' },
              ]}
            />
          </Field>
        </div>
      </FieldSet>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {selected.length} payment order{selected.length === 1 ? '' : 's'} selected
        </p>
        <Button
          variant="primary"
          disabled={selected.length === 0}
          onClick={() => setReverseOpen(true)}
        >
          <Undo2 size={16} /> Reverse
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-brand-soft/50 text-left text-[12px] font-700 uppercase tracking-wide text-brand">
                <th className="w-12 px-4 py-3"></th>
                {['PO number', 'PO Type', 'Recipient', 'Transmitted', 'PO date', 'Bank', 'Account', 'Amount'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 font-700 ${h === 'Amount' ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REV_ROWS.map((r) => {
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
                      {r.status === 'Transmitted' ? (
                        <Badge tone="green">Yes</Badge>
                      ) : (
                        <Badge tone="neutral">No</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.poDate}</td>
                    <td className="px-4 py-3">{bankName(r.bank)}</td>
                    <td className="px-4 py-3 tabular-nums">{r.account}</td>
                    <td className="px-4 py-3 text-right font-600 tabular-nums">
                      {money(r.amount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={reverseOpen}
        onClose={() => setReverseOpen(false)}
        title="Reversal — applies to selected rows"
        width="max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Return reason">
            <Select
              value={reason}
              onChange={setReason}
              options={[
                { value: 'invalid', label: 'Invalid account' },
                { value: 'closed', label: 'Account closed' },
                { value: 'mismatch', label: 'Recipient data mismatch' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </Field>
          <Field label="Return date">
            <DatePicker value={returnDate} onChange={setReturnDate} />
          </Field>
          <Field label="Bank reference">
            <Input value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
          </Field>
          <Field label="Comment">
            <Input value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-brand-ring bg-brand-soft/60 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
          <Info size={16} className="mt-0.5 shrink-0 text-brand" />
          <span>
            <span className="font-700 text-ink">Once approved,</span> the
            reversal posts a debit against the payment made, returns the amount
            as a credit to the source account, frees that credit for payment
            analysis, and issues a new payment order. The original is never
            reopened or resent.
          </span>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setReverseOpen(false)}>
            Cancel
          </Button>
          <Button disabled={selected.length === 0} onClick={submit}>
            <Undo2 size={15} /> Submit for approval
          </Button>
        </div>
      </Modal>
    </div>
  )
}
