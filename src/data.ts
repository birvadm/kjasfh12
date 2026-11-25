import type { Dispatch, SetStateAction } from 'react'

export type PoType = { code: string; label: string }

export const PO_TYPES: PoType[] = [
  { code: '1', label: '1 Tobacco' },
  { code: '2', label: '2 Freight' },
  { code: '10', label: '10 Afubra' },
  { code: '11', label: '11 Third party' },
  { code: '12', label: '12 Other PO Type 2' },
]

export type AdjRow = {
  id: string
  po: string
  type: string
  recipient: string
  amount: number
  emission: string
  poDate: string
  expected: string
  onPolicy: string
  transmitted: boolean
  flagged?: boolean
}

export const ADJ_ROWS: AdjRow[] = [
  { id: 'a1', po: '7801642', type: '1 Tobacco', recipient: 'Producer A', amount: 122.11, emission: '04-08-2026', poDate: '10-08-2026', expected: '10-08-2026', onPolicy: 'Yes', transmitted: false },
  { id: 'a2', po: '7801643', type: '1 Tobacco', recipient: 'Producer B', amount: 4200.0, emission: '04-08-2026', poDate: '10-08-2026', expected: '10-08-2026', onPolicy: 'Yes', transmitted: false },
  { id: 'a3', po: '7801644', type: '2 Freight', recipient: 'Transporter C', amount: 6000.0, emission: '04-08-2026', poDate: '07-08-2026', expected: '10-08-2026', onPolicy: 'No', transmitted: false, flagged: true },
  { id: 'a4', po: '7801602', type: '1 Tobacco', recipient: 'Producer D', amount: 9880.0, emission: '03-08-2026', poDate: '07-08-2026', expected: '07-08-2026', onPolicy: 'Yes', transmitted: true },
  { id: 'a5', po: '7801655', type: '11 Third party', recipient: 'Supplier E', amount: 275000.0, emission: '04-08-2026', poDate: '11-08-2026', expected: '11-08-2026', onPolicy: 'Yes', transmitted: false, flagged: true },
]

export type ChangeLog = { when: string; user: string; field: string; from: string; to: string; approvedBy: string; approved: string }

export const CHANGE_LOG: Record<string, ChangeLog[]> = {
  '7801644': [
    { when: '04-08-2026 16:20', user: 'System', field: 'PO date', from: '-', to: '10-08-2026', approvedBy: '-', approved: '-' },
    { when: '05-08-2026 09:12', user: 'B. Rocha', field: 'PO date', from: '10-08-2026', to: '07-08-2026', approvedBy: 'S. Vogt', approved: '05-08-2026 10:04' },
    { when: '05-08-2026 11:47', user: 'B. Rocha', field: 'Comment', from: '-', to: 'Field technician request', approvedBy: '-', approved: '-' },
  ],
}

export type RevRow = {
  id: string
  po: string
  type: string
  recipient: string
  kind: string
  amount: number
  poDate: string
  bank: string
  account: string
  status: string
}

export const REV_ROWS: RevRow[] = [
  { id: 'r1', po: '7801644', type: '2 Freight', recipient: 'Transporter C', kind: 'Transporter', amount: 6000.0, poDate: '07/08', bank: '748 / 0403-G', account: '89148-5', status: 'Transmitted' },
  { id: 'r2', po: '7801651', type: '11 Third party', recipient: 'Supplier E', kind: 'Supplier', amount: 2410.0, poDate: '07/08', bank: '001 / 0617-3', account: '11902-0', status: 'Transmitted' },
  { id: 'r3', po: '7801602', type: '1 Tobacco', recipient: 'Producer D', kind: 'Producer', amount: 9880.0, poDate: '07/08', bank: '041 / 0870-8', account: '20117-6', status: 'Transmitted' },
]

export type CalRow = { code: string; type: string; rule: string; validFrom: string; highlight?: boolean }

export const CAL_ROWS: CalRow[] = [
  { code: '1', type: '1 Tobacco', rule: '4 days', validFrom: '01/01/26' },
  { code: '2', type: '2 Freight', rule: '4 days', validFrom: '01/01/26' },
  { code: '10', type: '10 Afubra', rule: 'Sun-Sat, pay Tue', validFrom: '01/01/26', highlight: true },
  { code: '11', type: '11 Third party', rule: 'Fixed days', validFrom: '01/01/26' },
]

export type Holiday = { id: string; date: string; description: string; scope: string; state: string; municipality: string; appliesTo: string }

export const HOLIDAYS: Holiday[] = [
  { id: 'h1', date: '07/09/2026', description: 'Independência', scope: 'National', state: '-', municipality: '-', appliesTo: 'All types' },
  { id: 'h2', date: '20/09/2026', description: 'Revolução Farroupilha', scope: 'State', state: 'RS', municipality: '-', appliesTo: 'All types' },
  { id: 'h3', date: '15/10/2026', description: 'Aniversário do município', scope: 'Municipal', state: 'RS', municipality: 'Santa Cruz do Sul', appliesTo: '2 Freight' },
]

