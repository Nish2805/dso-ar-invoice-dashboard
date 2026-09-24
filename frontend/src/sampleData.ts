// Entirely synthetic sample data for the offline demo build — no real business
// data of any kind. Generated deterministically (seeded PRNG) so the demo looks
// the same every time the file is opened.

export interface SampleRow {
  entity: string
  invoiceType: string
  trxClass: 'INV' | 'CM' | 'ONACC'
  customerName: string
  accountNo: string
  invoiceSource: string
  invoiceNo: string
  invoiceAmount: number
  trxDate: string // ISO yyyy-mm-dd
  lineNo: string
  lineType: 'LINE' | 'TAX'
}

// mulberry32 seeded PRNG — deterministic across loads.
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]

const ENTITIES = ['Innovation Hub BU', 'Tech Park Central BU', 'Enterprise Services BU']

const INVOICE_TYPES: { name: string; trxClass: SampleRow['trxClass'] }[] = [
  { name: 'Office Lease INV', trxClass: 'INV' },
  { name: 'Licensing INV', trxClass: 'INV' },
  { name: 'Service Fee INV', trxClass: 'INV' },
  { name: 'Warehouse Lease INV', trxClass: 'INV' },
  { name: 'Consulting INV', trxClass: 'INV' },
  { name: 'Membership INV', trxClass: 'INV' },
  { name: 'Equipment Lease INV', trxClass: 'INV' },
  { name: 'Support Services INV', trxClass: 'INV' },
  { name: 'Training INV', trxClass: 'INV' },
  { name: 'Facility Fee INV', trxClass: 'ONACC' },
  { name: 'Office Lease CM', trxClass: 'CM' },
  { name: 'Service Fee CM', trxClass: 'CM' },
  { name: 'Licensing CM', trxClass: 'CM' },
]

const CUSTOMERS = [
  'Nova Dynamics LLC', 'BrightPath Technologies', 'Meridian Holdings', 'Zenith Robotics FZE',
  'Falcon Digital Systems', 'Orbital Data Group', 'Crescent Innovations', 'Vantage Cloud Solutions',
  'Silverline Analytics', 'Quantum Bay Ventures', 'Horizon Software Labs', 'Apex Micro Devices',
  'BlueSky Logistics FZCO', 'Pinnacle BioTech', 'Coral Reef Media', 'Starline Manufacturing',
  'Everest Consulting Group', 'Lumen Networks LLC', 'Cobalt Energy Systems', 'Atlas Fintech',
  'Marina Trading Co.', 'Skyline Interiors LLC', 'Emerald Health Systems', 'Titan Precision Engineering',
  'NextGen AI Labs',
]

const SOURCES = ['Salesforce', 'Manual Entry', 'Portal Import', 'Migration', 'System Sync', 'Partner API']

function monthsBetween(startYear: number, startMonth: number, endYear: number, endMonth: number): [number, number][] {
  const out: [number, number][] = []
  let y = startYear
  let m = startMonth
  while (y < endYear || (y === endYear && m <= endMonth)) {
    out.push([y, m])
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

function generateRows(): SampleRow[] {
  const rows: SampleRow[] = []
  const periods = [...monthsBetween(2025, 1, 2025, 12), ...monthsBetween(2026, 1, 2026, 8)]

  let invoiceCounter = 100000

  for (const [year, month] of periods) {
    const invoicesPerMonth = 30 + Math.floor(rand() * 50) // varies ~30-80/month
    for (let i = 0; i < invoicesPerMonth; i++) {
      invoiceCounter += 1
      const invoiceNo = `SMP${year}${String(month).padStart(2, '0')}${invoiceCounter}`
      const entity = pick(ENTITIES)
      const type = pick(INVOICE_TYPES)
      const customer = pick(CUSTOMERS)
      const accountNo = String(300000 + CUSTOMERS.indexOf(customer) * 137)
      const source = pick(SOURCES)
      const day = 1 + Math.floor(rand() * 27)
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      const magnitude = type.trxClass === 'CM' ? -1 : 1
      const baseAmount = Math.round((200 + rand() * 45000) * magnitude * 100) / 100
      // occasional large outlier invoices, feeds the "exceptions" panel meaningfully
      const amount = rand() > 0.97 ? Math.round(baseAmount * 12 * 100) / 100 : baseAmount

      rows.push({
        entity,
        invoiceType: type.name,
        trxClass: type.trxClass,
        customerName: customer,
        accountNo,
        invoiceSource: source,
        invoiceNo,
        invoiceAmount: amount,
        trxDate: date,
        lineNo: `${invoiceCounter}-1`,
        lineType: 'LINE',
      })

      if (rand() > 0.4) {
        rows.push({
          entity,
          invoiceType: type.name,
          trxClass: type.trxClass,
          customerName: customer,
          accountNo,
          invoiceSource: source,
          invoiceNo,
          invoiceAmount: 0,
          trxDate: date,
          lineNo: `${invoiceCounter}-2`,
          lineType: 'TAX',
        })
      }
    }
  }

  return rows
}

export const SAMPLE_ROWS: SampleRow[] = generateRows()
