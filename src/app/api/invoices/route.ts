import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single()

  let query = supabase.from('invoices')
    .select('*, client:clients(name,id), case:cases(title,case_number), items:invoice_items(*)')
    .eq('tenant_id', profile?.tenant_id)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { items, ...invoiceData } = body
  const { data: profile } = await supabase.from('profiles').select('tenant_id,id').eq('id', session.user.id).single()

  const subtotal   = (items || []).reduce((s: number, i: any) => s + i.quantity * i.rate, 0)
  const gstAmount  = subtotal * (invoiceData.gst_rate || 0) / 100
  const totalAmount = subtotal + gstAmount

  const { data: inv, error } = await supabase.from('invoices').insert({
    ...invoiceData,
    tenant_id: profile?.tenant_id,
    created_by: profile?.id,
    invoice_number: '',
    subtotal,
    gst_amount: gstAmount,
    total_amount: totalAmount,
    paid_amount: 0,
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (items?.length > 0) {
    await supabase.from('invoice_items').insert(
      items.map((item: any, i: number) => ({
        invoice_id: inv.id, tenant_id: profile?.tenant_id,
        description: item.description, quantity: item.quantity, rate: item.rate, sort_order: i,
      }))
    )
  }

  return NextResponse.json(inv, { status: 201 })
}
