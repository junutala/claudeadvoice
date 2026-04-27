// v5 - sequential fetches, no Promise.all
export const dynamic = 'force-dynamic'
import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClientDetailClient from './ClientDetailClient'

async function getClientPageData(tenantId: string, clientId: string) {
  const db = await createServerClient()

  const { data: client } = await db
    .from('clients').select('*')
    .eq('id', clientId).eq('tenant_id', tenantId).single()

  const { data: caseList } = await db
    .from('cases').select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  const { data: invoiceList } = await db
    .from('invoices')
    .select('*, items:invoice_items(*), case:cases(title, case_number)')
    .eq('client_id', clientId).eq('tenant_id', tenantId)
    .order('invoice_date', { ascending: false })

  const { data: receiptList } = await db
    .from('receipts')
    .select('*, allocations:receipt_allocations(*, invoice:invoices(invoice_number))')
    .eq('client_id', clientId).eq('tenant_id', tenantId)
    .order('receipt_date', { ascending: false })

  const { data: expenseList } = await db
    .from('expenses')
    .select('*, case:cases(case_number), invoice:invoices(invoice_number)')
    .eq('client_id', clientId).eq('tenant_id', tenantId)
    .order('expense_date', { ascending: false })

  const ids: string[] = (caseList ?? []).map((c: { id: string }) => c.id)
  const today = new Date().toISOString().split('T')[0]

  const { data: hearingList } = ids.length > 0
    ? await db
        .from('hearings')
        .select('*, case:cases(title, case_number, court)')
        .eq('tenant_id', tenantId)
        .in('case_id', ids)
        .gte('hearing_date', today)
        .order('hearing_date', { ascending: true })
    : { data: [] as Record<string, unknown>[] }

  return {
    client,
    cases:    caseList    ?? [],
    invoices: invoiceList ?? [],
    receipts: receiptList ?? [],
    expenses: expenseList ?? [],
    hearings: hearingList ?? [],
  }
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id')
    .eq('id', session!.user.id).single()

  const tenantId: string = profile?.tenant_id ?? ''
  const pageData = await getClientPageData(tenantId, id)

  if (!pageData.client) notFound()

  return (
    <ClientDetailClient
      client={pageData.client}
      cases={pageData.cases}
      invoices={pageData.invoices}
      receipts={pageData.receipts}
      expenses={pageData.expenses}
      hearings={pageData.hearings}
      tenantId={tenantId}
    />
  )
}
