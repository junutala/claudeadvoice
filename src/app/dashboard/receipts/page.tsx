import { createServerClient } from '@/lib/supabase/server'
import ReceiptsClient from './ReceiptsClient'

export default async function ReceiptsPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', session!.user.id).single()

  const [{ data: receipts }, { data: clients }] = await Promise.all([
    supabase.from('receipts')
      .select('*, client:clients(name, id), allocations:receipt_allocations(*, invoice:invoices(invoice_number))')
      .eq('tenant_id', profile?.tenant_id)
      .order('receipt_date', { ascending: false }),
    supabase.from('clients').select('id, name').eq('tenant_id', profile?.tenant_id).eq('is_active', true).order('name'),
  ])

  return <ReceiptsClient receipts={receipts || []} clients={clients || []} tenantId={profile?.tenant_id} />
}
