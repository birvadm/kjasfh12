import { useState } from 'react'
import { POClosing } from './POClosing'
import { PODateAdjustment } from './PODateAdjustment'
import { POReversal } from './POReversal'

const TABS = [
  { key: 'closing', label: 'PO Closing', sub: 'Generate & transmit payment files' },
  { key: 'adjust', label: 'PO Date Adjustment', sub: 'Alter payment order dates' },
  { key: 'reversal', label: 'PO Reversal', sub: 'Reverse returned payments' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function PaymentOrders() {
  const [tab, setTab] = useState<TabKey>('closing')

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-8 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 pb-3 text-[14px] transition ${
              tab === t.key
                ? 'border-brand font-700 text-brand'
                : 'border-transparent font-600 text-ink-soft hover:text-brand'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'closing' && (
        <POClosing />
      )}
      {tab === 'adjust' && <PODateAdjustment />}
      {tab === 'reversal' && <POReversal />}
    </div>
  )
}
