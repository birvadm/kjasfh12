import { useState, type ReactNode } from "react"
import {
  Home,
  Sprout,
  Wallet,
  Boxes,
  ShoppingCart,
  ShieldCheck,
  Moon,
  Languages,
  Bell,
  ChevronRight,
  ChevronDown,
  Search,
  LayoutGrid,
} from "./icons"

const nav = [
  { key: "home", label: "Home", icon: Home },
  { key: "growing", label: "Growing", icon: Sprout },
  { key: "finance", label: "Finance", icon: Wallet },
  { key: "supply", label: "Supply", icon: Boxes },
  { key: "buying", label: "Buying", icon: ShoppingCart },
  { key: "common", label: "Common", icon: LayoutGrid },
]

type NavChild = { key: string; label: string; children?: { key: string; label: string }[] }

const financeChildren: NavChild[] = [
  { key: "orders", label: "Payment Order" },
  {
    key: "paymentanalysis",
    label: "Payment Analysis",
    children: [
      { key: "paymentanalysis", label: "Credit Types & Claim Rules" },
      { key: "paclaimrules", label: "Claim Rules" },
      { key: "pacreditlogs", label: "Credit List & Logs" },
      { key: "pasimulator", label: "Payment Analysis Simulator" },
      { key: "paparameters", label: "Payment Analysis Parameters" },
    ],
  },
  { key: "ruleactions", label: "Rule Actions" },
  { key: "types", label: "PO type registration and calendar configuration" },
  { key: "policy", label: "Payment Policy" },
  { key: "averageprice", label: "Payment Policy - Average Price" },
  { key: "deductions", label: "Payment Policy Parameters" },
  { key: "routemapupdated", label: "Route Map" },
  { key: "debttransfer", label: "Debt Transfer" },
  { key: "debtreversal", label: "Debt Reversal" },
  { key: "debttransferft", label: "Debt Transfer FT Requests(growing)" },
  { key: "debttransferparameters", label: "Debt Transfer Parameters" },
  { key: "binding", label: "Binding" },
  { key: "bindingft", label: "Binding FT Requests" },
  { key: "rebuying", label: "Rebuying" },
  { key: "contractualfine", label: "Contractual fine" },
]
const buyingChildren: NavChild[] = [{ key: "ciotrpps", label: "CIOT & RPPS" }, { key: "tobaccopurchase", label: "Tobacco Buying" }, { key: "tobaccoparameters", label: "Tobacco Parameters" }]

type Crumb = {
  label: string
  to?: string
}
type IconButtonProps = {
  icon: typeof Home
  dot?: boolean
}

