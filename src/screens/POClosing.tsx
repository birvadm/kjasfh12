import { useState } from 'react'
import { FileText, Send } from '../components/icons'
import {
  Button,
  DatePicker,
  Field,
  FieldSet,
  Modal,
  Radio,
  useToast,
} from '../components/ui'

export function POClosing() {
  const toast = useToast()
  const [sort, setSort] = useState<'po' | 'emission'>('po')

  const [reportMode, setReportMode] = useState<'report' | 'summary'>('report')
  const [fileMode, setFileMode] = useState<'transmission' | 'retransmission'>(
    'transmission',
  )
  const [approval, setApproval] = useState(false)

  return (
    <div className="space-y-5">
      <FieldSet>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_auto]">
          <div className="space-y-4">
            <Field label="Payment Order Date sort by">
              <div className="flex items-center gap-6 pt-1">
                <Radio
                  checked={sort === 'emission'}
                  onChange={() => setSort('emission')}
                  label="Emission Date"
                />
                <Radio
                  checked={sort === 'po'}
                  onChange={() => setSort('po')}
                  label="PO Date"
                />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-[320px]">
            <Field label="From">
              <DatePicker defaultValue="2026-08-04" />
            </Field>
            <Field label="To">
              <DatePicker defaultValue="2026-08-04" />
            </Field>
          </div>
        </div>
      </FieldSet>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FieldSet
          title="Report options"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                toast({
                  tone: 'success',
                  title: 'Report downloaded',
                  body: `Conference Report - by ${sort === 'emission' ? 'Emission Date' : 'PO Date'}.xlsx`,
                })
              }
            >
              <FileText size={15} /> Download Report
            </Button>
          }
        >
          <div className="space-y-4">
            <Radio
              checked={reportMode === 'report'}
              onChange={() => setReportMode('report')}
              label="Detailed Report"
            />
            <Radio
              checked={reportMode === 'summary'}
              onChange={() => setReportMode('summary')}
              label="Summary Report"
            />
          </div>
        </FieldSet>

        <FieldSet
          title="File options"
          action={
            <Button size="sm" onClick={() => setApproval(true)}>
              <Send size={15} /> Generate File
            </Button>
          }
        >
          <div className="space-y-4">
            <Radio
              checked={fileMode === 'transmission'}
              onChange={() => setFileMode('transmission')}
              label="Generate file for Transmission"
            />
            <Radio
              checked={fileMode === 'retransmission'}
              onChange={() => setFileMode('retransmission')}
              label="Generate file for Retransmission"
            />
          </div>
        </FieldSet>
      </div>

      <Modal
        open={approval}
        onClose={() => setApproval(false)}
        title="Approval request — file generation"
        width="max-w-lg"
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Generating the transmission file raises a workflow approval request
          rather than sending an e-mail. The request routes to the finance
          approver for review before the file is released to the bank.
        </p>
        <div className="mt-4 rounded-xl border border-line bg-canvas p-4 text-[13.5px]">
          <Row label="Range" value="04/08/2026 → 04/08/2026" />
          <Row label="Sort" value={sort === 'po' ? 'PO Date' : 'Emission Date'} />
          <Row
            label="Outputs"
            value={`${reportMode === 'report' ? 'Detailed Report' : 'Summary Report'}, ${
              fileMode === 'transmission' ? 'Transmission' : 'Retransmission'
            }`}
          />
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#fdf3e0] px-3 py-2 text-[12.5px] font-500 text-[#9a6a12]">
            2 payment orders exceed their type limit and will be flagged for the
            analyst to confirm — never blocked.
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setApproval(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setApproval(false)
              toast({
                tone: 'success',
                title: 'Approval request raised',
                body: 'File generation is pending approval in the workflow.',
              })
            }}
          >
            Submit request
          </Button>
        </div>
      </Modal>

    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-600 text-ink">{value}</span>
    </div>
  )
}
