import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { searchCaseByCNR } from '@/lib/ecourts'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single()

  let query = supabase.from('cases')
    .select('*, client:clients(name, id), hearings(hearing_date, purpose, outcome)')
    .eq('tenant_id', profile?.tenant_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data: profile } = await supabase.from('profiles').select('tenant_id,id').eq('id', session.user.id).single()

  // If CNR provided, try to fetch next hearing from eCourts
  let next_hearing = body.next_hearing
  if (body.cnr_number && !next_hearing) {
    try {
      const courtCase = await searchCaseByCNR(body.cnr_number)
      if (courtCase?.next_hearing) next_hearing = courtCase.next_hearing
    } catch (_) {}
  }

  const { data, error } = await supabase.from('cases').insert({
    ...body, next_hearing,
    tenant_id: profile?.tenant_id,
    created_by: profile?.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, sync_ecourts, ...updates } = await req.json()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single()

  // Optionally sync from eCourts
  if (sync_ecourts) {
    const { data: existing } = await supabase.from('cases').select('cnr_number').eq('id', id).single()
    if (existing?.cnr_number) {
      try {
        const courtCase = await searchCaseByCNR(existing.cnr_number)
        if (courtCase?.next_hearing) updates.next_hearing = courtCase.next_hearing
      } catch (_) {}
    }
  }

  const { data, error } = await supabase.from('cases')
    .update(updates).eq('id', id).eq('tenant_id', profile?.tenant_id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
