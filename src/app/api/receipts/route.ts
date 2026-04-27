import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const unallocated = searchParams.get('unallocated')
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single()

  let query = supabase.from('receipts')
    .select('*, client:clients(name, id), allocations:receipt_allocations(*, invoice:invoices(invoice_number))')
    .eq('tenant_id', profile?.tenant_id)
    .order('receipt_date', { ascending: false })

  if (unallocated === 'true') query = query.gt('unallocated_amount', 0)

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

  const { data, error } = await supabase.from('receipts').insert({
    ...body,
    tenant_id: profile?.tenant_id,
    created_by: profile?.id,
    receipt_number: '',
    allocated_amount: 0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
