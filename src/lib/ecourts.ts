// eCourts India API integration
// Mock data now — replace API_KEY and switch fetchReal() when credentials are ready

import type { ECourtCase, CauseListResult, CauseListItem } from '@/types'

const API_BASE = process.env.ECOURTS_API_BASE_URL || 'https://api.ecourtsindia.com/v1'
const API_KEY  = process.env.ECOURTS_API_KEY || ''

// ── Mock Data ────────────────────────────────────────────────────
const MOCK_CASES: ECourtCase[] = [
  {
    cnr: 'TNHC01-004521-2023',
    case_no: 'WP 4521/2023',
    case_type: 'Writ Petition',
    filing_date: '2023-03-15',
    petitioner: 'M. Ramachandran',
    respondent: 'Union of India & Ors.',
    court: 'Madras High Court',
    judge: 'Hon. Justice K. Srinivasan & Justice S. Meenakshi',
    next_hearing: '2025-04-28',
    item_no: 14,
    orders: [
      { date: '2024-11-20', order_no: 'Order-1', download_url: '#' },
      { date: '2025-02-10', order_no: 'Order-2', download_url: '#' },
    ],
  },
  {
    cnr: 'TNHC01-008801-2024',
    case_no: 'WP 8801/2024',
    case_type: 'Writ Petition',
    filing_date: '2024-01-22',
    petitioner: 'Saravanan & Co.',
    respondent: 'TANGEDCO & Ors.',
    court: 'Madras High Court',
    judge: 'Hon. Justice P. Rajan',
    next_hearing: '2025-04-30',
    item_no: 27,
    orders: [
      { date: '2025-01-08', order_no: 'Order-1', download_url: '#' },
    ],
  },
  {
    cnr: 'TNCC01-000113-2024',
    case_no: 'OS 113/2024',
    case_type: 'Original Suit',
    filing_date: '2024-02-10',
    petitioner: 'Priya Subramaniam',
    respondent: 'Karthikeyan & Ors.',
    court: 'City Civil Court, Chennai',
    judge: 'Hon. Principal Judge',
    next_hearing: '2025-05-12',
    item_no: 8,
    orders: [],
  },
]

const MOCK_CAUSE_LIST: CauseListItem[] = [
  { item_no: 1,  case_no: 'WP 1122/2024', cnr: 'TNHC01-001122-2024', petitioner: 'K. Annamalai',     respondent: 'State of TN',      advocate: 'M.S. Dhurai',       purpose: 'Hearing' },
  { item_no: 2,  case_no: 'WP 2234/2024', cnr: 'TNHC01-002234-2024', petitioner: 'V. Shanmugam',     respondent: 'Revenue Dept.',    advocate: 'R. Muthukumar',     purpose: 'Arguments' },
  { item_no: 3,  case_no: 'WP 3345/2023', cnr: 'TNHC01-003345-2023', petitioner: 'Lakshmi Devi',     respondent: 'Corporation',      advocate: 'S. Venkataraman',   purpose: 'Orders' },
  { item_no: 14, case_no: 'WP 4521/2023', cnr: 'TNHC01-004521-2023', petitioner: 'M. Ramachandran',  respondent: 'Union of India',   advocate: 'R. Krishnamurthy', purpose: 'Hearing' },
  { item_no: 22, case_no: 'WP 6677/2024', cnr: 'TNHC01-006677-2024', petitioner: 'Tamil Nadu Mills', respondent: 'Commercial Tax',   advocate: 'P. Thillai',        purpose: 'Hearing' },
  { item_no: 27, case_no: 'WP 8801/2024', cnr: 'TNHC01-008801-2024', petitioner: 'Saravanan & Co.',  respondent: 'TANGEDCO',         advocate: 'R. Krishnamurthy', purpose: 'Arguments' },
  { item_no: 38, case_no: 'WP 9900/2024', cnr: 'TNHC01-009900-2024', petitioner: 'R. Gopalakrishnan',respondent: 'Highways Dept.',  advocate: 'N. Natarajan',      purpose: 'Admission' },
]

// ── Service Functions ────────────────────────────────────────────

export async function searchCaseByCNR(cnr: string): Promise<ECourtCase | null> {
  if (!API_KEY) {
    // Mock: find by CNR or case_no
    const found = MOCK_CASES.find(
      (c) => c.cnr.toLowerCase() === cnr.toLowerCase() ||
             c.case_no.toLowerCase().includes(cnr.toLowerCase())
    )
    return found || null
  }

  // Real API call (uncomment when API key is ready)
  // const res = await fetch(`${API_BASE}/case/cnr/${cnr}`, {
  //   headers: { 'Authorization': `Bearer ${API_KEY}` }
  // })
  // if (!res.ok) return null
  // return res.json()
  return null
}

export async function searchCaseByParty(name: string): Promise<ECourtCase[]> {
  if (!API_KEY) {
    const q = name.toLowerCase()
    return MOCK_CASES.filter(
      (c) =>
        c.petitioner.toLowerCase().includes(q) ||
        c.respondent.toLowerCase().includes(q) ||
        c.case_no.toLowerCase().includes(q)
    )
  }
  // Real: GET /cases?party=name
  return []
}

export async function getCauseList(
  court: string,
  date: string,
  bench?: string
): Promise<CauseListResult> {
  if (!API_KEY) {
    return {
      court,
      date,
      bench: bench || 'All Benches',
      items: MOCK_CAUSE_LIST,
    }
  }
  // Real: GET /causelist?court=&date=&bench=
  return { court, date, bench: bench || '', items: [] }
}

export async function getNextHearing(cnr: string): Promise<string | null> {
  if (!API_KEY) {
    const c = MOCK_CASES.find((c) => c.cnr === cnr)
    return c?.next_hearing || null
  }
  return null
}

export async function downloadOrder(cnr: string, orderNo: string): Promise<string | null> {
  if (!API_KEY) {
    return '#mock-order-download'
  }
  // Real: GET /order/download?cnr=&order=
  return null
}
