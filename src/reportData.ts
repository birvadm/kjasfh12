// Emission-date-view report data (Level 1 → Level 4 drill-down).
// Mirrors the reference report: by PO type → by bank → by agency → the orders.

export const money = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const REPORT_FILTER = 'Emission date 03/08 to 04/08/2026'

/* ------------------------------ Level 1 ------------------------------ */
/* By payment order type — this level is also the reconciliation.       */

export type L1Row = {
  id: string
  type: string
  count: number
  orders: number
  generated: number
  diff: number
  pct: number
  dateExc: number
  overLimit: number
  status: 'Check' | 'OK'
  flag: boolean
  drill: boolean
}

export const LEVEL1: L1Row[] = [
  { id: '1', type: '1 Tobacco', count: 412, orders: 1185548.48, generated: 1185548.48, diff: 0, pct: 0, dateExc: 1, overLimit: 1, status: 'Check', flag: true, drill: true },
  { id: '2', type: '2 Freight', count: 61, orders: 234311.98, generated: 334311.98, diff: -100000, pct: -29.9, dateExc: 2, overLimit: 0, status: 'Check', flag: true, drill: false },
  { id: '11', type: '11 Third party', count: 41, orders: 59550.32, generated: 59550.32, diff: 0, pct: 0, dateExc: 0, overLimit: 0, status: 'OK', flag: false, drill: false },
]

export const LEVEL1_TOTAL = {
  count: 514,
  orders: 1479410.78,
  generated: 1579410.78,
  diff: -100000,
  pct: -6.3,
  dateExc: 3,
  overLimit: 1,
}

export const LEVEL1_NOTES = [
  'Everything emitted in the range, whatever date it is scheduled to pay. Freight is short by 100,000.00 and carries two date exceptions. Tobacco reconciles but has one date exception and one payment order above the limit for its type.',
  'Source of the generated figure: tobacco from purchases closed in the range, freight from freight IDs generated in the range, third party from postings in the registered period. Types 3 to 9 still to be defined.',
]

/* ------------------------------ Level 2 ------------------------------ */
/* By bank — matches the split used by the transmission files.          */

export type L2Row = {
  id: string
  bank: string
  name: string
  count: number
  amount: number
  dateExc: number
  overLimit: number
  flag: boolean
  drill: boolean
}

export const LEVEL2: Record<string, { subtitle: string; rows: L2Row[]; note: string }> = {
  '1': {
    subtitle: 'Opened from payment order type 1 Tobacco. 412 payment orders, 1,185,548.48',
    note: 'This level matches the split used by the transmission files, one per bank, so the figures tie straight to what is sent. The exception and the over limit order are both in Banrisul.',
    rows: [
      { id: '001', bank: '001', name: 'Banco do Brasil', count: 96, amount: 231693.2, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '041', bank: '041', name: 'Banrisul', count: 152, amount: 595811.1, dateExc: 1, overLimit: 1, flag: true, drill: true },
      { id: '133', bank: '133', name: 'Cresol', count: 41, amount: 72959.8, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '341', bank: '341', name: 'Itau', count: 2, amount: 3.08, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '748', bank: '748', name: 'Sicredi', count: 98, amount: 274614.69, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '756', bank: '756', name: 'Bancoob', count: 23, amount: 10466.61, dateExc: 0, overLimit: 0, flag: false, drill: false },
    ],
  },
}

/* ------------------------------ Level 3 ------------------------------ */
/* By agency — the agency key is the full code including check char.     */

export type L3Row = {
  id: string
  agency: string
  name: string
  count: number
  amount: number
  dateExc: number
  overLimit: number
  flag: boolean
  drill: boolean
}

export const LEVEL3: Record<
  string,
  { subtitle: string; rows: L3Row[]; total: { count: number; amount: number; dateExc: number; overLimit: number }; note: string }
> = {
  '1/041': {
    subtitle: 'Opened from bank 041 Banrisul. 152 payment orders, 595,811.10',
    note: 'The agency key is the full code including the check character. Sicredi and Bancoob use a letter rather than a digit, and the same numeric part appears with different check characters and different names — 748/0156-B is Vera Cruz, 748/0156-D is Passo do Sobrado. Grouping on the numeric part alone merges two agencies.',
    total: { count: 152, amount: 595811.1, dateExc: 1, overLimit: 1 },
    rows: [
      { id: '041/0167-2', agency: '041/0167-2', name: 'Cangucu', count: 4, amount: 231480.0, dateExc: 1, overLimit: 1, flag: true, drill: true },
      { id: '041/0191-8', agency: '041/0191-8', name: 'Cruzeiro do Sul', count: 18, amount: 36596.75, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '041/0870-8', agency: '041/0870-8', name: 'Sao Lourenco do Sul', count: 130, amount: 327734.35, dateExc: 0, overLimit: 0, flag: false, drill: false },
    ],
  },
}

