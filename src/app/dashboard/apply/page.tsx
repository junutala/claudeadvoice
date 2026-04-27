import { createServerClient } from '@/lib/supabase/server'
import ApplyClient from './ApplyClient'

export default async function ApplyPage() {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session!.user.id).single()

  const [{ data: receipts }, { data: invoices }] = await Promise.all([
    supabase.from('receipts').select('*, client:clients(id, name)')
      .eq('tenant_id', profile?.tenant_id)
      .gt('unallocated_amount', 0)
      .order('receipt_date', { ascending: false }),
    supabase.from('invoices').select('*, client:clients(id, name)')
      .eq('tenant_id', profile?.tenant_id)
      .in('status', ['pending', 'partial', 'overdue'])
      .order('due_date', { ascending: true }),
  ])

  return <ApplyClient receipts={receipts || []} invoices={invoices || []} tenantId={profile?.tenant_id} />
}
