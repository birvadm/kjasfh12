import { useState } from "react"
import { AlertTriangle, Check, Clock, Pencil, Search, Send, Wallet, X } from "../components/icons"
import { Button, Card, Modal, useToast } from "../components/ui"
import { DeductionParameters } from "./DeductionParameters"

type Mode = "instant" | "batch"

const MODE_INFO: Record<Mode, { icon: typeof Send; summary: string; points: string[] }> = {
  instant: {
    icon: Send,
    summary: "Each credit is analysed the moment it arrives.",
    points: ["Real-time payment decisions", "Higher, continuous system load"],
  },
  batch: {
    icon: Clock,
    summary: "Credits are queued and analysed in scheduled batch runs.",
    points: ["Manageable & predictable system load", "Results available after each run"],
  },
}

const stamp = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const BATCH_JOBS = [
  { id: "BJ-PA-01", name: "Payment Analysis - Nightly Credit Run", schedule: "Daily", time: "23:00" },
  { id: "BJ-PA-02", name: "Payment Analysis - Morning Settlement", schedule: "Daily", time: "06:30" },
  { id: "BJ-PA-03", name: "Payment Analysis - Midday Credit Sweep", schedule: "Mon - Fri", time: "12:00" },
  { id: "BJ-PA-04", name: "Payment Analysis - Tobacco Purchase Credits", schedule: "Every 4 hours", time: "00:00, 04:00 ..." },
  { id: "BJ-PA-05", name: "Payment Analysis - Weekly Reconciliation", schedule: "Weekly, Sunday", time: "02:00" },
]

const MODE_LABEL: Record<Mode, string> = {
  instant: "Instantaneous",
  batch: "Batch Job Based",
}

