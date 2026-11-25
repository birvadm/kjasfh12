import { useState } from "react"
import { AppShell } from "./components/AppShell"
import { Button, ToastProvider } from "./components/ui"
import { ChevronLeft } from "./components/icons"
import { PaymentOrders } from "./screens/PaymentOrders"
import {
  PaymentPolicy,
  type Detail,
  type Policy,
} from "./screens/PaymentPolicy"
import { AveragePrice } from "./screens/AveragePrice"
import { DeductionParameters } from "./screens/DeductionParameters"
import {
  PaymentPolicyPositionTable,
  type PositionTablePolicy,
} from "./screens/PaymentPolicyPositionTable"
import { PaymentCalendar } from "./screens/PaymentCalendar"
import { PaymentOrderTypeConfig } from "./screens/PaymentOrderTypeConfig"
import { RouteMap } from "./screens/RouteMap"
import { DistanceRouteDetail } from "./screens/DistanceRouteDetail"
import type { DistanceRoute } from "./screens/RouteMapPanels"
import { RouteSuggestions } from "./screens/RouteSuggestions"
import { RouteMapUpdated } from "./screens/RouteMapUpdated"
import {
  DebtTransfer,
  type DebtRow,
  type DebtRequest,
  DEBT_REQUESTS,
  type CarryOverSetup,
} from "./screens/DebtTransfer"
import { DebtTransferDetail } from "./screens/DebtTransferDetail"
import { DebtRequestDetail } from "./screens/DebtRequestDetail"
import { DebtCarryOver } from "./screens/DebtCarryOver"
import { DebtTransferFT } from "./screens/DebtTransferFT"
import { DebtTransferFTRequest } from "./screens/DebtTransferFTRequest"
import { DebtTransferFTDetail } from "./screens/DebtTransferFTDetail"
import { DebtTransferParameters } from "./screens/DebtTransferParameters"
import { DebtTransferReportDetail } from "./screens/DebtTransferReportDetail"
import { DebtReversal } from "./screens/DebtReversal"
import { POReversal } from "./screens/POReversal"
import { PaymentAnalysis, type PACrumb, type PASection } from "./screens/PaymentAnalysis"
import { Parameters } from "./screens/Parameters"
import PaymentAnalysisParameters from "./screens/PaymentAnalysisParameters"
import RuleActions from "./screens/RuleActions"
import Binding, { type BindingCrumb } from "./screens/Binding"
import Rebuying, { type RebuyCrumb } from "./screens/Rebuying"
import ContractualFine, { type ContractualFineCrumb } from "./screens/ContractualFine"
import CiotRpps, { type CiotCrumb } from "./screens/CiotRpps"
import TobaccoPurchase, { TobaccoReportsParameters, type TobaccoCrumb } from "./screens/TobaccoPurchase"
import type { DebtTransferReport } from "./screens/DebtTransferReports"
import {
  ROUTE_DEST,
  ROUTE_SOURCE,
  STOPS_BY_TRANSPORTER,
  TOLL_ROUTE_OPTIONS,
  type Farmer,
  type RouteState,
} from "./data"

type Screen = "orders" | "paymentanalysis" | "paclaimrules" | "pacreditlogs" | "pasimulator" | "paparameters" | "ruleactions" | "parameters" | "policy" | "policypositions" | "averageprice" | "deductions" | "calendar" | "types" | "routemap" | "routemapupdated" | "debttransfer" | "debttransferrequests" | "debttransferreports" | "debttransferreport" | "debtreversal" | "poreversal" | "debttransferft" | "debttransferftrequest" | "debttransferparameters" | "binding" | "bindingft" | "rebuying" | "contractualfine" | "ciotrpps" | "tobaccopurchase" | "tobaccoparameters" | "debttransferdetail" | "debtrequestdetail" | "debttransferftdetail" | "debtcarryover" | "distanceroute" | "routes"
type Crumb = {
  label: string
  to?: string
}

