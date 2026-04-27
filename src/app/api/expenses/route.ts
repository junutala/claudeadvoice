import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId  = searchParams.get('client_id')
  const unbilled  = searchParams.get('unbilled')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single()

  let query = supabase.from('expenses')
    .select('*, client:clients(name), case:cases(title, case_number), invoice:invoices(invoice_number)')
    .eq('tenant_id', profile?.tenant_id)
    .order('expense_date', { ascending: false })

  if (clientId)      query = query.eq('client_id', clientId)
  if (unbilled === 'true') query = query.is('invoice_id', null).eq('is_billable', true)

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

  const { data, error } = await supabase.from('expenses').insert({
    ...body,
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

  const { id, ...updates } = await req.json()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single()

  const { data, error } = await supabase.from('expenses')
    .update(updates).eq('id', id).eq('tenant_id', profile?.tenant_id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