export default function PaymentAnalysisParameters() {
  const [mode, setMode] = useState<Mode>("instant")
  const [pending, setPending] = useState<Mode | null>(null)
  const [step, setStep] = useState<0 | "job" | 1 | 2>(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [draftJob, setDraftJob] = useState<string | null>(null)
  const [jobQuery, setJobQuery] = useState("")
  const activeJob = BATCH_JOBS.find((j) => j.id === jobId)
  const draft = BATCH_JOBS.find((j) => j.id === draftJob)
  const visibleJobs = BATCH_JOBS.filter((j) => `${j.name} ${j.id}`.toLowerCase().includes(jobQuery.trim().toLowerCase()))
  const toast = useToast()
  const [lastChange, setLastChange] = useState({ at: "02/03/2026 09:15", by: "Finance Admin" })
  const [tab, setTab] = useState<"parameters" | "freepayment" | "mode">("parameters")
  const tabClass = (on: boolean) =>
    `border-b-2 px-1 pb-3 text-[14px] font-700 transition ${on ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`

  const request = (next: Mode) => {
    if (next === mode) return
    setPending(next)
    if (next === "batch") {
      setDraftJob(jobId ?? BATCH_JOBS[0].id)
      setJobQuery("")
      setStep("job")
    } else setStep(1)
  }
  const abort = () => {
    setPending(null)
    setStep(0)
  }
  const apply = () => {
    if (pending) setMode(pending)
    setJobId(pending === "batch" ? draftJob : null)
    setLastChange({ at: stamp(), by: "You" })
    abort()
    toast({ tone: "success", title: "Mode of Payment Analysis has been changed" })
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-line">
        <div className="flex gap-6" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "parameters"} onClick={() => setTab("parameters")} className={tabClass(tab === "parameters")}>
            Funrural
          </button>
          <button type="button" role="tab" aria-selected={tab === "freepayment"} onClick={() => setTab("freepayment")} className={tabClass(tab === "freepayment")}>
            Free payment
          </button>
          <button type="button" role="tab" aria-selected={tab === "mode"} onClick={() => setTab("mode")} className={tabClass(tab === "mode")}>
            Mode of Payment Analysis
          </button>
        </div>
      </div>

      {tab === "parameters" && <DeductionParameters hideTabs />}
      {tab === "freepayment" && <FreePayment />}

      {tab === "mode" && (
        <Card className="p-6">
          <p className="text-[15px] font-800 text-ink">Mode of Payment Analysis</p>
          <p className="mt-0.5 text-[13px] text-muted">Choose how incoming credits are analysed.</p>

          <div role="radiogroup" aria-label="Mode of Payment Analysis" className="mt-5 grid gap-4 md:grid-cols-2">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => {
              const on = mode === m
              const Icon = MODE_INFO[m].icon
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => request(m)}
                  className={`group relative rounded-2xl border p-5 text-left transition ${
                    on
                      ? "border-brand bg-brand-soft/50 ring-1 ring-brand"
                      : "border-line bg-white hover:-translate-y-0.5 hover:border-brand-ring hover:shadow-[0_10px_24px_-16px_rgba(15,30,61,0.4)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${on ? "bg-brand text-white" : "bg-canvas text-muted group-hover:text-brand"}`}>
                      <Icon size={18} />
                    </span>
                    {on ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11.5px] font-700 text-white">
                        <Check size={13} /> Active
                      </span>
                    ) : (
                      <span className="h-5 w-5 rounded-full border-2 border-line group-hover:border-brand-ring" />
                    )}
                  </div>
                  <p className={`mt-4 text-[15px] font-800 ${on ? "text-brand" : "text-ink"}`}>{MODE_LABEL[m]}</p>
                  <p className="mt-1 text-[13px] text-ink-soft">{MODE_INFO[m].summary}</p>
                  <ul className="mt-3 space-y-1.5">
                    {MODE_INFO[m].points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-[12.5px] text-muted">
                        <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-brand" : "bg-muted/50"}`} /> {pt}
                      </li>
                    ))}
                  </ul>
                  {m === "batch" && on && activeJob && (
                    <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-brand-ring bg-white px-3 py-2.5">
                      <Clock size={15} className="shrink-0 text-brand" />
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-700 text-ink">{activeJob.name}</p>
                        <p className="text-[11.5px] text-muted">{activeJob.schedule} · {activeJob.time}</p>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <p className="mt-5 border-t border-line pt-4 text-[12.5px] text-muted">
            Last changed {lastChange.at} by {lastChange.by}
          </p>
      </Card>
      )}

      <Modal open={step === "job"} onClose={abort} title="Select batch job" width="max-w-lg">
        <p className="text-[13px] text-muted">Choose the scheduled job that will run Payment Analysis.</p>
        <div className="relative mt-4">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={jobQuery}
            onChange={(e) => setJobQuery(e.target.value)}
            placeholder="Search batch jobs"
            className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand-ring"
          />
        </div>
        <div role="radiogroup" aria-label="Batch jobs" className="mt-3 max-h-[320px] space-y-2 overflow-y-auto">
          {visibleJobs.map((j) => {
            const on = draftJob === j.id
            return (
              <button
                key={j.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setDraftJob(j.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${on ? "border-brand bg-brand-soft/50 ring-1 ring-brand" : "border-line bg-white hover:border-brand-ring hover:bg-canvas"}`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${on ? "bg-brand text-white" : "bg-canvas text-muted"}`}>
                  <Clock size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-700 text-ink">{j.name}</span>
                  <span className="mt-0.5 block text-[12px] text-muted">{j.id} · {j.schedule}</span>
                </span>
                <span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-[11.5px] font-700 text-ink-soft">{j.time}</span>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? "border-brand bg-brand text-white" : "border-line"}`}>
                  {on && <Check size={11} />}
                </span>
              </button>
            )
          })}
          {visibleJobs.length === 0 && <p className="py-8 text-center text-[13px] text-muted">No batch jobs match "{jobQuery}".</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" onClick={abort}>Cancel</Button>
          <Button disabled={!draftJob} onClick={() => setStep(1)}>Continue</Button>
        </div>
      </Modal>

      <Modal open={step === 1} onClose={abort} title="Change Mode of Payment Analysis?" width="max-w-md">
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          Are you sure you want to change the mode of Payment Analysis?
        </p>
        {pending === "batch" && draft && (
          <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-[12.5px] text-ink-soft">
            Batch job: <b className="text-ink">{draft.name}</b> · {draft.schedule} · {draft.time}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" onClick={pending === "batch" ? () => setStep("job") : abort}>{pending === "batch" ? "Back" : "No"}</Button>
          <Button onClick={() => setStep(2)}>Yes</Button>
        </div>
      </Modal>

      <Modal open={step === 2} onClose={abort} title="Please double-confirm" width="max-w-md">
        <div className="flex gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#c07a12]" />
          <p className="text-[13.5px] leading-relaxed text-ink-soft">
            Please double-confirm that you want to change the mode of Payment Analysis. This change can have{" "}
            <b>MAJOR FINANCIAL AND SYSTEM PERFORMANCE</b> implications.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="outline" onClick={abort}>Cancel</Button>
          <Button variant="danger" onClick={apply}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}

/* Free payment: one editable threshold; every change is confirmed because of its financial impact. */
const fmtAmount = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function FreePayment() {
  const toast = useToast()
  const [saved, setSaved] = useState(500)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(fmtAmount(500))
  const [ask, setAsk] = useState(false)
  const [last, setLast] = useState({ at: "02/03/2026 09:15", by: "Finance Admin" })
  const parsed = Number(value.replace(/,/g, ""))
  const valid = value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0
  const dirty = valid && Math.round(parsed * 100) !== Math.round(saved * 100)
  const cancel = () => { setValue(fmtAmount(saved)); setEditing(false) }
  const confirm = () => {
    const next = Math.round(parsed * 100) / 100
    setSaved(next); setValue(fmtAmount(next)); setAsk(false); setEditing(false); setLast({ at: stamp(), by: "You" })
    toast({ tone: "success", title: "Free payment minimum updated", body: `New minimum amount: ${fmtAmount(next)}` })
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-6 py-5">
        <div className="flex items-center gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Wallet size={20} /></span>
          <div>
            <p className="text-[15px] font-800 text-ink">Free payment</p>
            <p className="mt-0.5 text-[13px] text-muted">Credits at or above this amount can be released as a free payment.</p>
          </div>
        </div>
        {editing ? (
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={cancel}><X size={16} /> Cancel</Button>
            <Button disabled={!dirty} onClick={() => setAsk(true)}><Check size={16} /> Save</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}><Pencil size={15} /> Edit</Button>
        )}
      </div>

      <div className="px-6 py-6">
        <div className={`flex max-w-[460px] items-center justify-between gap-6 rounded-2xl border px-5 py-4 transition ${editing ? "border-brand bg-white ring-4 ring-brand-soft" : "border-line bg-canvas"}`}>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-800 uppercase tracking-[0.06em] text-muted">Minimum amount for free payment</p>
            {editing ? (
              <input autoFocus inputMode="decimal" aria-label="Minimum amount for free payment" value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ""))} onBlur={() => valid && setValue(fmtAmount(parsed))}
                className="mt-1 w-full bg-transparent text-[28px] font-800 leading-tight text-ink tabular-nums outline-none" />
            ) : (
              <p className="mt-1 text-[28px] font-800 leading-tight text-ink tabular-nums">{fmtAmount(saved)}</p>
            )}
          </div>
        </div>
        {editing && !valid && <p className="mt-2 text-[12.5px] font-600 text-[#c23b3b]">Enter a valid amount, for example 500.00</p>}
        <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-muted"><Clock size={13} /> Last changed {last.at} by {last.by}</p>
      </div>

      <Modal open={ask} onClose={() => setAsk(false)} title="Confirm change" width="max-w-md">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fdf3e0] text-[#9a6a12]"><AlertTriangle size={18} /></span>
          <p className="text-[14px] text-ink">Are you sure you want to make the change? It can have major financial implications.</p>
        </div>
        <p className="mt-3 rounded-lg bg-canvas px-3 py-2.5 text-[13px] text-ink-soft">Minimum amount: <b className="text-ink tabular-nums">{fmtAmount(saved)}</b> to <b className="text-ink tabular-nums">{valid ? fmtAmount(parsed) : "-"}</b></p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="outline" onClick={() => setAsk(false)}>Cancel</Button>
          <Button onClick={confirm}>Confirm</Button>
        </div>
      </Modal>
    </Card>
  )
}