export type TypeRow = {
  code: string
  type: string
  english: string
  calendar: string
  fixedDates?: string[]
  validTill: string
  limit: string
  closing: 'Yes' | 'No - separate closing' | 'To confirm'
  registered: boolean
}

export const TYPE_ROWS: TypeRow[] = [
  { code: '1', type: 'Tabaco', english: 'Tobacco', calendar: '4 days', validTill: '31/12/2026', limit: '200,000', closing: 'Yes', registered: true },
  { code: '2', type: 'Frete', english: 'Freight', calendar: '4 days', validTill: '31/12/2026', limit: '50,000', closing: 'Yes', registered: true },
  { code: '3', type: 'Recursos Próprios Cia.', english: 'Company Payments', calendar: 'Not registered', validTill: '-', limit: '-', closing: 'Yes', registered: false },
  { code: '4', type: 'Sistema Débito/Crédito', english: 'Debit/Credit', calendar: 'Not registered', validTill: '-', limit: '-', closing: 'Yes', registered: false },
  { code: '5', type: 'Custeio Financiado', english: 'Financing Cash', calendar: 'Not registered', validTill: '-', limit: '-', closing: 'Yes', registered: false },
  { code: '6', type: 'Investimento Financiado', english: 'Financing Investments', calendar: 'Not registered', validTill: '-', limit: '-', closing: 'Yes', registered: false },
  { code: '7', type: 'Honorários', english: 'Lawyer Fees', calendar: 'Not registered', validTill: '-', limit: '-', closing: 'Yes', registered: false },
  { code: '8', type: 'Custas Judiciais', english: 'Court Fees', calendar: 'Not registered', validTill: '-', limit: '-', closing: 'Yes', registered: false },
  { code: '9', type: 'Reembolso Contratual', english: 'Contractual Reimbursements', calendar: 'Not registered', validTill: '-', limit: '-', closing: 'Yes', registered: false },
  { code: '10', type: 'AFUBRA', english: 'AFUBRA', calendar: 'Sun-Sat, Tue', validTill: '31/12/2026', limit: '50,000', closing: 'No - separate closing', registered: true },
  { code: '11', type: 'Insumos Terceiros', english: 'Third Party Supplies', calendar: 'Fixed days', fixedDates: ['08/08/2026', '15/08/2026', '15/12/2026'], validTill: '31/12/2026', limit: '30,000', closing: 'Yes', registered: true },
  { code: '12', type: 'Rebate Pronaf C', english: 'Rebate Pronaf C', calendar: 'Not registered', validTill: '-', limit: '-', closing: 'To confirm', registered: false },
]

export type Farmer = { name: string; city: string }

// Shared route-planning state, lifted to App so the Route Map screen and the
// Suggested Routes screen stay in sync.
export type RouteState = {
  source: Farmer
  setSource: (f: Farmer) => void
  stops: Farmer[]
  setStops: Dispatch<SetStateAction<Farmer[]>>
  dest: Farmer
  setDest: (f: Farmer) => void
  routeId: string
  setRouteId: (id: string) => void
}

export const ROUTE_SOURCE: Farmer = {
  name: 'Transporter Base',
  city: 'Santa Cruz do Sul - RS',
}
export const ROUTE_DEST: Farmer = {
  name: 'Posto de Compra',
  city: 'Santa Cruz do Sul - RS',
}

// Buying / billing stations the route can end at (searchable destination).
export const DEST_CATALOG: Farmer[] = [
  { name: 'Posto de Compra', city: 'Santa Cruz do Sul - RS' },
  { name: 'Armazém Vale do Sol', city: 'Vale do Sol - RS' },
  { name: 'Unidade Rio Pardo', city: 'Rio Pardo - RS' },
  { name: 'Estação Venâncio Aires', city: 'Venâncio Aires - RS' },
]

export const TRANSPORTERS: Farmer[] = [
  { name: 'Transporter Base', city: 'Santa Cruz do Sul - RS' },
  { name: 'Sul Cargas', city: 'Lajeado - RS' },
  { name: 'Vale Log Transportes', city: 'Venâncio Aires - RS' },
  { name: 'RS Freight', city: 'Rio Pardo - RS' },
  { name: 'Pampa Logística', city: 'Cachoeira do Sul - RS' },
]

export const ROUTE_FARMERS: Farmer[] = [
  { name: 'Tiago Oliveira', city: 'Vera Cruz - RS' },
  { name: 'Mateus Ferreira', city: 'Candelária - RS' },
  { name: 'Lucas Schneider', city: 'Venâncio Aires - RS' },
]

export const FARMER_CATALOG: Farmer[] = [
  { name: 'Rafael Bortolini', city: 'Sinimbu - RS' },
  { name: 'Helena Kunz', city: 'Vale do Sol - RS' },
  { name: 'Bruno Wagner', city: 'Passo do Sobrado - RS' },
  { name: 'Camila Reis', city: 'Rio Pardo - RS' },
  { name: 'Otávio Lima', city: 'Herveiras - RS' },
]