/* ------------------------------ Level 4 ------------------------------ */
/* The payment orders themselves.                                        */

export type L4Row = {
  id: string
  po: string
  recipient: string
  account: string
  amount: number
  emission: string
  expected: string
  poDate: string
  onPolicy: string
  overLimit: string
  flag: boolean
}

export const LEVEL4: Record<
  string,
  { subtitle: string; rows: L4Row[]; total: number; note: string }
> = {
  '1/041/041/0167-2': {
    subtitle: 'Opened from agency 041/0167-2. Four payment orders, 231,480.00',
    note: 'This is the payment order itself, not a group. 7801620 is at 214,500.00 against the 200,000.00 limit registered for tobacco, so it is flagged for the analyst to confirm the amount is real — it is not blocked and the closing carries on. 7801623 sits on 11/08 when its calendar says 10/08, with nothing marked manual, so it is a fault rather than an approved exception. The two orders emitted 03/08 are due 07/08 and the two emitted 04/08 are due 10/08, which is why emission date is a column.',
    total: 231480.0,
    rows: [
      { id: '7801620', po: '7801620', recipient: 'Producer M', account: '22014-5', amount: 214500.0, emission: '03/08', expected: '07/08', poDate: '07/08', onPolicy: 'Yes', overLimit: 'Above 200,000', flag: true },
      { id: '7801621', po: '7801621', recipient: 'Producer N', account: '18330-2', amount: 8900.0, emission: '03/08', expected: '07/08', poDate: '07/08', onPolicy: 'Yes', overLimit: '', flag: false },
      { id: '7801622', po: '7801622', recipient: 'Producer P', account: '47712-9', amount: 5180.0, emission: '04/08', expected: '10/08', poDate: '10/08', onPolicy: 'Yes', overLimit: '', flag: false },
      { id: '7801623', po: '7801623', recipient: 'Producer Q', account: '60155-4', amount: 2900.0, emission: '04/08', expected: '10/08', poDate: '11/08', onPolicy: 'No - late', overLimit: '', flag: true },
    ],
  },
}

/* ==================================================================== */
/* PO-DATE VIEW — same four levels, sliced by payment order date.       */
/* No generated / difference columns; the leaf carries a Manual column. */
/* ==================================================================== */

export const PO_REPORT_FILTER = 'Payment order date 10/08/2026'

export type POL1Row = {
  id: string
  type: string
  count: number
  orders: number
  dateExc: number
  overLimit: number
  status: 'Check' | 'OK'
  flag: boolean
  drill: boolean
}

export const PO_LEVEL1: POL1Row[] = [
  { id: '1', type: '1 Tobacco', count: 409, orders: 959248.48, dateExc: 0, overLimit: 0, status: 'OK', flag: false, drill: false },
  { id: '2', type: '2 Freight', count: 58, orders: 220227.03, dateExc: 1, overLimit: 0, status: 'Check', flag: true, drill: true },
  { id: '11', type: '11 Third party', count: 41, orders: 59550.32, dateExc: 0, overLimit: 0, status: 'OK', flag: false, drill: false },
]

export const PO_LEVEL1_TOTAL = { count: 508, orders: 1239025.83, dateExc: 1, overLimit: 0 }

export const PO_LEVEL2: Record<string, { subtitle: string; rows: L2Row[] }> = {
  '2': {
    subtitle: 'Opened from payment order type 2 Freight. 58 payment orders, 220,227.03',
    rows: [
      { id: '001', bank: '001', name: 'Banco do Brasil', count: 12, amount: 73291.33, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '041', bank: '041', name: 'Banrisul', count: 5, amount: 19126.44, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '133', bank: '133', name: 'Cresol', count: 6, amount: 12345.22, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '341', bank: '341', name: 'Itau', count: 2, amount: 5000.0, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '748', bank: '748', name: 'Sicredi', count: 15, amount: 35857.47, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '756', bank: '756', name: 'Bancoob', count: 18, amount: 74606.57, dateExc: 1, overLimit: 0, flag: true, drill: true },
    ],
  },
}

export const PO_LEVEL3: Record<
  string,
  { subtitle: string; rows: L3Row[]; total: { count: number; amount: number; dateExc: number; overLimit: number } }
> = {
  '2/756': {
    subtitle: 'Opened from bank 756 Bancoob. 18 payment orders, 74,606.57',
    total: { count: 18, amount: 74606.57, dateExc: 1, overLimit: 0 },
    rows: [
      { id: '756/3031-B', agency: '756/3031-B', name: 'Irineopolis', count: 2, amount: 8400.0, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '756/3034-C', agency: '756/3034-C', name: 'Ituporanga', count: 4, amount: 18966.61, dateExc: 1, overLimit: 0, flag: true, drill: true },
      { id: '756/3035-B', agency: '756/3035-B', name: 'Mafra', count: 5, amount: 23603.65, dateExc: 0, overLimit: 0, flag: false, drill: false },
      { id: '756/3084-A', agency: '756/3084-A', name: 'Santa Teresinha', count: 7, amount: 23636.31, dateExc: 0, overLimit: 0, flag: false, drill: false },
    ],
  },
}

