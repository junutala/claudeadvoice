import { NextRequest, NextResponse } from 'next/server'
import { searchCaseByCNR, searchCaseByParty, getCauseList } from '@/lib/ecourts'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    switch (action) {
      case 'cnr': {
        const cnr = searchParams.get('cnr') || ''
        const data = await searchCaseByCNR(cnr)
        return NextResponse.json(data || null)
      }
      case 'party': {
        const name = searchParams.get('name') || ''
        const data = await searchCaseByParty(name)
        return NextResponse.json(data)
      }
      case 'causelist': {
        const court = searchParams.get('court') || 'Madras High Court'
        const date  = searchParams.get('date')  || new Date().toISOString().split('T')[0]
        const bench = searchParams.get('bench') || ''
        const data  = await getCauseList(court, date, bench)
        return NextResponse.json(data)
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