export function AppShell({
  crumbs = [],
  onCrumb,
  screen,
  onNavigate,
  children,
}: {
  crumbs?: Crumb[]
  onCrumb: (to: string) => void
  screen: string
  onNavigate: (to: string) => void
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  /* Sections the user has folded closed; a section opens again when navigated into. */
  const [folded, setFolded] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState("")
  const trimmedQuery = query.trim().toLowerCase()
  const searchResults = trimmedQuery
    ? [...financeChildren, ...buyingChildren].flatMap((c) => c.children ?? [c]).filter((c) => c.label.toLowerCase().includes(trimmedQuery))
    : []
  const openScreen = (key: string) => {
    onNavigate(key)
    setQuery("")
  }
  const financeActive =
    screen === "orders" ||
    screen === "paymentanalysis" ||
    screen === "paclaimrules" ||
    screen === "pacreditlogs" ||
    screen === "pasimulator" ||
    screen === "paparameters" ||
    screen === "ruleactions" ||
    screen === "parameters" ||
    screen === "policy" ||
    screen === "policypositions" ||
    screen === "averageprice" ||
    screen === "deductions" ||
    screen === "types" ||
    screen === "calendar" ||
    screen === "routemap" ||
    screen === "routemapupdated" ||
    screen === "distanceroute" ||
    screen === "routes" ||
    screen === "debttransfer" ||
    screen === "debttransferrequests" ||
    screen === "debttransferreports" ||
    screen === "debttransferreport" ||
    screen === "debtreversal" ||
    screen === "poreversal" ||
    screen === "debttransferdetail" ||
    screen === "debttransfersetup" ||
    screen === "debtcarryover" ||
    screen === "debtrequestdetail" ||
    screen === "debtrequestsetup" ||
    screen === "debttransferft" ||
    screen === "debttransferftrequest" ||
    screen === "debttransferftdetail" ||
    screen === "debttransferparameters" ||
    screen === "binding" ||
    screen === "bindingft" ||
    screen === "rebuying" ||
    screen === "contractualfine"
  const buyingActive = screen === "tobaccopurchase" || screen === "tobaccoparameters" || screen === "ciotrpps"

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside
        className={`sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-line bg-white transition-all ${
          collapsed ? "w-[76px]" : "w-[248px]"
        }`}
      >
        {!collapsed && (
          <div className="shrink-0 px-3 pt-5">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-soft">
              <Search size={16} className="shrink-0 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) openScreen(searchResults[0].key)
                  if (e.key === "Escape") setQuery("")
                }}
                placeholder="Search screens…"
                className="h-9 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-muted/70"
              />
            </div>
          </div>
        )}

        <div className="menu-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-5">
          {trimmedQuery ? (
            searchResults.length > 0 ? (
              searchResults.map((c) => (
                <button
                  key={c.key}
                  onClick={() => openScreen(c.key)}
                  className={`rounded-lg px-3 py-2.5 text-left text-[13px] leading-snug transition ${
                    screen === c.key
                      ? "bg-brand text-white font-600"
                      : "text-ink-soft hover:bg-brand-soft hover:text-brand"
                  }`}
                >
                  {c.label}
                </button>
              ))
            ) : (
              <p className="px-3 py-2.5 text-[13px] text-muted">No screens found</p>
            )
          ) : (
          nav.map((n) => {
            const isBuying = n.key === "common"
            const active = (n.key === "finance" && financeActive) || (isBuying && buyingActive)
            const Icon = n.icon
            const isFinance = n.key === "finance"

            if (collapsed) {
              return (
                <button
                  key={n.key}
                  onClick={() => (isFinance ? onNavigate("orders") : isBuying ? onNavigate("ciotrpps") : undefined)}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 transition ${
                    active
                      ? "bg-brand text-white"
                      : "text-muted hover:bg-brand-soft hover:text-brand"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-600">{n.label}</span>
                </button>
              )
            }

            const sectionActive = isFinance ? financeActive : isBuying ? buyingActive : false
            const expanded = sectionActive && !folded[n.key]
            return (
              <div key={n.key}>
                <button
                  aria-expanded={isFinance || isBuying ? expanded : undefined}
                  onClick={() => {
                    if (!isFinance && !isBuying) return
                    if (sectionActive) { setFolded((f) => ({ ...f, [n.key]: !f[n.key] })); return }
                    setFolded((f) => ({ ...f, [n.key]: false }))
                    onNavigate(isFinance ? "orders" : "ciotrpps")
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-600 transition ${
                    active
                      ? "bg-brand-soft text-brand"
                      : "text-ink-soft hover:bg-brand-soft/60 hover:text-brand"
                  }`}
                >
                  <Icon size={19} className="shrink-0" />
                  <span className="flex-1">{n.label}</span>
                  {(isFinance || isBuying) && (
                    <ChevronDown
                      size={15}
                      className={`text-muted transition ${
                        expanded ? "" : "-rotate-90"
                      }`}
                    />
                  )}
                </button>

                {isBuying && expanded && (
                  <div className="mb-1 mt-0.5 ml-[26px] flex flex-col gap-0.5 border-l border-line pl-3">
                    {buyingChildren.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => onNavigate(c.key)}
                        className={`rounded-lg px-3 py-2 text-left text-[13px] leading-snug transition ${
                          screen === c.key ? "bg-brand text-white font-600" : "text-muted hover:bg-brand-soft hover:text-brand"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}

                {isFinance && expanded && (
                  <div className="mb-1 mt-0.5 ml-[26px] flex flex-col gap-0.5 border-l border-line pl-3">
                    {financeChildren.map((c) => {
                      const on =
                        c.key === "orders"
                          ? screen === "orders"
                          : c.key === "policy"
                            ? screen === "policy" ||
                              screen === "policypositions"
                            : c.key === "routemap"
                              ? screen === "routemap" ||
                                screen === "distanceroute" ||
                                screen === "routes"
                              : c.key === "routemapupdated"
                                ? screen === "routemapupdated"
                                : c.key === "types"
                                  ? screen === "types" || screen === "calendar"
                                  : screen === c.key
                      if (c.children) {
                        const groupOn = c.children.some((k) => k.key === screen)
                        return (
                          <div key={c.key} className="flex flex-col gap-0.5">
                            <button
                              onClick={() => onNavigate(c.children![0].key)}
                              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] leading-snug transition ${
                                groupOn ? "font-700 text-brand" : "text-muted hover:bg-brand-soft hover:text-brand"
                              }`}
                            >
                              {c.label}
                              <ChevronDown size={13} className={`transition ${groupOn ? "" : "-rotate-90"}`} />
                            </button>
                            {groupOn && (
                              <div className="ml-3 flex flex-col gap-0.5 border-l border-line pl-2.5">
                                {c.children.map((k) => (
                                  <button
                                    key={k.key}
                                    onClick={() => onNavigate(k.key)}
                                    className={`rounded-lg px-3 py-1.5 text-left text-[12.5px] leading-snug transition ${
                                      screen === k.key
                                        ? "bg-brand text-white font-600"
                                        : "text-muted hover:bg-brand-soft hover:text-brand"
                                    }`}
                                  >
                                    {k.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      }
                      return (
                        <button
                          key={c.key}
                          onClick={() => onNavigate(c.key)}
                          className={`rounded-lg px-3 py-2 text-left text-[13px] leading-snug transition ${
                            on
                              ? "bg-brand text-white font-600"
                              : "text-muted hover:bg-brand-soft hover:text-brand"
                          }`}
                        >
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
          )}
        </div>

        <div className="mt-auto flex flex-col gap-0.5 px-3 pb-5">
          <SideMini icon={ShieldCheck} label="Access" collapsed={collapsed} />
          <SideMini icon={Moon} label="Dark" collapsed={collapsed} />
        </div>

        {/* collapse handle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-24 grid h-7 w-7 place-items-center rounded-full border border-line bg-white text-muted shadow-sm transition hover:text-brand"
        >
          <ChevronRight size={15} className={collapsed ? "" : "rotate-180"} />
        </button>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/85 px-8 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 items-center gap-1.5 rounded-lg bg-ink px-2.5 text-[13px] font-800 tracking-wide text-white">
              BAT
            </div>
            <div className="flex items-center gap-1.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8f6ee] text-[#1a7a45]">
                <Sprout size={17} />
              </span>
              <span className="text-[17px] font-800 text-ink">
                Agri<span className="text-brand">360</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <IconBtn icon={Languages} />
            <IconBtn icon={Bell} dot />
            <div className="mx-1 h-8 w-px bg-line" />
            <div className="text-right leading-tight">
              <p className="text-[13.5px] font-700 text-ink">Admin</p>
              <p className="text-[11.5px] text-muted">BAT Brazil · Sector 4</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-brand text-[15px] font-700 text-white">
              A
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 px-8 pt-6 text-[14px]">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1
            return (
              <span key={c.label} className="flex items-center gap-2">
                <button
                  disabled={last || !c.to}
                  onClick={() => c.to && onCrumb(c.to)}
                  className={
                    last
                      ? "font-600 text-ink"
                      : "font-500 text-brand transition hover:text-brand-dark hover:underline"
                  }
                >
                  {c.label}
                </button>
                {!last && <ChevronRight size={15} className="text-muted/60" />}
              </span>
            )
          })}
        </div>

        <main className="flex-1 px-8 pb-14 pt-5">{children}</main>
      </div>
    </div>
  )
}

function SideMini({
  icon: Icon,
  label,
  collapsed,
}: {
  icon: typeof Home
  label: string
  collapsed: boolean
}) {
  if (collapsed) {
    return (
      <button className="flex flex-col items-center gap-1 rounded-2xl py-2.5 text-muted transition hover:bg-brand-soft hover:text-brand">
        <Icon size={19} />
        <span className="text-[10px] font-600">{label}</span>
      </button>
    )
  }
  return (
    <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-600 text-ink-soft transition hover:bg-brand-soft/60 hover:text-brand">
      <Icon size={19} className="shrink-0" />
      <span>{label}</span>
    </button>
  )
}

function IconBtn({ icon: Icon, dot }: IconButtonProps) {
  return (
    <button className="relative grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-canvas hover:text-brand">
      <Icon size={18} />
      {dot ? (
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e0603a]" />
      ) : null}
    </button>
  )
}
