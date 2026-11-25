import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from './icons'

/* ------------------------------------------------------------------ */
/* Card + section                                                      */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,30,61,0.05)] ${className}`}
    >
      {children}
    </div>
  )
}

export function FieldSet({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={`p-5 ${className}`}>
      {title || action ? (
        <div className="mb-4 flex min-h-[38px] items-center justify-between gap-4">
          <h3 className="text-[13px] font-700 uppercase tracking-[0.08em] text-brand">
            {title}
          </h3>
          {action ? <div className="flex items-center gap-2.5">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Labels + inputs                                                     */
/* ------------------------------------------------------------------ */

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[12.5px] font-500 text-muted">
      {children}
    </label>
  )
}

export function Field({
  label,
  children,
  className = '',
}: {
  label?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {label ? <Label>{label}</Label> : null}
      {children}
    </div>
  )
}

const controlBase =
  'h-10 w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted placeholder:text-muted/70'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return <input {...rest} className={`${controlBase} ${className}`} />
}

export function Select({
  value,
  onChange,
  options,
  disabled,
  placeholder = 'Select…',
  searchable = false,
  clearable = false,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; disabled?: boolean; hint?: string }[]
  disabled?: boolean
  placeholder?: string
  searchable?: boolean
  // Shows a clear (×) button so a chosen value can be reset to empty.
  clearable?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (open) {
      const i = options.findIndex((o) => o.value === value)
      setActive(i < 0 ? 0 : i)
    }
  }, [open])

  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  )

  useEffect(() => {
    if (!open) return
    const el = listRef.current?.children[active + (searchable ? 1 : 0)] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const commit = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (disabled) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      else if (visibleOptions.length) setActive((a) => Math.min(a + 1, visibleOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (open) setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open && visibleOptions[active] && !visibleOptions[active].disabled) commit(visibleOptions[active].value)
      else setOpen(true)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => { if (!o) setQuery(''); return !o })}
        onKeyDown={onKeyDown}
        className={`${controlBase} flex items-center justify-between gap-2 text-left ${
          open ? 'border-brand ring-4 ring-brand-soft' : ''
        } ${selected ? '' : 'text-muted/70'} ${clearable && selected ? 'pr-16' : ''}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {clearable && selected && !disabled ? (
        <button
          type="button"
          aria-label="Clear selection"
          onClick={() => { onChange(''); setOpen(false) }}
          className="absolute right-9 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-canvas hover:text-ink"
        >
          <X size={14} />
        </button>
      ) : null}

      {open && (
        <div
          className="animate-pop absolute z-40 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]"
          ref={listRef}
          role="listbox"
        >
          {searchable ? (
            <div className="mb-1.5">
              <Input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActive(0)
                }}
                placeholder="Search…"
                className="h-9"
              />
            </div>
          ) : null}
          {visibleOptions.length === 0 ? (
            <div className="px-2.5 py-2 text-[14px] text-muted">No matches found.</div>
          ) : null}
          {visibleOptions.map((o, i) => {
            const isSel = o.value === value
            return (
              <div
                key={o.value}
                role="option"
                aria-selected={isSel}
                aria-disabled={o.disabled || undefined}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onClick={() => !o.disabled && commit(o.value)}
                className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[14px] transition ${
                  o.disabled
                    ? 'cursor-not-allowed text-muted/60'
                    : i === active
                      ? 'cursor-pointer bg-brand-soft text-brand'
                      : 'cursor-pointer text-ink'
                }`}
              >
                <span className="truncate">{o.label}</span>
                {o.hint ? (
                  <span className="shrink-0 text-[11.5px] font-600 text-muted">{o.hint}</span>
                ) : isSel ? (
                  <Check size={15} strokeWidth={3} className="shrink-0 text-brand" />
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function MultiSelect({
  values,
  onChange,
  options,
  disabled,
  placeholder = 'Select…',
  allLabel,
  searchable = false,
  className = '',
}: {
  values: string[]
  onChange: (v: string[]) => void
  options: { value: string; label: string; disabled?: boolean; hint?: string }[]
  disabled?: boolean
  placeholder?: string
  allLabel?: string
  searchable?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])

  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])

  const allValues = options.filter((o) => !o.disabled).map((o) => o.value)
  const visibleOptions = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
  const allSelected = values.length === allValues.length && allValues.length > 0

  const label =
    values.length === 0
      ? placeholder
      : allSelected && allLabel
        ? allLabel
        : values.length === 1
          ? (options.find((o) => o.value === values[0])?.label ?? '1 selected')
          : `${values.length} selected`

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => { if (!o) setQuery(''); return !o })}
        className={`${controlBase} flex items-center justify-between gap-2 text-left ${
          open ? 'border-brand ring-4 ring-brand-soft' : ''
        } ${values.length ? '' : 'text-muted/70'}`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="animate-pop absolute z-40 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]">
          {searchable ? <div className="mb-1 flex items-center gap-2 rounded-lg border border-line px-2.5"><Search size={14} className="text-muted" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search…" className="h-8 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted/70" /></div> : null}
          {allLabel ? (
            <div
              onClick={() => onChange(allSelected ? [] : allValues)}
              className="mb-1 flex cursor-pointer items-center justify-between gap-2 rounded-lg border-b border-line px-2.5 py-2 text-[14px] font-600 text-ink transition hover:bg-brand-soft"
            >
              <span>{allLabel}</span>
              <span
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border transition ${
                  allSelected ? 'border-brand bg-brand text-white' : 'border-[#c4cfe4] bg-white'
                }`}
              >
                {allSelected ? <Check size={13} strokeWidth={3} /> : null}
              </span>
            </div>
          ) : null}
          {visibleOptions.map((o) => {
            const on = values.includes(o.value)
            return (
              <div
                key={o.value}
                role="option"
                aria-selected={on}
                aria-disabled={o.disabled}
                onClick={() => !o.disabled && toggle(o.value)}
                className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[14px] transition ${
                  o.disabled ? 'cursor-not-allowed opacity-50' : on ? 'cursor-pointer bg-brand-soft/60 text-ink' : 'cursor-pointer text-ink hover:bg-brand-soft'
                }`}
              >
                <span className="min-w-0 truncate">{o.label}{o.hint ? <span className="ml-1.5 text-[12px] text-[#c23b3b]">· {o.hint}</span> : null}</span>
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border transition ${
                    on ? 'border-brand bg-brand text-white' : 'border-[#c4cfe4] bg-white'
                  }`}
                >
                  {on ? <Check size={13} strokeWidth={3} /> : null}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Date picker                                                         */
/* ------------------------------------------------------------------ */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseISO = (s?: string) => {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function DatePicker({
  value,
  defaultValue,
  onChange,
  disabled,
  placeholder = 'Select date',
  className = '',
}: {
  value?: string
  defaultValue?: string
  onChange?: (v: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue ?? '')
  const current = isControlled ? value : internal
  const selectedDate = parseISO(current)

  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => selectedDate ?? new Date())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setView(selectedDate ?? new Date())
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])

  const commit = (d: Date) => {
    const iso = toISO(d)
    if (!isControlled) setInternal(iso)
    onChange?.(iso)
    setOpen(false)
  }

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isToday = (d: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === d
  const isSel = (d: number) =>
    !!selectedDate &&
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month &&
    selectedDate.getDate() === d

  const label = selectedDate
    ? `${pad(selectedDate.getDate())} ${MONTHS_SHORT[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    : placeholder

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${controlBase} flex items-center justify-between gap-2 text-left ${
          open ? 'border-brand ring-4 ring-brand-soft' : ''
        } ${selectedDate ? '' : 'text-muted/70'}`}
      >
        <span className="truncate">{label}</span>
        <CalendarDays size={16} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="animate-pop absolute z-40 mt-1.5 w-[280px] rounded-xl border border-line bg-white p-3 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[13.5px] font-700 text-ink">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="grid h-8 place-items-center text-[11px] font-600 text-muted"
              >
                {w}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} className="h-9" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1
              const sel = isSel(d)
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => commit(new Date(year, month, d))}
                  className={`grid h-9 place-items-center rounded-lg text-[13px] transition ${
                    sel
                      ? 'bg-brand font-700 text-white'
                      : isToday(d)
                        ? 'font-700 text-brand hover:bg-brand-soft'
                        : 'text-ink hover:bg-brand-soft hover:text-brand'
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              onClick={() => commit(new Date())}
              className="rounded-lg px-2 py-1 text-[12.5px] font-600 text-brand transition hover:bg-brand-soft"
            >
              Today
            </button>
            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  if (!isControlled) setInternal('')
                  onChange?.('')
                  setOpen(false)
                }}
                className="rounded-lg px-2 py-1 text-[12.5px] font-600 text-muted transition hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** One field, one calendar: the first click picks "from", the second picks "to". */
export function DateRangePicker({
  from,
  to,
  onChange,
  disabled,
  placeholder = 'Select date range',
  className = '',
}: {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const fromDate = parseISO(from)
  const toDate = parseISO(to)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => fromDate ?? new Date())
  // While choosing the end date, `anchor` holds the start that was just clicked.
  const [anchor, setAnchor] = useState<Date | null>(null)
  const [hover, setHover] = useState<Date | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setView(fromDate ?? new Date())
      setAnchor(null)
      setHover(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])

  const pick = (d: Date) => {
    if (!anchor) {
      setAnchor(d)
      return
    }
    const [a, b] = d < anchor ? [d, anchor] : [anchor, d]
    onChange({ from: toISO(a), to: toISO(b) })
    setAnchor(null)
    setOpen(false)
  }

  // The range being shown: the committed one, or the in-progress one while hovering.
  const [rs, re] = anchor
    ? hover && hover < anchor ? [hover, anchor] : [anchor, hover ?? anchor]
    : [fromDate, toDate]

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d
  const fmt = (d: Date) => `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`

  const label =
    fromDate && toDate
      ? from === to ? fmt(fromDate) : `${fmt(fromDate)} – ${fmt(toDate)}`
      : fromDate ? fmt(fromDate) : placeholder

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`${controlBase} flex items-center justify-between gap-2 text-left ${
          open ? 'border-brand ring-4 ring-brand-soft' : ''
        } ${fromDate ? '' : 'text-muted/70'}`}
      >
        <span className="truncate">{label}</span>
        <CalendarDays size={16} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="animate-pop absolute z-40 mt-1.5 w-[280px] rounded-xl border border-line bg-white p-3 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView(new Date(year, month - 1, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[13.5px] font-700 text-ink">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setView(new Date(year, month + 1, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-brand"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <p className="mb-1 text-center text-[11.5px] text-muted">
            {anchor ? 'Now pick the end date' : 'Pick the start date'}
          </p>

          <div className="grid grid-cols-7 gap-y-0.5" onMouseLeave={() => setHover(null)}>
            {WEEKDAYS.map((w) => (
              <div key={w} className="grid h-8 place-items-center text-[11px] font-600 text-muted">
                {w}
              </div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} className="h-9" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1
              const date = new Date(year, month, d)
              const isEnd = !!rs && !!re && (date.getTime() === rs.getTime() || date.getTime() === re.getTime())
              const inRange = !!rs && !!re && date > rs && date < re
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => pick(date)}
                  onMouseEnter={() => anchor && setHover(date)}
                  className={`grid h-9 place-items-center text-[13px] transition ${
                    isEnd
                      ? 'rounded-lg bg-brand font-700 text-white'
                      : inRange
                        ? 'bg-brand-soft text-brand'
                        : `rounded-lg hover:bg-brand-soft hover:text-brand ${isToday(d) ? 'font-700 text-brand' : 'text-ink'}`
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              onClick={() => {
                const t = toISO(new Date())
                onChange({ from: t, to: t })
                setOpen(false)
              }}
              className="rounded-lg px-2 py-1 text-[12.5px] font-600 text-brand transition hover:bg-brand-soft"
            >
              Today
            </button>
            {fromDate && (
              <button
                type="button"
                onClick={() => {
                  onChange({ from: '', to: '' })
                  setOpen(false)
                }}
                className="rounded-lg px-2 py-1 text-[12.5px] font-600 text-muted transition hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type Variant = 'primary' | 'ghost' | 'outline' | 'danger'

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: 'md' | 'sm'
}) {
  const styles: Record<Variant, string> = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    danger:
      'border border-brand bg-white text-brand hover:bg-brand-soft',
    outline:
      'border border-brand bg-white text-brand hover:bg-brand-soft',
    ghost: 'text-brand hover:bg-brand-soft',
  }
  const sizing =
    size === 'sm' ? 'h-9 px-3.5 text-[13px]' : 'h-10 px-5 text-[13.5px]'
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-600 transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${sizing} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Checkbox + radio                                                    */
/* ------------------------------------------------------------------ */

export function Checkbox({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange?: (v: boolean) => void
  disabled?: boolean
  label?: ReactNode
}) {
  return (
    <label
      className={`inline-flex items-center gap-2.5 text-[14px] text-ink ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      <span
        onClick={() => !disabled && onChange?.(!checked)}
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border transition ${
          checked
            ? 'border-brand bg-brand text-white'
            : 'border-[#c4cfe4] bg-white'
        }`}
      >
        {checked ? <Check size={13} strokeWidth={3} /> : null}
      </span>
      {label}
    </label>
  )
}

export function Radio({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange?: () => void
  label: ReactNode
}) {
  return (
    <label
      onClick={onChange}
      className="inline-flex cursor-pointer items-center gap-2.5 text-[14px] text-ink"
    >
      <span
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border transition ${
          checked ? 'border-brand' : 'border-[#c4cfe4]'
        }`}
      >
        {checked ? <span className="h-2.5 w-2.5 rounded-full bg-brand" /> : null}
      </span>
      {label}
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue'
}) {
  const tones = {
    neutral: 'bg-canvas text-ink-soft border-line',
    green: 'bg-[#e8f6ee] text-[#1a7a45] border-[#bfe6cf]',
    amber: 'bg-[#fdf3e0] text-[#9a6a12] border-[#f2ddb3]',
    red: 'bg-[#fdecec] text-[#c23b3b] border-[#f4c9c9]',
    blue: 'bg-brand-soft text-brand border-brand-ring',
  }
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] font-600 ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

// Build the page list with ellipses, e.g. [1, '…', 4, 5, 6, '…', 23].
function pageItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: (number | 'ellipsis')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) items.push('ellipsis')
  for (let page = start; page <= end; page += 1) items.push(page)
  if (end < total - 1) items.push('ellipsis')
  items.push(total)
  return items
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  className = '',
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  const [goto, setGoto] = useState('')

  const from = total === 0 ? 0 : (current - 1) * pageSize + 1
  const to = Math.min(current * pageSize, total)

  const go = (next: number) => onPageChange(Math.min(Math.max(1, next), pageCount))

  const navBtn =
    'grid h-9 min-w-9 place-items-center rounded-lg border border-line bg-white px-2 text-muted transition hover:border-brand hover:bg-brand-soft hover:text-brand disabled:pointer-events-none disabled:opacity-40'

  const submitGoto = () => {
    const target = Number.parseInt(goto, 10)
    if (Number.isFinite(target)) go(target)
    setGoto('')
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 border-t border-line px-4 py-3 text-[13px] ${className}`}
    >
      <p className="text-muted">
        Showing <span className="font-700 text-ink">{from}</span> to{' '}
        <span className="font-700 text-ink">{to}</span> of{' '}
        <span className="font-700 text-ink">{total}</span> entries
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <button type="button" className={navBtn} onClick={() => go(1)} disabled={current === 1} aria-label="First page">
            <ChevronsLeft size={16} />
          </button>
          <button type="button" className={navBtn} onClick={() => go(current - 1)} disabled={current === 1} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>

          {pageItems(current, pageCount).map((item, i) =>
            item === 'ellipsis' ? (
              <span key={`e${i}`} className="grid h-9 w-9 place-items-center text-muted">
                …
              </span>
            ) : (
              <button
                type="button"
                key={item}
                onClick={() => go(item)}
                aria-current={item === current ? 'page' : undefined}
                className={`grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-[13px] font-600 transition ${
                  item === current
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-white text-ink hover:border-brand hover:bg-brand-soft hover:text-brand'
                }`}
              >
                {item}
              </button>
            ),
          )}

          <button type="button" className={navBtn} onClick={() => go(current + 1)} disabled={current === pageCount} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
          <button type="button" className={navBtn} onClick={() => go(pageCount)} disabled={current === pageCount} aria-label="Last page">
            <ChevronsRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted">Go to page</span>
          <input
            value={goto}
            inputMode="numeric"
            onChange={(event) => setGoto(event.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(event) => event.key === 'Enter' && submitGoto()}
            className="h-9 w-16 rounded-lg border border-line bg-white px-2.5 text-center text-[13px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
            aria-label="Go to page"
          />
          <button
            type="button"
            onClick={submitGoto}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-700 text-brand transition hover:bg-brand-soft"
          >
            Go <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-2xl',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="animate-overlay absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`animate-pop relative z-10 w-full ${width} overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_64px_-24px_rgba(15,30,61,0.5)]`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-700 text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

type Toast = { id: number; title: string; body?: string; tone: 'success' | 'info' }
const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = (t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setToasts((s) => [...s, { ...t, id }])
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 3800)
  }
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed left-1/2 top-5 z-[60] flex w-80 -translate-x-1/2 flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-toast flex items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-[0_16px_40px_-16px_rgba(15,30,61,0.4)]"
          >
            <span
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                t.tone === 'success'
                  ? 'bg-[#e8f6ee] text-[#1a7a45]'
                  : 'bg-brand-soft text-brand'
              }`}
            >
              <Check size={14} strokeWidth={3} />
            </span>
            <div>
              <p className="text-[13.5px] font-600 text-ink">{t.title}</p>
              {t.body ? (
                <p className="mt-0.5 text-[12.5px] text-muted">{t.body}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