const CRUMBS: Record<Screen, Crumb[]> = {
  orders: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Orders" },
  ],
  paymentanalysis: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Analysis", to: "paymentanalysis" },
    { label: "Credit Types & Claim Rules" },
  ],
  paclaimrules: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Analysis", to: "paymentanalysis" },
    { label: "Claim Rules" },
  ],
  pacreditlogs: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Analysis", to: "paymentanalysis" },
    { label: "Credit List & Logs" },
  ],
  pasimulator: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Analysis", to: "paymentanalysis" },
    { label: "Payment Analysis Simulator" },
  ],
  paparameters: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Analysis", to: "paymentanalysis" },
    { label: "Payment Analysis Parameters" },
  ],
  ruleactions: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Analysis", to: "paymentanalysis" },
    { label: "Rule Actions" },
  ],
  parameters: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Analysis Parameters" },
  ],
  policy: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Policy" },
  ],
  policypositions: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Policy", to: "policy" },
    { label: "Position Table" },
  ],
  averageprice: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Policy- Average Price" },
  ],
  deductions: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Payment Policy Parameters" },
  ],
  calendar: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "PO type registration and calendar configuration", to: "types" },
    { label: "Calendar" },
  ],
  types: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "PO type registration and calendar configuration" },
  ],
  routemap: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Route Map" },
  ],
  routemapupdated: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Route Map " },
  ],
  debttransfer: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer" },
  ],
  debttransferrequests: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer" },
  ],
  debttransferreports: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer", to: "debttransfer" },
    { label: "Report" },
  ],
  debttransferreport: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer", to: "debttransfer" },
    { label: "Report", to: "debttransferreports" },
    { label: "View" },
  ],
  debtreversal: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Reversal" },
  ],
  poreversal: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Reversal", to: "debtreversal" },
    { label: "PO Reversal" },
  ],
  debttransferft: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer FT Requests" },
  ],
  debttransferftrequest: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer FT Requests", to: "debttransferft" },
    { label: "Request" },
  ],
  debttransferparameters: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer Parameters" },
  ],
  binding: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Binding" },
  ],
  bindingft: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Binding FT Requests" },
  ],
  rebuying: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Rebuying" },
  ],
  contractualfine: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Contractual fine" },
  ],
  tobaccopurchase: [
    { label: "Home", to: "orders" },
    { label: "Common", to: "ciotrpps" },
    { label: "Tobacco purchase" },
  ],
  tobaccoparameters: [
    { label: "Home", to: "orders" },
    { label: "Common", to: "ciotrpps" },
    { label: "Tobacco Parameters" },
  ],
  ciotrpps: [
    { label: "Home", to: "orders" },
    { label: "Common", to: "ciotrpps" },
    { label: "CIOT & RPPS" },
  ],
  debttransferdetail: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer", to: "debttransfer" },
    { label: "Transfer" },
  ],
  debtcarryover: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer", to: "debttransfer" },
    { label: "Carry over" },
  ],
  debtrequestdetail: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer", to: "debttransfer" },
    { label: "FT Request Transfer" },
  ],
  debttransferftdetail: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Debt Transfer FT Requests", to: "debttransferft" },
    { label: "FT Request" },
  ],
  distanceroute: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Route Map", to: "routemap" },
    { label: "Registered Route" },
  ],
  routes: [
    { label: "Home", to: "orders" },
    { label: "Finance", to: "orders" },
    { label: "Route Map", to: "routemap" },
    { label: "Suggested Routes" },
  ],
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("orders")
  /* Screen to return to when Payment Analysis is opened from a Binding (kept mounted so its state survives). */
  const [paFrom, setPaFrom] = useState<"binding" | "bindingft" | null>(null)
  const go = (to: string) => { setPaFrom(null); setScreen(to as Screen) }
  const openPaFrom = (from: "binding" | "bindingft") => { setScreen("pacreditlogs"); setPaFrom(from) }

  const [policyEditorCrumb, setPolicyEditorCrumb] =
    useState<"Add New Policy" | "Policy Edit" | null>(null)
  const [paCrumbs, setPaCrumbs] = useState<PACrumb[]>([])
  const [bindingCrumbs, setBindingCrumbs] = useState<BindingCrumb[]>([])
  const [rebuyCrumbs, setRebuyCrumbs] = useState<RebuyCrumb[]>([])
  const [contractualFineCrumbs, setContractualFineCrumbs] = useState<ContractualFineCrumb[]>([])
  const [ciotCrumbs, setCiotCrumbs] = useState<CiotCrumb[]>([])
  const [tobaccoCrumbs, setTobaccoCrumbs] = useState<TobaccoCrumb[]>([])
  const [policyViewVersion, setPolicyViewVersion] = useState(0)
  const [positionPolicy, setPositionPolicy] =
    useState<PositionTablePolicy | null>(null)
  const [policyRestore, setPolicyRestore] = useState<{
    policy: Policy
    detail: Detail
  } | null>(null)
  const [distanceRoute, setDistanceRoute] = useState<DistanceRoute | null>(null)
  const [debtRow, setDebtRow] = useState<DebtRow | null>(null)
  const [debtRequest, setDebtRequest] = useState<DebtRequest | null>(null)
  const [ftRequests, setFtRequests] = useState<DebtRequest[]>(DEBT_REQUESTS)
  const [debtReport, setDebtReport] = useState<DebtTransferReport | null>(null)
  const [poReversalReturn, setPoReversalReturn] = useState(false)
  const [carryOverSetup, setCarryOverSetup] = useState<CarryOverSetup | null>(
    null,
  )

  // Shared route-planning state, kept in sync across Route Map & Suggested Routes.
  const [source, setSource] = useState<Farmer>(ROUTE_SOURCE)
  const [stops, setStops] = useState<Farmer[]>(
    STOPS_BY_TRANSPORTER[ROUTE_SOURCE.name] ?? [],
  )
  const [dest, setDest] = useState<Farmer>(ROUTE_DEST)
  const initOpts =
    TOLL_ROUTE_OPTIONS[ROUTE_SOURCE.name] ??
    TOLL_ROUTE_OPTIONS["Transporter Base"]
  const [routeId, setRouteId] = useState(initOpts[0].id)

  const isPA = screen === "paymentanalysis" || screen === "paclaimrules" || screen === "pacreditlogs" || screen === "pasimulator"
  const paSection: PASection = screen === "pacreditlogs" ? "logs" : screen === "pasimulator" ? "simulator" : screen === "paclaimrules" ? "rules" : "claims"
  const activeCrumbs =
    screen === "policy" && policyEditorCrumb
      ? [
          ...CRUMBS.policy.map((crumb, index) =>
            index === CRUMBS.policy.length - 1
              ? { ...crumb, to: "policy" }
              : crumb,
          ),
          { label: policyEditorCrumb },
        ]
      : isPA && paCrumbs.length > 1
        ? [
            { label: "Home", to: "orders" },
            { label: "Finance", to: "orders" },
            ...paCrumbs.map((crumb, index) =>
              crumb.onClick ? { label: crumb.label, to: `pa:${index}` } : { label: crumb.label },
            ),
          ]
        : (screen === "binding" || screen === "bindingft") && bindingCrumbs.length > 1
          ? [
              { label: "Home", to: "orders" },
              { label: "Finance", to: "orders" },
              ...bindingCrumbs.map((crumb, index) =>
                crumb.onClick ? { label: crumb.label, to: `bd:${index}` } : { label: crumb.label },
              ),
            ]
        : screen === "rebuying" && rebuyCrumbs.length > 1
          ? [
              { label: "Home", to: "orders" },
              { label: "Finance", to: "orders" },
              ...rebuyCrumbs.map((crumb, index) =>
                crumb.onClick ? { label: crumb.label, to: `rb:${index}` } : { label: crumb.label },
              ),
            ]
        : screen === "contractualfine" && contractualFineCrumbs.length > 1
          ? [
              { label: "Home", to: "orders" },
              { label: "Finance", to: "orders" },
              ...contractualFineCrumbs.map((crumb, index) =>
                crumb.onClick ? { label: crumb.label, to: `cf:${index}` } : { label: crumb.label },
              ),
            ]
          : screen === "ciotrpps" && ciotCrumbs.length > 1
            ? [
                { label: "Home", to: "orders" },
                { label: "Common", to: "ciotrpps" },
                ...ciotCrumbs.map((crumb, index) =>
                  crumb.onClick ? { label: crumb.label, to: `cr:${index}` } : { label: crumb.label },
                ),
              ]
            : (screen === "tobaccopurchase" || screen === "tobaccoparameters") && tobaccoCrumbs.length > 0
              ? [
                  { label: "Home", to: "orders" },
                  { label: "Common", to: "ciotrpps" },
                  ...tobaccoCrumbs.map((crumb, index) =>
                    crumb.onClick && index < tobaccoCrumbs.length - 1 ? { label: crumb.label, to: `tp:${index}` } : { label: crumb.label },
                  ),
                ]
              : (CRUMBS[screen] ?? CRUMBS.orders)

  const navigateBreadcrumb = (to: string) => {
    if (to.startsWith("pa:")) {
      paCrumbs[Number(to.slice(3))]?.onClick?.()
      return
    }
    if (to.startsWith("tp:")) {
      tobaccoCrumbs[Number(to.slice(3))]?.onClick?.()
      return
    }
    if (to.startsWith("cr:")) {
      ciotCrumbs[Number(to.slice(3))]?.onClick?.()
      return
    }
    if (to.startsWith("bd:")) {
      bindingCrumbs[Number(to.slice(3))]?.onClick?.()
      return
    }
    if (to.startsWith("rb:")) {
      rebuyCrumbs[Number(to.slice(3))]?.onClick?.()
      return
    }
    if (to.startsWith("cf:")) {
      contractualFineCrumbs[Number(to.slice(3))]?.onClick?.()
      return
    }
    if (to === "policy" && policyEditorCrumb) {
      setPolicyEditorCrumb(null)
      setPolicyRestore(null)
      setPolicyViewVersion((version) => version + 1)
    }
    go(to)
  }

  const route: RouteState = {
    source,
    setSource,
    stops,
    setStops,
    dest,
    setDest,
    routeId,
    setRouteId,
  }

  return (
    <ToastProvider>
      <AppShell
        crumbs={activeCrumbs}
        onCrumb={navigateBreadcrumb}
        screen={screen}
        onNavigate={go}
      >
        {screen === "orders" && <PaymentOrders />}
        {isPA && paFrom && (
          <div className="mb-4"><Button variant="outline" onClick={() => { const b = paFrom; setPaFrom(null); setScreen(b) }}><ChevronLeft size={16} /> Back to {paFrom === "bindingft" ? "Binding FT Requests" : "Binding"}</Button></div>
        )}
        {isPA && (
          <PaymentAnalysis
            onCrumbs={setPaCrumbs}
            section={paSection}
            onSection={(s) => go(s === "logs" ? "pacreditlogs" : s === "simulator" ? "pasimulator" : s === "rules" ? "paclaimrules" : "paymentanalysis")}
          />
        )}
        {screen === "paparameters" && <PaymentAnalysisParameters />}
        {screen === "ruleactions" && <RuleActions />}
        {screen === "parameters" && <Parameters />}
        {screen === "policy" && (
          <PaymentPolicy
            key={policyViewVersion}
            onEditorChange={setPolicyEditorCrumb}
            restore={policyRestore}
            onRestoreApplied={() => setPolicyRestore(null)}
            onConfigure={(policy, positionTable, detail) => {
              setPositionPolicy({
                code: policy.code,
                name: policy.name,
                positionTable,
              })
              setPolicyRestore({ policy, detail })
              go("policypositions")
            }}
          />
        )}
        {screen === "policypositions" && positionPolicy && (
          <PaymentPolicyPositionTable
            policy={positionPolicy}
            onSave={(positionTable) => {
              if (policyRestore)
                setPolicyRestore({
                  ...policyRestore,
                  detail: { ...policyRestore.detail, positionTable },
                })
              go("policy")
            }}
          />
        )}
        {screen === "averageprice" && <AveragePrice />}
        {screen === "deductions" && <DeductionParameters />}
        {screen === "calendar" && <PaymentCalendar />}
        {screen === "types" && <PaymentOrderTypeConfig onNavigate={go} />}
        {screen === "routemap" && (
          <RouteMap
            route={route}
            onNavigate={go}
            onViewDistanceRoute={(selected) => {
              setDistanceRoute(selected)
              go("distanceroute")
            }}
          />
        )}
        {screen === "routemapupdated" && <RouteMapUpdated />}
        {(screen === "debttransfer" || screen === "debttransferrequests" || screen === "debttransferreports") && (
          <DebtTransfer
            initialTab={screen === "debttransferreports" ? "reports" : screen === "debttransferrequests" ? "requests" : "transfer"}
            onViewTransfer={(row) => {
              setDebtRow(row)
              go("debttransferdetail")
            }}
            onViewRequest={(request) => {
              setDebtRequest(request)
              go("debtrequestdetail")
            }}
            onCarryOver={(setup) => {
              setCarryOverSetup(setup)
              go("debtcarryover")
            }}
            onViewReport={(report) => {
              setDebtReport(report)
              go("debttransferreport")
            }}
          />
        )}
        {screen === "debttransferreport" && debtReport && (
          <DebtTransferReportDetail value={debtReport} />
        )}
        {screen === "debtreversal" && <DebtReversal onOpenPOReversal={() => { setPoReversalReturn(true); go("poreversal") }} />}
        {screen === "poreversal" && <POReversal onBack={poReversalReturn ? () => { setPoReversalReturn(false); go("debtreversal") } : undefined} />}
        {screen === "debttransferft" && (
          <DebtTransferFT
            requests={ftRequests}
            onRequest={() => go("debttransferftrequest")}
            onView={(request) => {
              setDebtRequest(request)
              go("debttransferftdetail")
            }}
          />
        )}
        {screen === "debttransferftrequest" && <DebtTransferFTRequest onBack={() => go("debttransferft")} onCreated={(request) => setFtRequests((requests) => [request, ...requests])} />}
        {screen === "debttransferparameters" && <DebtTransferParameters />}
        {(screen === "binding" || paFrom === "binding") && <div hidden={screen !== "binding"}><Binding onCrumbs={setBindingCrumbs} onOpenAnalysis={() => openPaFrom("binding")} /></div>}
        {(screen === "bindingft" || paFrom === "bindingft") && <div hidden={screen !== "bindingft"}><Binding key="ft" ft onCrumbs={setBindingCrumbs} onOpenAnalysis={() => openPaFrom("bindingft")} /></div>}
        {screen === "rebuying" && <Rebuying onCrumbs={setRebuyCrumbs} />}
        {screen === "contractualfine" && <ContractualFine onCrumbs={setContractualFineCrumbs} />}
        {screen === "ciotrpps" && <CiotRpps onCrumbs={setCiotCrumbs} />}
        {screen === "tobaccopurchase" && <TobaccoPurchase onCrumbs={setTobaccoCrumbs} />}
        {screen === "tobaccoparameters" && <TobaccoReportsParameters onCrumbs={setTobaccoCrumbs} />}
        {screen === "debttransferdetail" && debtRow && (
          <DebtTransferDetail
            value={debtRow}
            onBack={() => go("debttransfer")}
            onDone={() => go("debttransfer")}
          />
        )}
        {screen === "debtrequestdetail" && debtRequest && (
          <DebtRequestDetail
            value={debtRequest}
            onBack={() => go("debttransfer")}
            onDone={() => go("debttransfer")}
          />
        )}
        {screen === "debttransferftdetail" && debtRequest && (
          <DebtTransferFTDetail
            value={debtRequest}
            onBack={() => go("debttransferft")}
            onCancelRequest={(request) => {
              setFtRequests((requests) => requests.filter((item) => item.id !== request.id))
              go("debttransferft")
            }}
          />
        )}
        {screen === "debtcarryover" && carryOverSetup && (
          <DebtCarryOver
            value={carryOverSetup}
            onBack={() => go("debttransfer")}
            onDone={() => go("debttransfer")}
          />
        )}
        {screen === "distanceroute" && distanceRoute && (
          <DistanceRouteDetail
            value={distanceRoute}
            onSave={(next) => {
              setDistanceRoute(next)
              go("routemap")
            }}
          />
        )}
        {screen === "routes" && (
          <RouteSuggestions route={route} onNavigate={go} />
        )}
      </AppShell>
    </ToastProvider>
  )
}
