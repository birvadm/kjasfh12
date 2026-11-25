import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from './icons'
import { Button, Modal } from './ui'

const MONTH = 'August 2026'
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function FixedDaysModal({
  open,
  onClose,
  dates,
  subtitle,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  dates: string[]
  subtitle?: string
  onConfirm: (d: string[]) => void
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const [local, setLocal] = useState(dates)
  const [showCal, setShowCal] = useState(false)

  // Reset working copy whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setLocal(dates)
      setShowCal(false)
      setPicked(null)
    }
  }, [open])

  // August 2026 starts on Saturday; build a Sunday-start grid (shadcn default).
  const cells = buildMonth()
  const dirty = local.join('|') !== dates.join('|')

  const add = () => {
    if (picked == null) return
    const d = `${String(picked).padStart(2, '0')}/08/2026`
    if (!local.includes(d)) setLocal([...local, d])
    setPicked(null)
    setShowCal(false)
  }
  const remove = (d: string) => setLocal(local.filter((x) => x !== d))

  return (
    <Modal open={open} onClose={onClose} title="Fixed days of month" width="max-w-md">
      <div className="flex items-center justify-between">
        {subtitle ? (
          <p className="text-[13px] font-600 text-ink">{subtitle}</p>
        ) : (
          <span />
        )}
        <Button variant="outline" size="sm" onClick={() => setShowCal(true)}>
          <Plus size={15} /> Add date
        </Button>
      </div>

      {/* shadcn-style calendar — only when adding */}
      {showCal && (
        <div className="mt-3 rounded-xl border border-line bg-white p-4">
          <div className="relative mb-3 flex items-center justify-center">
            <button className="absolute left-0 grid h-7 w-7 place-items-center rounded-md border border-line text-ink-soft transition hover:bg-canvas">
              <ChevronLeft size={16} />
            </button>
            <span className="text-[14px] font-600 text-ink">{MONTH}</span>
            <button className="absolute right-0 grid h-7 w-7 place-items-center rounded-md border border-line text-ink-soft transition hover:bg-canvas">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-7">
            {DAYS.map((d, i) => (
              <div
                key={i}
                className="pb-1.5 text-center text-[12px] font-500 text-muted"
              >
                {d}
              </div>
            ))}
            {cells.map((day, i) =>
              day == null ? (
                <div key={i} className="h-9" />
              ) : (
                <div key={i} className="grid place-items-center p-0.5">
                  <button
                    onClick={() => setPicked(day)}
                    className={`grid h-9 w-9 place-items-center rounded-md text-[13.5px] font-400 transition ${
                      picked === day
                        ? 'bg-brand text-white'
                        : local.includes(`${String(day).padStart(2, '0')}/08/2026`)
                          ? 'bg-brand-soft font-600 text-brand'
                          : 'text-ink hover:bg-canvas'
                    }`}
                  >
                    {day}
                  </button>
                </div>
              ),
            )}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCal(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={picked == null} onClick={add}>
              <Plus size={15} /> Add to list
            </Button>
          </div>
        </div>
      )}

      {/* Selected list */}
      <div className="mt-3 overflow-hidden rounded-xl border border-line">
        {local.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">No dates yet</p>
        ) : (
          local.map((d) => (
            <div
              key={d}
              className="flex items-center justify-between border-b border-line px-4 py-2.5 text-[13.5px] tabular-nums last:border-0"
            >
              {d}
              <button
                onClick={() => remove(d)}
                title="Remove date"
                className="grid h-6 w-6 place-items-center rounded-md text-muted transition hover:bg-[#fdecec] hover:text-[#c23b3b]"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!dirty} onClick={() => onConfirm(local)}>
          Save
        </Button>
      </div>
    </Modal>
  )
}

function buildMonth() {
  // August 2026: 1st is a Saturday -> Sun-start offset of 6, 31 days
  const offset = 6
  const total = 31
  const cells: (number | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  return cells
}