export const PO_LEVEL4: Record<string, { subtitle: string; rows: L4Row[]; total: number }> = {
  '2/756/756/3034-C': {
    subtitle: 'Opened from agency 756/3034-C. Four payment orders, 18,966.61',
    total: 18966.61,
    rows: [
      { id: '7801710', po: '7801710', recipient: 'Transporter H', account: '44210-1', amount: 6200.0, emission: '04/08', expected: '10/08', poDate: '10/08', onPolicy: 'Yes', overLimit: '', flag: false },
      { id: '7801711', po: '7801711', recipient: 'Transporter J', account: '51188-3', amount: 4150.0, emission: '04/08', expected: '10/08', poDate: '10/08', onPolicy: 'Yes', overLimit: '', flag: false },
      { id: '7801712', po: '7801712', recipient: 'Transporter K', account: '22907-0', amount: 5400.0, emission: '03/08', expected: '07/08', poDate: '10/08', onPolicy: 'No - late', overLimit: '', flag: true },
      { id: '7801713', po: '7801713', recipient: 'Transporter L', account: '30554-8', amount: 3216.61, emission: '04/08', expected: '10/08', poDate: '10/08', onPolicy: 'Yes', overLimit: '', flag: false },
    ],
  },
}

/* Default drill anchors so the Level filter can jump straight to a slice. */
export const REPORT_ANCHORS: Record<'emission' | 'po', string[]> = {
  emission: ['1', '041', '041/0167-2'],
  po: ['2', '756', '756/3034-C'],
}

/* ------------------------- Summary report notes ------------------------- */
/* The summary report is Level 1, and its footnotes differ per view.        */

export const SUMMARY_NOTES: Record<'emission' | 'po', { lead?: string; body: string }[]> = {
  emission: [
    {
      body: 'Everything emitted in the range, whatever date it is scheduled to pay. Freight is short by 100,000.00 and carries two date exceptions. Tobacco reconciles but has one date exception and one payment order above the limit for its type.',
    },
    {
      lead: 'Source of the generated figure:',
      body: 'tobacco from purchases closed in the range, freight from freight IDs generated in the range, third party from postings in the registered period. Types 3 to 9 still to be defined.',
    },
  ],
  po: [
    {
      lead: 'No generated or difference column here.',
      body: 'Those compare against what a day produced, and this view is not a day of production — it is a day of payment, holding orders emitted on several different dates.',
    },
    {
      body: 'The two views reconcile. The emission range 03/08 to 04/08 held 514 payment orders. Six of them pay on other dates — five on 07/08 and one on 11/08 — which leaves the 508 shown here. Nothing appears in one view and vanishes from the other. The tobacco order above the limit and the late one are both among those six, which is why this view shows neither.',
    },
  ],
}

/* --------------------- Emission — tracing the difference --------------------- */
/* Fifth report, emission view only. Traces the freight shortfall on the       */
/* source records (freight IDs that produced no payment order).                */

export type TraceRow = {
  id: string
  source: string
  reference: string
  emission: string
  counterparty: string
  amount: number
  status: string
}

export const TRACE_LEAD = 'Generated 334,311.98, scheduled 234,311.98, difference 100,000.00.'
export const TRACE_INTRO =
  'The system takes the freight IDs closed in the emission range, removes those that produced a payment order, and lists what is left. These are the records that should have been paid and were not.'

export const TRACE_ROWS: TraceRow[] = [
  { id: 't1', source: 'Freight ID', reference: 'FR-2026-084412', emission: '04/08', counterparty: 'Transporter E', amount: 42300.0, status: 'No payment order generated' },
  { id: 't2', source: 'Freight ID', reference: 'FR-2026-084418', emission: '04/08', counterparty: 'Transporter F', amount: 31150.0, status: 'No payment order generated' },
  { id: 't3', source: 'Freight ID', reference: 'FR-2026-084431', emission: '04/08', counterparty: 'Transporter G', amount: 18900.0, status: 'No payment order generated' },
  { id: 't4', source: 'Freight ID', reference: 'FR-2026-084437', emission: '04/08', counterparty: 'Transporter E', amount: 7650.0, status: 'No payment order generated' },
]

export const TRACE_TOTAL = { amount: 100000.0, records: 4 }

export const TRACE_FOOT_LEAD = 'Source key by type:'
export const TRACE_FOOT =
  'freight by freight ID, tobacco by purchase invoice, third party by posting. Keys for types 3 to 9 to be defined. On the emission date view this is the only cause a difference can have — a payment order that exists is always in the report, whatever date it is scheduled for.'