// Mock: each transporter serves a different set of farmers, so switching
// the source transporter re-plans the intermediate stops.
export const STOPS_BY_TRANSPORTER: Record<string, Farmer[]> = {
  'Transporter Base': ROUTE_FARMERS,
  'Sul Cargas': [
    { name: 'Helena Kunz', city: 'Vale do Sol - RS' },
    { name: 'Tiago Oliveira', city: 'Vera Cruz - RS' },
    { name: 'Camila Reis', city: 'Rio Pardo - RS' },
  ],
  'Vale Log Transportes': [
    { name: 'Rafael Bortolini', city: 'Sinimbu - RS' },
    { name: 'Lucas Schneider', city: 'Venâncio Aires - RS' },
  ],
  'RS Freight': [
    { name: 'Camila Reis', city: 'Rio Pardo - RS' },
    { name: 'Mateus Ferreira', city: 'Candelária - RS' },
    { name: 'Otávio Lima', city: 'Herveiras - RS' },
    { name: 'Bruno Wagner', city: 'Passo do Sobrado - RS' },
  ],
  'Pampa Logística': [
    { name: 'Bruno Wagner', city: 'Passo do Sobrado - RS' },
    { name: 'Tiago Oliveira', city: 'Vera Cruz - RS' },
  ],
}

export type TollRow = {
  plaza: string
  road: string
  kind: string
  car: string
  lcv: string
  truck2: string
  truck3: string
}

export const TOLL_ROWS: TollRow[] = [
  { plaza: 'Vera Cruz Plaza', road: 'RS-287', kind: 'State Concession', car: 'R$ 12.50', lcv: 'R$ 18.80', truck2: 'R$ 26.40', truck3: 'R$ 39.60' },
  { plaza: 'Candelária Plaza', road: 'RS-287', kind: 'State Concession', car: 'R$ 13.20', lcv: 'R$ 19.80', truck2: 'R$ 27.80', truck3: 'R$ 41.70' },
  { plaza: 'Venâncio Aires Plaza', road: 'RSC-287', kind: 'State Concession', car: 'R$ 11.80', lcv: 'R$ 17.70', truck2: 'R$ 24.90', truck3: 'R$ 37.40' },
  { plaza: 'Santa Cruz do Sul Plaza', road: 'RSC-287', kind: 'State Concession', car: 'R$ 9.50', lcv: 'R$ 14.20', truck2: 'R$ 20.00', truck3: 'R$ 30.60' },
]

// System-suggested route options per transporter. Each option is a distinct
// combination the optimizer returns; the user can pick one and the Toll
// Details / map reflect exactly the plazas that option passes (by TOLL_ROWS index).
export type TollRouteOption = {
  id: string
  label: string
  tag: string
  distanceKm: number
  durationMin: number
  tollIdx: number[]
}

export const TOLL_ROUTE_OPTIONS: Record<string, TollRouteOption[]> = {
  'Transporter Base': [
    { id: 'fast', label: 'Fastest route', tag: 'Via RS-287', distanceKm: 98.13, durationMin: 154, tollIdx: [0, 1, 2] },
    { id: 'cheap', label: 'Fewer tolls', tag: 'Bypasses 2 plazas', distanceKm: 112.4, durationMin: 178, tollIdx: [3] },
    { id: 'free', label: 'Toll-free', tag: 'Local roads only', distanceKm: 121.9, durationMin: 205, tollIdx: [] },
  ],
  'Sul Cargas': [
    { id: 'fast', label: 'Fastest route', tag: 'Via RS-287', distanceKm: 84.6, durationMin: 132, tollIdx: [0, 1] },
    { id: 'free', label: 'Toll-free', tag: 'Local roads only', distanceKm: 96.2, durationMin: 168, tollIdx: [] },
  ],
  'Vale Log Transportes': [
    { id: 'fast', label: 'Fastest route', tag: 'Via RSC-287', distanceKm: 61.3, durationMin: 98, tollIdx: [2] },
    { id: 'cheap', label: 'Fewer tolls', tag: 'Bypasses plaza', distanceKm: 69.8, durationMin: 121, tollIdx: [] },
  ],
  'RS Freight': [
    { id: 'fast', label: 'Fastest route', tag: 'Via RS-287', distanceKm: 108.7, durationMin: 171, tollIdx: [1, 2, 3] },
    { id: 'cheap', label: 'Fewer tolls', tag: 'Bypasses 2 plazas', distanceKm: 124.5, durationMin: 199, tollIdx: [3] },
    { id: 'free', label: 'Toll-free', tag: 'Local roads only', distanceKm: 133.1, durationMin: 228, tollIdx: [] },
  ],
  'Pampa Logística': [
    { id: 'fast', label: 'Fastest route', tag: 'Via RS-287', distanceKm: 73.9, durationMin: 118, tollIdx: [0, 3] },
    { id: 'free', label: 'Toll-free', tag: 'Local roads only', distanceKm: 88.4, durationMin: 156, tollIdx: [] },
  ],
}

export const OVERRIDE_REASONS = [
  'Road Closure / Diversion',
  'Route Restriction',
  'Temporary Road Condition',
  'Operational Requirement',
  'Other',
]

export const money = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
