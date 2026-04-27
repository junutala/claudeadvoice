export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientDetailClient from './ClientDetailClient'

type PageProps = { params: Promise<{ id: string }> }

async function fetchClientData(tenantId: string, clientId: string) {
  const supabase = await createServerClient()

  const { data: client } = await supabase
    .from('clients').select('*')
    .eq('id', clientId).eq('tenant_id', tenantId).single()

  const { data: cases } = await supabase
    .from('cases').select('*')
    .eq('client_id', clientId).order('created_at', { ascending: false })

  const { data: invoices } = await supabase
    .from('invoices').select('*, items:invoice_items(*), case:cases(title, case_number)')
    .eq('client_id', clientId).eq('tenant_id', tenantId)
    .order('invoice_date', { ascending: false })

  const { data: receipts } = await supabase
    .from('receipts').select('*, allocations:receipt_allocations(*, invoice:invoices(invoice_number))')
    .eq('client_id', clientId).eq('tenant_id', tenantId)
    .order('receipt_date', { ascending: false })

  const { data: expenses } = await supabase
    .from('expenses').select('*, case:cases(case_number), invoice:invoices(invoice_number)')
    .eq('client_id', clientId).eq('tenant_id', tenantId)
    .order('expense_date', { ascending: false })

  const caseIds: string[] = (cases ?? []).map((c: { id: string }) => c.id)
  const today = new Date().toISOString().split('T')[0]

  const { data: hearings } = caseIds.length > 0
    ? await supabase
        .from('hearings').select('*, case:cases(title, case_number, court)')
        .eq('tenant_id', tenantId)
        .in('case_id', caseIds)
        .gte('hearing_date', today)
        .order('hearing_date', { ascending: true })
    : { data: [] as Record<string, unknown>[] }

  return { client, cases: cases ?? [], invoices: invoices ?? [], receipts: receipts ?? [], expenses: expenses ?? [], hearings: hearings ?? [] }
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', session!.user.id).single()

  const tenantId: string = profile?.tenant_id ?? ''
  const data = await fetchClientData(tenantId, id)

  if (!data.client) notFound()

  return (
    <ClientDetailClient
      client={data.client}
      cases={data.cases}
      invoices={data.invoices}
      receipts={data.receipts}
      expenses={data.expenses}
      hearings={data.hearings}
      tenantId={tenantId}
    />
  )
}
