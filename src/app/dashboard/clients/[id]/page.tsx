export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientDetailClient from './ClientDetailClient'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session!.user.id).single()

  const [{ data: client }, { data: cases }, { data: invoices }, { data: receipts }, { data: expenses }] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', id).eq('tenant_id', profile?.tenant_id).single(),
      supabase.from('cases').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, items:invoice_items(*), case:cases(title, case_number)')
        .eq('client_id', id).eq('tenant_id', profile?.tenant_id).order('invoice_date', { ascending: false }),
      supabase.from('receipts').select('*, allocations:receipt_allocations(*, invoice:invoices(invoice_number))')
        .eq('client_id', id).eq('tenant_id', profile?.tenant_id).order('receipt_date', { ascending: false }),
      supabase.from('expenses').select('*, case:cases(case_number), invoice:invoices(invoice_number)')
        .eq('client_id', id).eq('tenant_id', profile?.tenant_id).order('expense_date', { ascending: false }),
    ])

  const caseIds: string[] = (cases ?? []).map((c: { id: string }) => c.id)

  const { data: hearings } = caseIds.length > 0
    ? await supabase
        .from('hearings')
        .select('*, case:cases(title, case_number, court)')
        .eq('tenant_id', profile?.tenant_id)
        .in('case_id', caseIds)
        .gte('hearing_date', new Date().toISOString().split('T')[0])
        .order('hearing_date', { ascending: true })
    : { data: [] as any[] }

  if (!client) notFound()

  return (
    <ClientDetailClient
      client={client}
      cases={cases ?? []}
      invoices={invoices ?? []}
      receipts={receipts ?? []}
      expenses={expenses ?? []}
      hearings={hearings ?? []}
      tenantId={profile?.tenant_id}
    />
  )
}
