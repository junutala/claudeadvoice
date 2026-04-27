export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InvoiceDetailClient from './InvoiceDetailClient'

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session!.user.id).single()

  const [{ data: invoice }, { data: tenant }] = await Promise.all([
    supabase.from('invoices')
      .select('*, client:clients(*), case:cases(*), items:invoice_items(*), allocations:receipt_allocations(*, receipt:receipts(receipt_number, receipt_date, payment_mode))')
      .eq('id', id)
      .eq('tenant_id', profile?.tenant_id)
      .single(),
    supabase.from('tenants').select('*').eq('id', profile?.tenant_id).single(),
  ])

  if (!invoice) notFound()
  return <InvoiceDetailClient invoice={invoice} tenant={tenant} />
}
