import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/receipts/apply — apply receipt to invoice
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receipt_id, invoice_id, amount, notes } = await req.json()
  if (!receipt_id || !invoice_id || !amount) {
    return NextResponse.json({ error: 'receipt_id, invoice_id and amount are required' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('tenant_id,id').eq('id', session.user.id).single()

  // Validate receipt belongs to tenant and has enough unallocated
  const { data: receipt } = await supabase.from('receipts')
    .select('unallocated_amount, client_id').eq('id', receipt_id).eq('tenant_id', profile?.tenant_id).single()

  if (!receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  if (receipt.unallocated_amount < amount) {
    return NextResponse.json({ error: `Only ${receipt.unallocated_amount} available to allocate` }, { status: 400 })
  }

  // Validate invoice belongs to same tenant and same client
  const { data: invoice } = await supabase.from('invoices')
    .select('balance_amount, client_id').eq('id', invoice_id).eq('tenant_id', profile?.tenant_id).single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.client_id !== receipt.client_id) {
    return NextResponse.json({ error: 'Receipt and invoice must belong to the same client' }, { status: 400 })
  }
  if (invoice.balance_amount < amount) {
    return NextResponse.json({ error: `Invoice balance is only ${invoice.balance_amount}` }, { status: 400 })
  }

  const { data, error } = await supabase.from('receipt_allocations').insert({
    tenant_id: profile?.tenant_id,
    receipt_id, invoice_id, amount,
    allocated_by: profile?.id,
    notes,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  // Trigger in DB handles updating invoice paid_amount and receipt allocated_amount
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session.user.id).single()
  const { error } = await supabase.from('receipt_allocations').delete().eq('id', id).eq('tenant_id', profile?.tenant_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
