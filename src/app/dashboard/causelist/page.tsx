'use client'
import { useState } from 'react'
import { getCauseList, searchCaseByCNR, searchCaseByParty } from '@/lib/ecourts'
import { formatDate, COURTS } from '@/lib/utils'
import { PageHeader, Button, Card, CardBody, Badge, HearingChip, FormGroup, Input, Select } from '@/components/ui'

export default function CauseListPage() {
  const [court, setCourt]     = useState('Madras High Court')
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0])
  const [bench, setBench]     = useState('')
  const [query, setQuery]     = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [caseDetail, setCaseDetail] = useState<any>(null)

  const handleSearch = async () => {
    setLoading(true)
    const data = await getCauseList(court, date, bench)
    const filtered = query
      ? { ...data, items: data.items.filter(i =>
          i.case_no.toLowerCase().includes(query.toLowerCase()) ||
          i.cnr.toLowerCase().includes(query.toLowerCase()) ||
          i.petitioner.toLowerCase().includes(query.toLowerCase()) ||
          i.respondent.toLowerCase().includes(query.toLowerCase())
        )}
      : data
    setResults(filtered)
    setLoading(false)
  }

  const handleViewCase = async (cnr: string) => {
    const detail = await searchCaseByCNR(cnr)
    setCaseDetail(detail)
  }

  return (
    <div>
      <PageHeader title="Cause List Search" sub="Powered by eCourtsIndia API" />

      {/* Search panel */}
      <Card className="mb-4">
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <FormGroup label="Court">
              <Select value={court} onChange={e => setCourt(e.target.value)}>
                {COURTS.slice(0,10).map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Date">
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </FormGroup>
            <FormGroup label="Bench / Division">
              <Select value={bench} onChange={e => setBench(e.target.value)}>
                <option value="">All Benches</option>
                <option value="Division Bench">Division Bench</option>
                <option value="Single Judge">Single Judge</option>
                <option value="Full Bench">Full Bench</option>
              </Select>
            </FormGroup>
          </div>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by CNR / case number / party name..."
              className="flex-1"
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="primary" onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : '⌕ Search'}
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            ⓘ Using mock data. Replace ECOURTS_API_KEY in .env.local to enable live data.
          </p>
        </CardBody>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{results.court}</p>
              <p className="text-xs text-gray-500">{formatDate(results.date)} · {results.bench || 'All Benches'} · {results.items.length} items</p>
            </div>
            <Badge variant="info">{results.items.length} cases</Badge>
          </div>
          <div className="divide-y divide-gray-100">
            {results.items.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">No cases found for this query</p>
            ) : results.items.map((item: any) => (
              <div key={item.cnr} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="neutral">Item {item.item_no}</Badge>
                      <span className="text-xs font-semibold text-gray-900">{item.case_no}</span>
                      <span className="text-[10px] text-gray-400">{item.cnr}</span>
                    </div>
                    <p className="text-xs text-gray-800">
                      <span className="font-medium">{item.petitioner}</span>
                      <span className="text-gray-400 mx-1">v.</span>
                      <span>{item.respondent}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-gray-500">Advocate: {item.advocate}</span>
                      <Badge variant={item.purpose === 'Orders' ? 'gold' : item.purpose === 'Arguments' ? 'info' : 'neutral'}>
                        {item.purpose}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" onClick={() => handleViewCase(item.cnr)}>Details</Button>
                    <Button size="sm" variant="secondary">Order ↓</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Case Detail Panel */}
      {caseDetail && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setCaseDetail(null)}>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between bg-navy-600">
              <div>
                <p className="text-white font-semibold text-sm">{caseDetail.case_no}</p>
                <p className="text-white/60 text-xs">{caseDetail.cnr}</p>
              </div>
              <button onClick={() => setCaseDetail(null)} className="text-white/70 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Case Title</p>
                <p className="text-sm font-semibold text-gray-900">{caseDetail.petitioner} v. {caseDetail.respondent}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Court', value: caseDetail.court },
                  { label: 'Case Type', value: caseDetail.case_type },
                  { label: 'Filed On', value: formatDate(caseDetail.filing_date) },
                  { label: 'Judge', value: caseDetail.judge },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-500">{label}</p>
                    <p className="text-xs text-gray-900 font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Next Hearing</p>
                <HearingChip date={formatDate(caseDetail.next_hearing)} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Orders</p>
                {caseDetail.orders?.length === 0 ? (
                  <p className="text-xs text-gray-400">No orders available</p>
                ) : caseDetail.orders?.map((o: any) => (
                  <div key={o.order_no} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{o.order_no}</p>
                      <p className="text-[10px] text-gray-500">{formatDate(o.date)}</p>
                    </div>
                    <a href={o.download_url} className="text-xs text-navy-600 hover:underline">Download ↓</a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
